import {
  declareDense,
  DenseMovements,
  isMovementGroup,
  isPoint,
  Movement,
  Point,
  Transition,
} from "./movements";
import { LightMove, MovementMove, MovementMoveReference } from "./hardware";

import { getTransitionMaterial, Settings } from "./settings";

/**
 * Add transition movements between each move if the start and the end are at different places
 */
export function sparseToDense(
  sparseBag: Movement[],
  settings: Settings
): DenseMovements {
  const denseMovements: DenseMovements = declareDense([]);

  const transitionMaterial = getTransitionMaterial(settings);

  // Start
  let previousMovement: Movement = new Point(
    settings.optimisation.startingPoint,
    settings.optimisation.waitAtStartDuration,
    transitionMaterial
  );

  // Middle
  for (const movement of sparseBag) {
    // Set the max speed of the movement so velocities are scaled
    movement.setMaxSpeed(settings.optimisation.maxSpeed);

    // Build our transition movement from the old movement to the new
    const transition = new Transition(
      previousMovement,
      movement,
      transitionMaterial
    );

    // Add the transition to the dense bag
    denseMovements.push(transition);

    // Add the movement to the dense bag
    denseMovements.push(movement);

    // Update the last movement
    previousMovement = movement;
    continue;
  }

  // End
  let lastMovement: Movement = new Point(
    settings.optimisation.endingPoint,
    1, // wait for 1ms at the end
    transitionMaterial
  );

  // Transition to the end
  const transitionToEnd = new Transition(
    previousMovement,
    lastMovement,
    transitionMaterial
  );

  // Add the transition to the dense bag
  denseMovements.push(transitionToEnd);

  // Add the movement to the dense bag
  denseMovements.push(lastMovement);

  return denseMovements;
}

/**
 * Flatten any `OrderedMovements` groups into simple movements.
 */
export function flattenDense(denseBag: DenseMovements): DenseMovements {
  let denseFlatList: DenseMovements = declareDense([]);

  for (const movement of denseBag) {
    denseFlatList.push(...movement.flatten());
  }

  return denseBag;
}

export function getTotalDuration(denseMoves: DenseMovements) {
  // For now, use the total duration as the cost function
  let cost = 0;

  for (let index = 0; index < denseMoves.length; index++) {
    const movement = denseMoves[index];
    cost += movement.getDuration();
  }

  return cost;
}

/**
 * Take a sparse set of movements, join them, flatten them, calculate the total duration
 */
export function sparseToCost(
  sparseBag: Movement[],
  settings: Settings
): number {
  const dense = sparseToDense(sparseBag, settings);
  const flattened = flattenDense(dense);

  return getTotalDuration(flattened);
}

function swap(array: any[], a: number, b: number) {
  const temp = array[a];
  array[a] = array[b];
  array[b] = temp;
}

/**
 * Swaps two line segments if the cost is better, returns if the swap was better
 */
function swapIsBetter(
  movements: Movement[],
  costRef: { cost: number },
  settings: Settings,
  i: number,
  j: number
): boolean {
  // Do the swap
  swap(movements, i, j);

  // Calculate the new cost
  const tourCostWithSwap = sparseToCost(movements, settings);

  // console.log(
  //   `trying to swap ${i} and ${j}, cost flipped is ${tourCostWithSwap}, without is ${costRef.cost}.`
  // );

  // if it's worse or equal, swap it back
  if (tourCostWithSwap >= costRef.cost) {
    swap(movements, i, j);
    return false;
  }

  // Otherwise it's better, update the cost
  costRef.cost = tourCostWithSwap;
  return true;
}

/**
 * Flips a singular movement if the cost is better, returns if it was better.
 */
function flipIsBetter(
  movements: Movement[],
  costRef: { cost: number },
  settings: Settings,
  i: number
): boolean {
  // If the movement is a Point, we can't flip, bail early
  if (isPoint(movements[i])) {
    return false;
  }

  // Do the flip
  movements[i].flip();

  // Calculate the new cost
  const tourCostWithFlip = sparseToCost(movements, settings);

  // console.log(
  //   `trying to flip ${i}, cost flipped is ${tourCostWithFlip}, without is ${costRef.cost}.`
  // );

  // if it's worse or equal, swap it back
  if (tourCostWithFlip >= costRef.cost) {
    movements[i].flip();
    return false;
  }

  // Otherwise it's better, update the cost
  costRef.cost = tourCostWithFlip;
  return true;
}

export interface OrderingCache {
  [id: string]: number;
}

export interface Progress {
  duration: number;
  text: string;
  // method: string;
  toolpath: Toolpath;
  orderingCache: OrderingCache;
}

export type Continue = boolean;

/**
 * Reorders and flips the members of a sparse bag of movements, optimising for the fastest tour.
 */
