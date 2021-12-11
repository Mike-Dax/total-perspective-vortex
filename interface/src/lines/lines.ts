import { Material } from "../materials/material";
import { Vector3 } from "three";

export class LineSegment {
  constructor(
    public from: Vector3,
    public to: Vector3,
    public material: Material
  ) {}
}
