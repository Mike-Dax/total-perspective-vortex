import { MaterialJSON } from "src/blender/material";
import { Material, Vector3 } from "three";
import {
  declareDense,
  DenseMovements,
  isMovementGroup,
  isPoint,
  Movement,
  Point,
  Transition,
} from "../blender/movements/movements";

export interface OptimisationSettings {
  waitAtStartDuration: number;

  startingPoint: Vector3;
  endingPoint: Vector3;

  maxSpeed: number; // mm/s
}

/**
 * Add transition movements between each move if the start and the end are at different places
 */
export function sparseToDense(
  sparseBag: Movement[],
  settings: OptimisationSettings
): DenseMovements {
  const denseMovements: DenseMovements = declareDense([]);

  const blankMaterial: MaterialJSON = {
    type: "color",
    color: [0, 0, 0, 0],
  };

  // Start

  let previousMovement: Movement = new Point(
    settings.startingPoint,
    settings.waitAtStartDuration,
    blankMaterial
  );

  // Middle

  for (const movement of sparseBag) {
    // Build our transition movement from the old movement to the new
    const transition = new Transition(
      previousMovement,
      movement,
      blankMaterial
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
    settings.endingPoint,
    settings.waitAtStartDuration,
    blankMaterial
  );

  // Transition to the end
  const transitionToEnd = new Transition(
    previousMovement,
    lastMovement,
    blankMaterial
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
    movement.flatten(denseFlatList.push);
  }

  return denseBag;
}

/**
 * Take a sparse set of movements, join them, flatten them, calculate the total distance, deltaV required, and estimate jerk
 */
export function sparseToCost(
  sparseBag: Movement[],
  settings: OptimisationSettings
): number {
  const dense = sparseToDense(sparseBag, settings);
  const flattened = flattenDense(dense);

  // Iterate through each movement, sampling the movement

  return 0;
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
  settings: OptimisationSettings,
  i: number,
  j: number
): boolean {
  // Do the swap
  swap(movements, i, j);

  // Calculate the new cost
  const tourCostWithSwap = sparseToCost(movements, settings);

  console.log(
    `trying to swap ${i} and ${j}, cost flipped is ${tourCostWithSwap}, without is ${costRef.cost}.`
  );

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
  settings: OptimisationSettings,
  i: number
): boolean {
  // Do the flip
  movements[i].flip();

  // Calculate the new cost
  const tourCostWithFlip = sparseToCost(movements, settings);

  console.log(
    `trying to flip ${i}, cost flipped is ${tourCostWithFlip}, without is ${costRef.cost}.`
  );

  // if it's worse or equal, swap it back
  if (tourCostWithFlip >= costRef.cost) {
    movements[i].flip();
    return false;
  }

  // Otherwise it's better, update the cost
  costRef.cost = tourCostWithFlip;
  return true;
}

export function optimise(
  sparseBag: Movement[],
  settings: OptimisationSettings
): Movement[] {
  const sparseLength = sparseBag.length;

  let costRef = { cost: sparseToCost(sparseBag, settings) };

  let improved = true;

  let iteration = 0;

  while (improved) {
    improved = false;

    iteration: for (let i = 0; i < sparseLength - 1; i++) {
      console.log(iteration++);
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

  return [];
}
