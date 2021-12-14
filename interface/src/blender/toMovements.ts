import { GPencilToMovementsSettings } from "./gpencil";
import { Material } from "./material";
import { ParticlesToMovementsSettings } from "./particles";

export interface ToMovementSettings {
  // Global object type overrides
  gpencil: GPencilToMovementsSettings;
  particles: ParticlesToMovementsSettings;

  // Do object level overrides here. Particle subsystems can be `object -> subsystem name`
  objectOverrides: {
    [objectName: string]:
      | Partial<GPencilToMovementsSettings>
      | Partial<ParticlesToMovementsSettings>;
  };

  materialOverrides: MaterialOverrides;
}

export function getToMovementSettings(
  settings: ToMovementSettings,
  objType: "gpencil",
  overrideKeys: string[]
): GPencilToMovementsSettings;

export function getToMovementSettings(
  settings: ToMovementSettings,
  objType: "particles",
  overrideKeys: string[]
): ParticlesToMovementsSettings;

export function getToMovementSettings<
  ReturnType = GPencilToMovementsSettings | ParticlesToMovementsSettings
>(
  settings: ToMovementSettings,
  objType: "gpencil" | "particles",
  overrideKeys: string[]
): ReturnType {
  let objSettings = settings[objType];

  // Iterate over every override key, merging in the layers
  for (const objName of overrideKeys) {
    if (settings.objectOverrides[objName]) {
      objSettings = Object.assign(
        {},
        objSettings,
        settings.objectOverrides[objName]
      );
    }
  }

  return objSettings as ReturnType;
}

export interface MaterialOverrides {
  globalOveride: Material | null;

  // Do object level material overrides here.
  objectMaterialOverrides: {
    [objectName: string]: Material;
  };
}

export function getMaterialOverride(
  overrides: MaterialOverrides,
  providedMaterial: Material,
  overrideKeys: string[]
) {
  let mat = providedMaterial;

  if (overrides.globalOveride) {
    mat = overrides.globalOveride;
  }

  // Iterate over every override key, merging in the layers
  for (const objName of overrideKeys) {
    if (overrides.objectMaterialOverrides[objName]) {
      mat = overrides.objectMaterialOverrides[objName];
    }
  }

  return mat;
}

// Have a function that searches for and merges in settings with this object, and a name
// for use with the toMovements calls

// These settings objects need to be serialisable, since they go over the bridge to the worker threads.

// Have the UI populate this global settings object on a global, non-frame basis.

// When we
