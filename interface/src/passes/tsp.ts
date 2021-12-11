// Solve the travelling salesman problem

import { Vector3 } from "three";
import { LineSegment } from "../lines/lines";

/**
 * Calculate the deltaV required to tour through an array of points
 * @param points a list of points
 */
export function tourCost(points: Vector3[]) {
  // start at the first point
  const startingPoint = points[0];
  let lastPosition = new Vector3(
    startingPoint.x,
    startingPoint.y,
    startingPoint.z
  );
  let lastVelocity = new Vector3(0, 0, 0);
  let dV2 = 0;

  for (const currentPosition of points) {
    const currentVelocity = currentPosition.clone().sub(lastPosition);

    let dV = new Vector3().add(currentVelocity).sub(lastVelocity);

    dV2 += dV.length();
    lastVelocity = currentVelocity;
    lastPosition = currentPosition;
  }

  return dV2;
}

function swap(array: any[], a: number, b: number) {
  const temp = array[a];
  array[a] = array[b];
  array[b] = temp;
}

function flip(segment: LineSegment) {
  const temp = segment.from;
  segment.from = segment.to;
  segment.to = temp;
}

function lowerSegmentsToPoints(lineSegments: LineSegment[]) {
  let points = [];

  for (const segment of lineSegments) {
    points.push(segment.from);
    points.push(segment.to);
  }

  return points;
}

/**
 * Swaps two line segments if the cost is better, returns the new cost
 */
function swapIfBetter(
  lineSegments: LineSegment[],
  currentCost: number,
  i: number,
  j: number
): number {
  let original = printTour(lineSegments);
  swap(lineSegments, i, j);

  const tourCostWithSwap = tourCost(lowerSegmentsToPoints(lineSegments));

  console.log(
    `trying to swap ${i} and ${j}, cost flipped is ${tourCostWithSwap}, without is ${currentCost}. Going with ${
      tourCostWithSwap < currentCost ? printTour(lineSegments) : original
    }`
  );

  if (tourCostWithSwap >= currentCost) {
    // if it's worse or equal, swap it back
    swap(lineSegments, i, j);
    return currentCost;
  }

  // Otherwise it's better, update the cost

  return tourCostWithSwap;
}

/**
 * Flips a line segment if the cost is better, returns the new cost
 */
function flipIfBetter(
  lineSegments: LineSegment[],
  currentCost: number,
  index: number
): number {
  let original = printTour(lineSegments);
  flip(lineSegments[index]);

  const tourCostWithSwap = tourCost(lowerSegmentsToPoints(lineSegments));

  console.log(
    `trying to flip ${index}, cost flipped is ${tourCostWithSwap}, without is ${currentCost}. Going with ${
      tourCostWithSwap < currentCost ? printTour(lineSegments) : original
    }`
  );

  if (tourCostWithSwap >= currentCost) {
    // if it's worse or equal, swap it back
    flip(lineSegments[index]);
    return currentCost;
  }

  // Otherwise it's better, update the cost
  return tourCostWithSwap;
}

export function printTour(tour: LineSegment[]) {
  let str = tour
    .map(
      (segment) =>
        `[${segment.from.x},${segment.from.y},${segment.from.z}]->[${segment.to.x},${segment.to.y},${segment.to.z}]`
    )
    .join(" ");

  return str;
}

/**
 * Given a list of line segments, what's the optimal path to take through them. Mutates the original array. Returns the final cost
 */
export function solveTSP(lineSegments: LineSegment[]) {
  const n = lineSegments.length;

  let bestTourCost = tourCost(lowerSegmentsToPoints(lineSegments));

  let improved = true;

  while (improved) {
    improved = false;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const potentiallyImprovedCost = flipIfBetter(
          lineSegments,
          bestTourCost,
          i
        );

        if (potentiallyImprovedCost < bestTourCost) {
        }

        bestTourCost = flipIfBetter(lineSegments, bestTourCost, j);
        bestTourCost = swapIfBetter(lineSegments, bestTourCost, i, j);
        bestTourCost = flipIfBetter(lineSegments, bestTourCost, i);
        bestTourCost = flipIfBetter(lineSegments, bestTourCost, j);
      }
    }
  }

  return bestTourCost;
}
