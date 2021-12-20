import { Vector3 } from "three";
import { blankMaterial } from "../src/material";

import { Settings } from "../src/settings";

export const defaultSettings: Settings = {
  objectSettings: {
    gpencil: {
      breakUpStrokes: true,
    },
    particles: {
      drawInVelocityOrientation: false,
      stopDelay: 10,
    },
  },

  // Do object level overrides here. Particle subsystems can be `object -> subsystem name`
  objectOverrides: {},

  objectToggles: {},

  transitionMaterial: blankMaterial,
  materialOverrides: {
    globalOveride: null,
    objectMaterialOverrides: {},
  },

  optimisation: {
    startingPoint: new Vector3(0, 0, 0),
    endingPoint: new Vector3(0, 0, 0),
    maxSpeed: 300,
    waitAtStartDuration: 0,
  },
};
