import { blankMaterial } from "../src/material";
import { Point } from "../src/movements";
import {
  flattenDense,
  getTotalDuration,
  optimise,
  sparseToCost,
  sparseToDense,
  toolpath,
} from "../src/passes";
import { Vector3 } from "three";
import obj_cube from "./fixtures/obj_gpencil.json";
import obj_particles from "./fixtures/obj_particles_frame_3.json";
import { GPencilJSON, importGPencil } from "../src/gpencil";
import { importParticles, ParticlesJSON } from "../src/particles";
import { defaultSettings } from "./settings";

describe("Toolpath generation", () => {
  xit(`can optimise a cube`, () => {
    const cube = importGPencil(obj_cube as GPencilJSON);

    const movements = cube.toMovements(defaultSettings);

    const { orderedMovements } = optimise(
      movements,
      defaultSettings,
      () => true
    );

    // optimised, generate tool path

    const dense = sparseToDense(orderedMovements, defaultSettings);
    const flattened = flattenDense(dense);
    const duration = getTotalDuration(flattened);

    const tp = toolpath(flattened);

    console.log(`tp`, tp, duration);

    expect(duration).toBeTruthy();
  });
});
