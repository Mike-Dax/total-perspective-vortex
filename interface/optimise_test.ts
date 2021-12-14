import { blankMaterial } from "./src/blender/material";
import { Point } from "./src/blender/movements/movements";
import { optimise, sparseToCost } from "./src/passes";
import { Vector3 } from "three";

const defaultSettings = {
  startingPoint: new Vector3(0, 0, 0),
  endingPoint: new Vector3(10000, 0, 0),
  maxSpeed: 300,
  waitAtStartDuration: 0,
  transitionMaterial: blankMaterial,
};

import obj_cube from "./test/fixtures/obj_gpencil.json";
import obj_particles from "./test/fixtures/obj_particles.json";
import { GPencilJSON, importGPencil } from "./src/blender/gpencil";
import { importParticles, ParticlesJSON } from "./src/blender/particles";

const particles = importParticles(obj_particles as ParticlesJSON);

const movements = particles.toMovements({
  drawInVelocityOrientation: true,
  stopDelay: 0,
});

const cost = optimise(movements, defaultSettings);
