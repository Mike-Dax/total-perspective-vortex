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

import { Settings } from "./settings";

/**
 * Add transition movements between each move if the start and the end are at different places
 */
export function sparseToDense(
  sparseBag: Movement[],
  settings: Settings
): DenseMovements {
  const denseMovements: DenseMovements = declareDense([]);

  // Start
  let previousMovement: Movement = new Point(
    settings.optimisation.startingPoint,
    settings.optimisation.waitAtStartDuration,
    settings.transitionMaterial
  );

  // Middle
  for (const movement of sparseBag) {
    // Set the max speed of the movement so velocities are scaled
    movement.setMaxSpeed(settings.optimisation.maxSpeed);

    // Build our transition movement from the old movement to the new
    const transition = new Transition(
      previousMovement,
      movement,
      settings.transitionMaterial
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
    settings.transitionMaterial
  );

  // Transition to the end
  const transitionToEnd = new Transition(
    previousMovement,
    lastMovement,
    settings.transitionMaterial
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

/**
 * Reorders and flips the members of a sparse bag of movements, optimising for the fastest tour.
 *
 * Modifies the array in place.
 */
export function optimise(
  sparseBag: Movement[],
  settings: Settings,
  orderingCache: OrderingCache = {}
) {
  const sparseLength = sparseBag.length;

  // Sort the bag by the ordering cache
  sparseBag.sort((a, b) => {
    const aOrder = orderingCache[a.id] ?? 0;
    const bOrder = orderingCache[b.id] ?? 0;

    // Sort in ascending order
    return aOrder - bOrder;
  });

  let costRef = { cost: sparseToCost(sparseBag, settings) };

  // randomise starting order
  // sparseBag.sort((movement) => Math.random() - 0.5);

  const startingCost = costRef.cost;

  let improved = true;

  let iteration = 0;

  while (improved) {
    improved = false;
    iteration++;

    console.log(
      `iteration: ${iteration},`,
      `current cost: ${Math.round(costRef.cost * 100) / 100}ms, ${
        Math.round((startingCost - costRef.cost) * 100) / 100
      }ms saved, ${
        Math.round((costRef.cost / startingCost) * 10000) / 100
      }% of original`
    );

    iteration: for (let i = 0; i < sparseLength - 1; i++) {
      for (let j = i + 1; j < sparseLength; j++) {
        // Try flipping each member first
        if (flipIsBetter(sparseBag, costRef, settings, i)) {
          improved = true;
          continue iteration;
        }
        if (flipIsBetter(sparseBag, costRef, settings, j)) {
          improved = true;
          continue iteration;
        }

        // Try swapping the two movements
        if (swapIsBetter(sparseBag, costRef, settings, i, j)) {
          improved = true;
          continue iteration;
        }

        // Try flipping each member again
        if (flipIsBetter(sparseBag, costRef, settings, i)) {
          improved = true;
          continue iteration;
        }
        if (flipIsBetter(sparseBag, costRef, settings, j)) {
          improved = true;
          continue iteration;
        }
      }
    }
  }

  const nextOrderingCache: OrderingCache = {};

  // Store the final order for passing to the next frame
  for (let index = 0; index < sparseBag.length; index++) {
    const movement = sparseBag[index];
    nextOrderingCache[movement.id] = index;
  }

  return {
    order: sparseBag,
    cost: costRef.cost,
    orderingCache: nextOrderingCache,
    iterations: iteration,
  };
}

export function toolpath(denseMovements: DenseMovements) {
  const movementMoves: MovementMove[] = [];
  const lightMoves: LightMove[] = [];

  let id = 0;
  // each movement should have a generateToolpath mmethod
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