export function optimise(
  sparseBag: Movement[],
  settings: Settings,
  updateProgress: (progress: Progress) => Continue,
  orderingCache: OrderingCache = {}
) {
  const sparseLength = sparseBag.length;

  // Compare all costs to random order
  let costRef = { cost: sparseToCost(sparseBag, settings) };

  const startingCost = costRef.cost;

  // NN search

  const nnStart = Date.now();

  // Run a nearest neighbour search and see how optimal it is
  const toOrder: Movement[] = sparseBag.slice(1);
  let lastMovement = sparseBag[0];
  const nnOrdered: Movement[] = [lastMovement];

  while (toOrder.length > 0) {
    let closest: Movement = lastMovement;
    let closestDistance = Infinity;
    let closestIndex = 0;

    for (let index = 0; index < toOrder.length; index++) {
      const movement = toOrder[index];

      const d = movement.getEnd().distanceToSquared(lastMovement.getStart());

      if (d < closestDistance) {
        closestDistance = d;
        closest = movement;
        closestIndex = index;
      }
    }

    // We've found the next closest, pop it off
    toOrder.splice(closestIndex, 1);

    // And add it to the nnOrdered array
    nnOrdered.push(closest);

    // Update the lastMovement
    lastMovement = closest;
  }

  const nnEnd = Date.now();

  const nnCost = sparseToCost(nnOrdered, settings);

  const nnEndCost = Date.now();

  console.log(
    `baseline cost: ${costRef.cost}, nearest neighbour: ${nnCost}, took ${
      nnEnd - nnStart
    } (plus ${nnEndCost - nnEnd} to calculate the final duration)`
  );

  costRef.cost = nnCost;

  // NN end

  // Sort the bag by the ordering cache
  sparseBag.sort((a, b) => {
    const aOrder = orderingCache[a.id] ?? 0;
    const bOrder = orderingCache[b.id] ?? 0;

    // Sort in ascending order
    return aOrder - bOrder;
  });

  // randomise starting order
  // sparseBag.sort((movement) => Math.random() - 0.5);

  let improved = true;

  let iteration = 0;

  const tspStart = Date.now();

  const ordered = nnOrdered.slice();

  const nextOrderingCache: OrderingCache = {};

  const populateOrderingCache = () => {
    // Store the final order for passing to the next frame
    for (let index = 0; index < ordered.length; index++) {
      const movement = ordered[index];
      nextOrderingCache[movement.id] = index;
    }

    return nextOrderingCache;
  };

  while (improved) {
    improved = false;
    iteration++;

    console.log(
      `iteration: ${iteration},`,
      `current cost: ${Math.round(costRef.cost * 100) / 100}ms, ${
        Math.round((startingCost - costRef.cost) * 100) / 100
      }ms saved, ${
        Math.round((costRef.cost / startingCost) * 10000) / 100
      }% of original, ${
        Math.round((costRef.cost / nnCost) * 10000) / 100
      }% of NN search, `
    );

    const shouldContinue = updateProgress({
      duration: iteration,
      text: `Optimised to ${Math.round(costRef.cost * 100) / 100}ms, ${
        Math.round((costRef.cost / startingCost) * 10000) / 100
      }% of original`,
      // method: iteration === 1 ? "nearest-neighbour" : "2-opt",
      toolpath: toolpath(flattenDense(sparseToDense(ordered, settings))),
      orderingCache: populateOrderingCache(),
    });

    const endProgress = Date.now();

    if (!shouldContinue) break;

    iteration: for (let i = 0; i < sparseLength - 1; i++) {
      for (let j = i + 1; j < sparseLength; j++) {
        // Try flipping each member first
        if (flipIsBetter(ordered, costRef, settings, i)) {
          improved = true;
          continue iteration;
        }
        if (flipIsBetter(ordered, costRef, settings, j)) {
          improved = true;
          continue iteration;
        }

        // Try swapping the two movements
        if (swapIsBetter(ordered, costRef, settings, i, j)) {
          improved = true;
          continue iteration;
        }

        // Try flipping each member again
        if (flipIsBetter(ordered, costRef, settings, i)) {
          improved = true;
          continue iteration;
        }
        if (flipIsBetter(ordered, costRef, settings, j)) {
          improved = true;
          continue iteration;
        }
      }
    }
  }

  const tspEnd = Date.now();

  console.log(
    `baseline cost: ${startingCost}, nearest neighbour: ${nnCost}, TSP solver: ${
      costRef.cost
    }, tsp took ${tspEnd - tspStart}`
  );

  return {
    orderedMovements: ordered,
    cost: costRef.cost,
    iterations: iteration,
    orderingCache: populateOrderingCache(),
  };
}

export interface Toolpath {
  movementMoves: MovementMove[];
  lightMoves: LightMove[];
}

export function toolpath(denseMovements: DenseMovements): Toolpath {
  const movementMoves: MovementMove[] = [];
  const lightMoves: LightMove[] = [];

  let id = 0;
  // each movement should have a generateToolpath method
  for (const movement of denseMovements) {
    // Increment the ID
    id++;

    // Build the hardware moves
    movementMoves.push(...movement.generateToolpath(id));

    // Build the light moves
    lightMoves.push(...movement.generateLightpath(id));
  }

  return {
    movementMoves,
    lightMoves,
  };
}
