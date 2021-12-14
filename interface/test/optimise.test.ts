import { blankMaterial } from "../src/blender/material";
import { Point } from "../src/blender/movements/movements";
import { OptimisationSettings, optimise, sparseToCost } from "../src/passes";
import { Vector3 } from "three";

const defaultSettings: OptimisationSettings = {
  startingPoint: new Vector3(0, 0, 0),
  endingPoint: new Vector3(10000, 0, 0),
  maxSpeed: 300,
  waitAtStartDuration: 0,
  transitionMaterial: blankMaterial,
};

import obj_cube from "./fixtures/obj_gpencil.json";
import obj_particles from "./fixtures/obj_particles.json";
import { GPencilJSON, importGPencil } from "../src/blender/gpencil";
import { importParticles, ParticlesJSON } from "../src/blender/particles";

describe("Optimise function", () => {
  xit(`can optimise some particles`, () => {
    const particles = importParticles(obj_particles as ParticlesJSON);

    const movements = particles.toMovements({
      drawInVelocityOrientation: true,
      stopDelay: 0,
    });

    const cost = optimise(movements, defaultSettings);

    expect(cost).toBeTruthy();
  });
  it(`can optimise a cube`, () => {
    const cube = importGPencil(obj_cube as GPencilJSON);

    const movements = cube.toMovements({
      breakUpStrokes: true,
    });

    const cost = optimise(movements, defaultSettings);

    expect(cost).toBeTruthy();
  });
});
