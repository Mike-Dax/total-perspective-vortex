import { blankMaterial } from "../src/blender/material";
import { Point } from "../src/blender/movements/movements";
import { sparseToCost } from "../src/passes";
import { Vector3 } from "three";

const defaultSettings = {
  startingPoint: new Vector3(0, 0, 0),
  endingPoint: new Vector3(0, 0, 0),
  maxSpeed: 300,
  waitAtStartDuration: 0,
};

describe("Cost function", () => {
  it(`can cost a tour`, () => {
    const movements = [
      new Point(new Vector3(0, 0, 0), 0, blankMaterial),
      new Point(new Vector3(1, 0, 0), 0, blankMaterial),
    ];

    const cost = sparseToCost(movements, defaultSettings);

    expect(cost).toBeTruthy();
  });

  it(`can cost a tour`, () => {
    const movements = [
      new Point(new Vector3(0, 0, 0), 10, blankMaterial),
      new Point(new Vector3(1, 0, 0), 0, blankMaterial),
      new Point(new Vector3(0, 1, 0), 0, blankMaterial),
      new Point(new Vector3(0, 0, 1), 0, blankMaterial),
      new Point(new Vector3(0, 1, 1), 0, blankMaterial),
      new Point(new Vector3(1, 1, 1), 0, blankMaterial),
    ];

    const cost = sparseToCost(movements, defaultSettings);

    expect(cost).toBeTruthy();
  });
});
