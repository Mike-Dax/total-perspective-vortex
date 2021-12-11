import { Material } from "../src/materials/material";
import { Vector3 } from "three";
import { LineSegment } from "../src/lines/lines";
import { solveTSP, tourCost, printTour } from "../src/passes/tsp";

const mat = new Material();

xdescribe("Fitness Function", () => {
  it(`correctly calculates the deltaV of a point from the origin is its magnitude`, () => {
    const tour = [new Vector3(0, 0, 0), new Vector3(1, 0, 0)];
    const cost = tourCost(tour);
    expect(cost).toBe(1);
  });
  it(`correctly calculates the deltaV of a move back and forth`, () => {
    const tour = [
      new Vector3(0, 0, 0), // 0
      new Vector3(1, 0, 0), // move 1 unit
      new Vector3(0, 0, 0), // slow down 1 unit, move back 1 unit
    ];

    const cost = tourCost(tour);

    expect(cost).toBe(3);
  });
  it(`correctly calculates the deltaV of a larger move forth and a smaller move back`, () => {
    const tour = [
      new Vector3(0, 0, 0), // 0
      new Vector3(2, 0, 0), // move 2 unit
      new Vector3(1, 0, 0), // slow down 2 unit, move back 1 unit
    ];

    const cost = tourCost(tour);

    expect(cost).toBe(5);
  });
});

describe("TSP solver", () => {
  it(`correctly orders colinear points`, () => {
    const tour = [
      new LineSegment(new Vector3(2, 0, 0), new Vector3(3, 0, 0), mat),
      new LineSegment(new Vector3(0, 0, 0), new Vector3(1, 0, 0), mat),
      new LineSegment(new Vector3(2, 0, 0), new Vector3(1, 0, 0), mat),
    ];

    const cost = solveTSP(tour);

    expect(cost).toBe(3);
  });
});
