import { blankMaterial } from "../src/material";
import { Point } from "../src/movements";
import { optimise, sparseToCost } from "../src/passes";
import { Vector3 } from "three";
import obj_cube from "./fixtures/obj_gpencil.json";
import obj_particles_frame_3 from "./fixtures/obj_particles_frame_3.json";
import obj_particles_frame_4 from "./fixtures/obj_particles_frame_4.json";
import obj_particles_frame_25 from "./fixtures/obj_particles_frame_25.json";
import { GPencilJSON, importGPencil } from "../src/gpencil";
import { importParticles, ParticlesJSON } from "../src/particles";
import { Settings } from "../src/settings";

import { defaultSettings } from "./settings";

describe("Optimise function", () => {
  xit(`can optimise some particles`, () => {
    const particles = importParticles(obj_particles_frame_3 as ParticlesJSON);

    const movements = particles.toMovements(defaultSettings);

    const { cost } = optimise(movements, defaultSettings);

    expect(cost).toBeTruthy();
  });
  xit(`can optimise a cube`, () => {
    const cube = importGPencil(obj_cube as GPencilJSON);

    const movements = cube.toMovements(defaultSettings);

    const { cost } = optimise(movements, defaultSettings);

    expect(cost).toBeTruthy();
  });

  it(`can use an ordering cache to reduce iteration time for subsequent frames`, () => {
    const frame_3 = importParticles(obj_particles_frame_3 as ParticlesJSON);

    const frame_3_movements = frame_3.toMovements(defaultSettings);

    const start3 = Date.now();
    const results_frame_3 = optimise(frame_3_movements, defaultSettings);
    const end3 = Date.now();

    const frame_3_take_2 = importParticles(
      obj_particles_frame_3 as ParticlesJSON
    );

    const frame_3_take_2_movements =
      frame_3_take_2.toMovements(defaultSettings);

    const start3_take_2 = Date.now();
    const results_frame_3_take_2 = optimise(
      frame_3_take_2_movements,
      defaultSettings,
      results_frame_3.orderingCache
    );
    const end3_take_2 = Date.now();

    const frame_4 = importParticles(obj_particles_frame_4 as ParticlesJSON);

    const frame_4_movements = frame_4.toMovements(defaultSettings);

    const start4 = Date.now();

    const results_frame_4 = optimise(
      frame_4_movements,
      defaultSettings,
      results_frame_3.orderingCache
    );
    const end4 = Date.now();

    const frame_25 = importParticles(obj_particles_frame_25 as ParticlesJSON);

    const frame_25_movements = frame_25.toMovements(defaultSettings);

    const start25 = Date.now();

    const results_frame_25 = optimise(
      frame_25_movements,
      defaultSettings,
      results_frame_3.orderingCache
    );
    const end25 = Date.now();

    console.log(
      `frame 3, no cache: move duration: ${results_frame_3.cost}, ${
        results_frame_3.iterations
      } iterations over ${Math.round(end3 - start3)}ms, `
    );
    console.log(
      `frame 3, self cache: move duration: ${results_frame_3_take_2.cost}, ${
        results_frame_3_take_2.iterations
      } iterations over ${Math.round(end3_take_2 - start3_take_2)}ms, `
    );
    console.log(
      `frame 4, cache: move duration: ${results_frame_4.cost}, ${
        results_frame_4.iterations
      } iterations over ${Math.round(end4 - start4)}ms, `
    );
    console.log(
      `frame 25, cache: move duration: ${results_frame_25.cost}, ${
        results_frame_25.iterations
      } iterations over ${Math.round(end25 - start25)}ms, `
    );

    expect(results_frame_4.iterations).toBeLessThan(results_frame_3.iterations);
  });
});
