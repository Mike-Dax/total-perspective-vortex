import { Vector3 } from "three";
import { importMaterial, MaterialJSON } from "./material";
import { Point, Movement, Line, MovementGroup } from "./movements/movements";
import {
  getMaterialOverride,
  getToMovementSettings,
  ToMovementSettings,
} from "./toMovements";

export class GPencilLayer {
  public strokes: GPencilStroke[] = [];
  public material: MaterialJSON;
  public info: string;

  constructor(info: string, material: MaterialJSON) {
    this.info = info;
    this.material = material;
  }

  public addStroke = (stroke: GPencilStroke) => {
    this.strokes.push(stroke);
  };
}

export class GPencilStroke {
  public useCyclic: boolean;
  public points: GPencilStrokePoint[] = [];

  constructor(useCyclic: boolean) {
    this.useCyclic = useCyclic;
  }

  public addPoint = (point: GPencilStrokePoint) => {
    this.points.push(point);
  };
}

export interface GPencilStrokePoint {
  id: string;
  co: [number, number, number]; // position
  pressure: number; // Pressure of tablet at point when drawing it
  strength: number; // Color intensity (alpha factor)
  vertexColor: [number, number, number, number]; // Vertex color
}

export interface GPencilToMovementsSettings {
  /**
   * If enabled, strokes are broken up into singular lines that may be individually optimised.
   */
  breakUpStrokes?: boolean;
}

export class GPencil {
  constructor(public name: string) {}

  private layers: GPencilLayer[] = [];

  public addLayer = (layer: GPencilLayer) => {
    this.layers.push(layer);
  };

  public toMovements = (settings: ToMovementSettings) => {
    const movements: Movement[] = [];

    for (const layer of this.layers) {
      const material = importMaterial(layer.material);

      for (const stroke of layer.strokes) {
        let lastPoint = new Vector3(
          stroke.points[0].co[0],
          stroke.points[0].co[1],
          stroke.points[0].co[2]
        );

        const settingsWithOverride = getToMovementSettings(
          settings,
          "gpencil",
          [this.name, `${this.name}-${layer.info}`]
        );

        const orderedMovements = new MovementGroup();

        const materialWithOverride = getMaterialOverride(
          settings.materialOverrides,
          material,
          [this.name, `${this.name}-${layer.info}`]
        );

        for (let index = 0; index < stroke.points.length; index++) {
          const point = stroke.points[index];
          const co = point.co;

          let currentPoint = new Vector3(co[0], co[1], co[2]);

          // Create a line from the lastPoint to the currentPoint
          const line: Movement = new Line(
            lastPoint,
            currentPoint,
            materialWithOverride
          );

          // This ID isn't guaranteed to be stable, but it'll probably be close at least some of the time
          line.id = point.id;

          orderedMovements.addMovement(line);

          lastPoint = currentPoint;

          // TODO: Read vertex colours and mix into the layer material
        }

        if (settingsWithOverride.breakUpStrokes) {
          movements.push(...orderedMovements.movements);
        } else {
          movements.push(orderedMovements);
        }
      }
    }

    return movements;
  };
}

export interface GPencilJSON {
  type: "gpencil";
  name: string;
  layers: {
    info: string;
    material: MaterialJSON;
    strokes: {
      useCyclic: boolean;
      points: {
        id: string;
        co: [number, number, number];
        pressure: number;
        strength: number;
        vertexColor: [number, number, number, number];
      }[];
    }[];
  }[];
}

export function importGPencil(json: GPencilJSON) {
  const gPencil = new GPencil(json.name);

  for (const jLayer of json.layers) {
    let layer = new GPencilLayer(jLayer.info, jLayer.material);
    gPencil.addLayer(layer);

    for (const jStroke of jLayer.strokes) {
      const stroke = new GPencilStroke(jStroke.useCyclic);
      layer.addStroke(stroke);

      for (const jPoint of jStroke.points) {
        stroke.addPoint(jPoint);
      }
    }
  }

  return gPencil;
}
