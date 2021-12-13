import { Color, Vector3 } from "three";

export class GPencilLayer {
  public strokes: GPencilStroke[] = [];
  public color: [number, number, number];
  public info: string;

  constructor(info: string, color: [number, number, number]) {
    this.info = info;
    this.color = color;
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
  co: [number, number, number]; // position
  pressure: number; // Pressure of tablet at point when drawing it
  strength: number; // Color intensity (alpha factor)
  vertexColor: [number, number, number, number]; // Vertex color
}

export class GPencil {
  constructor() {}

  private layers: GPencilLayer[] = [];

  public addLayer = (layer: GPencilLayer) => {
    this.layers.push(layer);
  };
}

export interface GPencilJSON {
  type: "gpencil";
  layers: {
    color: [number, number, number];
    info: string;
    strokes: {
      useCyclic: boolean;
      points: {
        co: [number, number, number];
        pressure: number;
        strength: number;
        vertexColor: [number, number, number, number];
      }[];
    }[];
  }[];
}

export function importGPencil(json: GPencilJSON) {
  const gPencil = new GPencil();

  for (const jLayer of json.layers) {
    let layer = new GPencilLayer(jLayer.info, jLayer.color);
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
