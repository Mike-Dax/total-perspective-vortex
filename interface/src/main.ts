//

import { importJson, MovementJSON } from "./import";
import { Movement } from "./movements";
import {
  Continue,
  flattenDense,
  getTotalDuration,
  optimise,
  OrderingCache,
  Progress,
  sparseToDense,
  Toolpath,
  toolpath,
} from "./passes";
import { Settings } from "./settings";
import { spawn, Thread, Pool, Worker, ModuleThread } from "threads";
import type { OptimisationWorker } from "./workers/worker";

/**
 * The UI imports a folder, creates a settings object,
 *
 * importFolder(folderPath: string)
 *
 * Which produces a map of frames.
 *
 * The UI creates a settings object, after each change, the worker must be reset.
 *
 * Send the first framebag for optimisation, wait for reply,
 *
 */

// This will be called across an IPC bridge, all arguments must be serialisable
export async function optimiseFrameBag(
  sparseBagToImport: MovementJSON[],
  settings: Settings,
  updateProgress: (progress: Progress) => Promise<Continue>,
  orderingCache: OrderingCache = {}
) {
  const movements: Movement[] = [];

  // Process the raw objects into movements
  for (const json of sparseBagToImport) {
    const imported = importJson(json);
    for (const movement of imported.toMovements(settings)) {
      movements.push(movement);
    }
  }

  // Run the optimiser
  const {
    orderedMovements,
    cost,
    orderingCache: nextOrderingCache,
    iterations,
  } = await optimise(movements, settings, updateProgress, orderingCache);

  const dense = sparseToDense(orderedMovements, settings);
  const flattened = flattenDense(dense);
  const duration = getTotalDuration(flattened);

  const tp = toolpath(flattened);

  return {
    toolpath: tp,
    duration,
    orderingCache: nextOrderingCache,
  };
}

enum FRAME_STATE {
  OPTIMISING_PARTIALLY = 0,
  OPTIMISING_FULLY = 1,
  UNOPTIMISED = 2,
  OPTIMISED_PARTIALLY = 3,
  OPTIMISED_FULLY = 4,
  ERRORED = 5,
}

export interface FrameProgressUpdate {
  frameNumber: number;
  text: string;
  duration: number;
  completed: boolean;
  minimaFound: boolean;
}

/**
 * A persistent orchestrator of frame optimisation.
 */
export class ToolpathGenerator {
  private viewportFrame: number = 100;

  /**
   * The list of frames that aren't finished
   */
  private unfinishedFrames: number[] = [];
  private currentlyOptimising: Set<number> = new Set();
  private frameState: Map<number, FRAME_STATE> = new Map();
  private frameCache: Map<number, OrderingCache> = new Map();
  private toolpaths: Map<number, Toolpath> = new Map();

  private movementJSON: Map<number, MovementJSON[]> = new Map();

  private pool: Pool<ModuleThread<typeof OptimisationWorker>>;

  private onUpdate: (progress: FrameProgressUpdate) => void = () => {};

  constructor(private settings: Settings, private numThreads = 4) {
    this.reset = this.reset.bind(this);
    this.ingest = this.ingest.bind(this);
    this.currentWorkQueue = this.currentWorkQueue.bind(this);
    this.scheduleWork = this.scheduleWork.bind(this);
    this.setFrameState = this.setFrameState.bind(this);
    this.scheduleFrame = this.scheduleFrame.bind(this);
    this.getClosestFrameCache = this.getClosestFrameCache.bind(this);
    this.setViewedFrame = this.setViewedFrame.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.teardown = this.teardown.bind(this);

    this.pool = Pool(
      () => spawn(new Worker("./workers/worker")),
      numThreads /* Must be at least 2 */
    );
  }

  reset() {
    this.unfinishedFrames = [];
    this.frameState.clear();
    this.frameCache.clear();
    this.movementJSON.clear();
  }

  public ingest(
    movementJSONByFrame: {
      [frame: number]: MovementJSON[];
    },
    settings: Settings,
    updateProgress: (progress: FrameProgressUpdate) => void
  ) {
    this.reset();

    for (const frameNumber of Object.keys(movementJSONByFrame)) {
      const num = Number(frameNumber);
      // Set all frames to unoptimised
      this.frameState.set(num, FRAME_STATE.UNOPTIMISED);

      // Store the movement JSON
      this.movementJSON.set(num, movementJSONByFrame[num]);

      // Add the frame to the unfinished frames list
      this.unfinishedFrames.push(num);
    }

    // Update the settings
    this.settings = settings;

    // And the onProgress event notifier
    this.onUpdate = updateProgress;

    // Immediately schedule work
    this.scheduleWork();
  }

  /**
   * Sort the unfinished frames so a partial
   */
  private sortWorkPriority() {
    this.unfinishedFrames.sort((a, b) => {
      // The viewport frames have highest priority
      if (a === this.viewportFrame) return -1;
      if (b === this.viewportFrame) return 1;

      const frameAStatus = this.frameState.get(a) ?? FRAME_STATE.ERRORED;
      const frameBStatus = this.frameState.get(b) ?? FRAME_STATE.ERRORED;

      // If frames have different states
      if (frameAStatus !== frameBStatus) {
        // Give priority to lower optimisation level frames
        // UNOPTIMISED before PARTIALLY before FULLY
        return frameAStatus - frameBStatus;
      }

      // Otherwise do it in frame order
      return a - b;
    });
  }

