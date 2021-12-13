import { Material } from "../src/materials/material";
import { Vector3 } from "three";
import { LineSegment } from "../src/lines/lines";
import { solveTSP, tourCost, printTour } from "../src/passes/tsp";

const mat = new Material();

describe("Fitness Function", () => {
  it(`calculates correct fitness #1`, () => {
    const tour = [new Vector3(0, 0, 0), new Vector3(1, 0, 0)];
    const cost = tourCost(tour);

    const tourGolden = [new Vector3(1, 0, 0), new Vector3(0, 0, 0)];
    const costGolden = tourCost(tourGolden);

    expect(cost).toBe(costGolden);
  });
  it(`calculates correct fitness #2`, () => {
    const tour = [
      new Vector3(0, 0, 0), // 0
      new Vector3(1, 0, 0), // move 1 unit
      new Vector3(0, 0, 0), // slow down 1 unit, move back 1 unit
    ];

    const cost = tourCost(tour);

    const tourGolden = [new Vector3(0, 0, 0), new Vector3(3, 0, 0)];
    const costGolden = tourCost(tourGolden);

    expect(cost).toBe(costGolden);
  });
  it(`calculates correct fitness #3`, () => {
    const tour = [
      new Vector3(0, 0, 0), // 0
      new Vector3(2, 0, 0), // move 2 unit
      new Vector3(1, 0, 0), // slow down 2 unit, move back 1 unit
    ];

    const cost = tourCost(tour);

    const tourGolden = [new Vector3(0, 0, 0), new Vector3(5, 0, 0)];
    const costGolden = tourCost(tourGolden);

    expect(cost).toBe(costGolden);
  });
  it(`calculates correct fitness #4`, () => {
    const tour = [
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(2, 0, 0),
      new Vector3(2, 0, 0),
      new Vector3(3, 0, 0),
    ];

    const cost = tourCost(tour);

    const tourGolden = [new Vector3(0, 0, 0), new Vector3(3, 0, 0)];
    const costGolden = tourCost(tourGolden);

    expect(cost).toBe(costGolden);
  });
});

describe("TSP solver", () => {
  it(`correctly orders colinear points`, () => {
    const tour = [
      new LineSegment(new Vector3(2, 0, 0), new Vector3(3, 0, 0), mat),
      new LineSegment(new Vector3(1, 0, 0), new Vector3(2, 0, 0), mat),
      new LineSegment(new Vector3(0, 0, 0), new Vector3(1, 0, 0), mat),

      // new LineSegment(new Vector3(2, 0, 0), new Vector3(3, 0, 0), mat),
      // new LineSegment(new Vector3(0, 0, 0), new Vector3(1, 0, 0), mat),
      // new LineSegment(new Vector3(2, 0, 0), new Vector3(1, 0, 0), mat),
    ];

    const cost = solveTSP(tour);

    const tourGolden = [new Vector3(0, 0, 0), new Vector3(3, 0, 0)];
    const costGolden = tourCost(tourGolden);

    expect(cost).toBe(costGolden);
  });
});
