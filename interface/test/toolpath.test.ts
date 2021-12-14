import { blankMaterial } from "../src/blender/material";
import { Point } from "../src/blender/movements/movements";
import {
  flattenDense,
  getTotalDuration,
  OptimisationSettings,
  optimise,
  sparseToCost,
  sparseToDense,
  toolpath,
} from "../src/passes";
import { Vector3 } from "three";
import obj_cube from "./fixtures/obj_gpencil.json";
import obj_particles from "./fixtures/obj_particles_frame_3.json";
import { GPencilJSON, importGPencil } from "../src/blender/gpencil";
import { importParticles, ParticlesJSON } from "../src/blender/particles";
import { ToMovementSettings } from "src/blender/toMovements";

const defaultSettings: OptimisationSettings = {
  startingPoint: new Vector3(0, 0, 0),
  endingPoint: new Vector3(0, 0, 0),
  maxSpeed: 300,
  waitAtStartDuration: 1000,
  transitionMaterial: blankMaterial,
};

const defaultToMovementSettings: ToMovementSettings = {
  gpencil: {
    breakUpStrokes: true,
  },
  particles: {
    drawInVelocityOrientation: false,
    stopDelay: 10,
  },

  // Do object level overrides here. Particle subsystems can be `object -> subsystem name`
  objectOverrides: {},

  materialOverrides: {
    globalOveride: null,
    objectMaterialOverrides: {},
  },
};

describe("Toolpath generation", () => {
  xit(`can optimise a cube`, () => {
    const cube = importGPencil(obj_cube as GPencilJSON);

    const movements = cube.toMovements(defaultToMovementSettings);

    optimise(movements, defaultSettings);

    // optimised, generate tool path

    const dense = sparseToDense(movements, defaultSettings);
    const flattened = flattenDense(dense);
    const duration = getTotalDuration(flattened);

    const tp = toolpath(flattened);

    console.log(`tp`, tp, duration);

    expect(duration).toBeTruthy();
  });
});