  private currentWorkQueue() {
    this.sortWorkPriority();

    return this.unfinishedFrames.slice(0, this.numThreads);
  }

  /**
   * Diff the current pool state
   */
  scheduleWork() {
    console.log(
      `scheduling work, queue is [${this.currentWorkQueue().join(", ")}]`
    );

    // Schedule the current work queue
    for (const frameNumber of this.currentWorkQueue()) {
      switch (this.frameState.get(frameNumber)) {
        case FRAME_STATE.UNOPTIMISED:
          console.log(`frame ${frameNumber} is unoptimised`);
          // Start a partial optimisation pass
          this.scheduleFrame(frameNumber, true);
          continue;
        case FRAME_STATE.OPTIMISING_PARTIALLY:
          // Already optimising, don't allow for concurrent optimisation passes on the same frame
          continue;
        case FRAME_STATE.OPTIMISING_FULLY:
          // Already optimising, don't allow for concurrent optimisation passes on the same frame
          continue;
        case FRAME_STATE.OPTIMISED_PARTIALLY:
          // Start a full optimisation pass
          console.log(`frame ${frameNumber} is partially optimised`);
          this.scheduleFrame(frameNumber, false);
          continue;
        case FRAME_STATE.OPTIMISED_FULLY:
          // Already done
          continue;

        default:
          continue;
      }
    }
  }

  setFrameState(frameNumber: number, state: FRAME_STATE) {
    this.frameState.set(frameNumber, state);

    if (state === FRAME_STATE.OPTIMISED_FULLY) {
      // Remove the frame from the unfinished list if it's fully optimised
      this.unfinishedFrames = this.unfinishedFrames.filter(
        (fN) => fN !== frameNumber
      );
    }
  }

  scheduleFrame(frameNumber: number, partialUpdate: boolean) {
    if (partialUpdate) {
      this.setFrameState(frameNumber, FRAME_STATE.OPTIMISING_PARTIALLY);
    } else {
      this.setFrameState(frameNumber, FRAME_STATE.OPTIMISING_FULLY);
    }

    this.pool.queue(async (worker) => {
      let updates = 0;

      const receiveUpdate = async (progress: Progress) => {
        updates++;

        // Update the frame cache
        this.frameCache.set(frameNumber, progress.orderingCache);

        // Update the current toolpath
        this.toolpaths.set(frameNumber, progress.toolpath);

        // Pass the updates up the chain
        this.onUpdate({
          frameNumber: frameNumber,
          text: progress.text,
          duration: progress.duration,
          completed: progress.completed,
          minimaFound: progress.minimaFound,
        });

        // Update our status if this is the last progress update
        if (progress.completed) {
          if (progress.minimaFound) {
            this.setFrameState(frameNumber, FRAME_STATE.OPTIMISED_FULLY);
          } else {
            this.setFrameState(frameNumber, FRAME_STATE.OPTIMISED_PARTIALLY);
          }

          // Schedule the next batch of work
          this.scheduleWork();
          return;
        }

        // If the current work queue doesn't include this frame, stop early
        if (!this.currentWorkQueue().includes(frameNumber)) {
          await worker.finishEarly();
          return;
        }
      };

      // Reset the worker before we start
      await worker.reset();

      const sub = worker.progressUpdates().subscribe(
        receiveUpdate,
        (error) => {
          console.error(`Error in worker`, error);
        },
        () => {
          console.log(`worker completed`);
        }
      );

      // Start the optimisation pass
      const { duration } = await worker.optimise(
        this.movementJSON.get(frameNumber)!,
        this.settings,
        partialUpdate, // if this is a partial update, stop after the first iteration
        this.getClosestFrameCache(frameNumber)
      );

      sub.unsubscribe();

      // Do a check to make sure it's not in an optimising state when the worker is gone
      switch (this.frameState.get(frameNumber)!) {
        case FRAME_STATE.OPTIMISING_PARTIALLY:
          this.setFrameState(frameNumber, FRAME_STATE.OPTIMISING_PARTIALLY);
          return;
        case FRAME_STATE.OPTIMISING_FULLY:
          this.setFrameState(frameNumber, FRAME_STATE.OPTIMISED_PARTIALLY);
          return;
        default:
          // Everything went fine
          break;
      }
    });
  }

  /**
   * Gets the closest frame cache to a given frame number
   */
  private getClosestFrameCache(frameNumber: number) {
    let potentialNumber = frameNumber;

    while (potentialNumber >= 0) {
      if (this.frameCache.has(potentialNumber)) {
        return this.frameCache.get(potentialNumber)!;
      }

      potentialNumber--;
    }

    return undefined;
  }

  public setViewedFrame(frameNumber: number) {
    this.viewportFrame = frameNumber;
  }

  updateSettings(settings: Settings) {}

  teardown() {}
}

// Need to do a run of every frame, only doing the nearest neighbour optimisation then immediately returning.
// Second run of every frame, but full optimisation pass.
// All frames before the priority frame are cancelled.
// The priority frame needs to cancel on the next pass.
// When settings update, reset the whole thing
// The viewed frame also gets priority, potentially cancelling the highest numbered frame if there are no slots.
