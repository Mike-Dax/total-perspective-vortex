import { Point } from "../src/optimiser/movements";
import { sparseToCost } from "../src/optimiser/passes";
import { Vector3 } from "three";
import { defaultTransitionMaterial } from "../src/optimiser/material";

describe("Cost function", () => {
  it(`can cost a tour`, () => {
    const movements = [
      new Point(new Vector3(0, 0, 0), 0, defaultTransitionMaterial, `A`),
      new Point(new Vector3(1, 0, 0), 0, defaultTransitionMaterial, `B`),
    ];

    const cost = sparseToCost(movements);

    expect(cost).toBeTruthy();
  });
});
