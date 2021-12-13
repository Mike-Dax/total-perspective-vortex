import { Color, Vector3 } from "three";

export class GPencilLayer {
  public strokes: GPencilStroke[] = [];
  public color: [number, number, number];

  constructor(color: [number, number, number]) {
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
  co: number; // position
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
  strokes: {
    useCyclic: boolean;
    points: {
      co: [number, number, number];
      pressure: number;
      strength: number;
      vertexColor: [number, number, number, number];
    }[];
  }[];
  color: [number, number, number];
}
