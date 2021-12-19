import { optimiseFrameBag } from "../main";
import { Observable, Subject } from "threads/observable";
import { expose } from "threads/worker";

import { importJson, MovementJSON } from "../import";
import { Movement } from "../movements";
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
} from "../passes";
import { Settings } from "../settings";

let progressUpdates = new Subject<Progress>();

let shouldContinue = true;

// Export the type so we can strictly type the other side
export const OptimisationWorker = {
  finishEarly() {
    shouldContinue = false;
  },
  reset() {
    shouldContinue = true;
    progressUpdates.complete();
    progressUpdates = new Subject();
  },
  progressUpdates() {
    return Observable.from(progressUpdates);
  },

  optimise(
    sparseBagToImport: MovementJSON[],
    settings: Settings,
    partialUpdate: boolean,
    orderingCache: OrderingCache = {}
  ) {
    const updateProgress = async (progress: Progress): Promise<Continue> => {
      progressUpdates.next(progress);

      // Partial updates stop after the first iteration
      if (partialUpdate) return false;

      // need to wait for a microtick for other calls to come in
      await new Promise((resolve, reject) => setTimeout(resolve));

      return shouldContinue;
    };

    return optimiseFrameBag(
      sparseBagToImport,
      settings,
      updateProgress,
      orderingCache
    );
  },
};

expose(OptimisationWorker);
