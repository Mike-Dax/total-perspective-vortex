import { blankMaterial } from "../src/material";
import { Point } from "../src/movements";
import { sparseToCost } from "../src/passes";
import { Vector3 } from "three";

import { defaultSettings } from "./settings";

describe("Cost function", () => {
  xit(`can cost a tour`, () => {
    const movements = [
      new Point(new Vector3(0, 0, 0), 0, blankMaterial),
      new Point(new Vector3(1, 0, 0), 0, blankMaterial),
    ];

    const cost = sparseToCost(movements, defaultSettings);

    expect(cost).toBeTruthy();
  });

  xit(`can cost a tour`, () => {
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
