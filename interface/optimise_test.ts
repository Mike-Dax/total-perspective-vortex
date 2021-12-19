import {
  flattenDense,
  getTotalDuration,
  optimise,
  sparseToCost,
  sparseToDense,
  toolpath,
} from "./src/passes";
import { Vector3 } from "three";

import { defaultSettings } from "./test/settings";

import obj_cube from "./cube_test.json";
import obj_particles from "./test/fixtures/obj_particles_frame_3.json";
import { importParticles, ParticlesJSON } from "./src/particles";
import { writeToolpathToFile } from "./src/files";
import { GPencilJSON, importGPencil } from "./src/gpencil";

const particles = importGPencil(obj_cube as GPencilJSON);

const movements = particles.toMovements(defaultSettings);

const { orderedMovements } = optimise(movements, defaultSettings, () => true);

// optimised, generate tool path

const dense = sparseToDense(orderedMovements, defaultSettings);
const flattened = flattenDense(dense);
const duration = getTotalDuration(flattened);

const tp = toolpath(flattened);

writeToolpathToFile(require("path").join(__dirname, "toolpath.json"), tp);
