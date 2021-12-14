import { GPencilToMovementsSettings } from "./gpencil";
import { Material } from "./material";
import { ParticlesToMovementsSettings } from "./particles";
import { Vector3 } from "three";

export interface Settings {
  // Global object type settings
  objectSettings: {
    gpencil: GPencilToMovementsSettings;
    particles: ParticlesToMovementsSettings;
  };

  // Per-object overrides
  objectOverrides: {
    [objectName: string]:
      | Partial<GPencilToMovementsSettings>
      | Partial<ParticlesToMovementsSettings>;
  };

  // Materials
  transitionMaterial: Material;
  materialOverrides: MaterialOverrides;

  // Optimisation settings
  optimisation: OptimisationSettings;
}

export interface MaterialOverrides {
  globalOveride: Material | null;

  // Do object level material overrides here.
  objectMaterialOverrides: {
    [objectName: string]: Material;
  };
}

export interface OptimisationSettings {
  waitAtStartDuration: number;

  startingPoint: Vector3;
  endingPoint: Vector3;

  maxSpeed: number; // mm/s
}

export function getToMovementSettings(
  settings: Settings,
  objType: "gpencil",
  overrideKeys: string[]
): GPencilToMovementsSettings;

export function getToMovementSettings(
  settings: Settings,
  objType: "particles",
  overrideKeys: string[]
): ParticlesToMovementsSettings;

export function getToMovementSettings<
  ReturnType = GPencilToMovementsSettings | ParticlesToMovementsSettings
>(
  settings: Settings,
  objType: "gpencil" | "particles",
  overrideKeys: string[]
): ReturnType {
  let objSettings = settings.objectSettings[objType];

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
