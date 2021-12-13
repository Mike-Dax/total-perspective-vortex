import { CubicBezierCurve3, Vector3 } from "three";
import { MaterialJSON } from "../material";

const defaultSpeed = 30; // mm/s

/**
 * The base level optimisable movement.
 */
export abstract class Movement {
  abstract type: string;

  /**
   * Take this movement in the opposite direction
   */
  abstract flip: () => void;

  /**
   * Flatten this movement, calling a callback with its children.
   *
   * By default just adds itself to the array
   */
  abstract flatten: () => Movement[];

  /**
   * Get the length of this movement in mm
   */
  abstract getLength: () => number;

  /**
   * Sets the desired speed for this movement in mm/second
   */
  abstract setMaxSpeed: (maxSpeed: number) => void;

  /**
   * Get the length of this movement in ms
   */
  abstract getDuration: () => number;

  /**
   * Get the starting position of this movement
   */
  abstract getStart: () => Vector3;
  /**
   * Get the ending position of this movement
   */
  abstract getEnd: () => Vector3;

  /**
   * Get the desired entry direction of this movement
   */
  abstract getDesiredEntryVelocity: () => Vector3;
  /**
   * Get the desired exit direction of this movement
   */
  abstract getExpectedExitVelocity: () => Vector3;
}

export type DenseMovements = Movement[] & { __dense: true };

export function declareDense(movements: Movement[]) {
  return movements as unknown as DenseMovements;
}

export function isMovementGroup(movement: Movement): movement is MovementGroup {
  return movement.type === "movementgroup";
}

/**
 * A group of movements that must be executed in order.
 */
export class MovementGroup extends Movement {
  readonly type = "movementgroup";

  public movements: Movement[] = [];

  public addMovement = (movement: Movement) => {
    this.movements.push(movement);
  };

  public flip = () => {
    for (const movement of this.movements) {
      movement.flip();
    }
    this.movements.reverse();
  };

  public flatten = () => {
    const movements = [];
    for (const movement of this.movements) {
      movements.push(...movement.flatten());
    }
    return movements;
  };

  public getLength: () => number = () => {
    if (this.movements.length === 0) {
      return 0;
    }

    return this.movements.reduce(
      (len, movement) => movement.getLength() + len,
      0
    );
  };

  public setMaxSpeed = (speed: number) => {
    if (this.movements.length === 0) {
      throw new Error("MovementGroup is empty, but setSpeed was called");
    }

    for (const movement of this.movements) {
      movement.setMaxSpeed(speed);
    }
  };

  public getDuration = () => {
    if (this.movements.length === 0) {
      return 0;
    }

    return this.movements.reduce(
      (dur, movement) => movement.getDuration() + dur,
      0
    );
  };

  public getStart = () => {
    if (this.movements.length === 0) {
      throw new Error("MovementGroup is empty, but getStart was called");
    }

    return this.movements[0].getStart();
  };

  public getEnd = () => {
    if (this.movements.length === 0) {
      throw new Error("MovementGroup is empty, but getEnd was called");
    }

    return this.movements[this.movements.length - 1].getEnd();
  };

  public getDesiredEntryVelocity = () => {
    if (this.movements.length === 0) {
      throw new Error(
        "MovementGroup is empty, but getDesiredEntryVelocity was called"
      );
    }

    return this.movements[0].getDesiredEntryVelocity();
  };

  public getExpectedExitVelocity = () => {
    if (this.movements.length === 0) {
      throw new Error(
        "MovementGroup is empty, but getExpectedExitVelocity was called"
      );
    }

    return this.movements[this.movements.length - 1].getExpectedExitVelocity();
  };
}

export function isLine(movement: Movement): movement is Line {
  return movement.type === "line";
}

/**
 * A line is a linear move from one location to another, with the light on.
 */
export class Line extends Movement {
  readonly type = "line";
  maxSpeed: number = defaultSpeed;

  constructor(
    public from: Vector3,
    public to: Vector3,
    public material: MaterialJSON
  ) {
    super();
  }

  // Swap the ordering of these points
  public flip = () => {
    const temp = this.to;
    this.to = this.from;
    this.from = temp;

    // TODO: Flip the material
  };

  public flatten = () => {
    return [this];
  };

  public getLength: () => number = () => {
    return this.from.distanceTo(this.to);
  };

  public setMaxSpeed = (maxSpeed: number) => {
    this.maxSpeed = maxSpeed;
  };

  public getDuration = () => {
    // Lines are taken at maximum speed
    return this.getLength() / this.maxSpeed;
  };

  public getStart = () => {
    return this.from;
  };

  public getEnd = () => {
    return this.to;
  };

  public getDesiredEntryVelocity = () => {
    return this.to
      .clone()
      .sub(this.from)
      .normalize()
      .multiplyScalar(this.maxSpeed);
  };

  public getExpectedExitVelocity = () => {
    return this.to
      .clone()
      .sub(this.from)
      .normalize()
      .multiplyScalar(this.maxSpeed);
  };
}

export function isPoint(movement: Movement): movement is Point {
  return movement.type === "point";
}

/**
 * A `Point` is a fixed duration stay at a certain point.
 */
export class Point extends Movement {
  readonly type = "point";
  maxSpeed: number = defaultSpeed;

  // For a particle, approach in the velocity of its velocity
  public velocity: Vector3 = new Vector3(0, 0, 0);

  constructor(
    public pos: Vector3,
    public duration: number, // Can be 0, for a 'passthrough'
    public material: MaterialJSON
  ) {
    super();
  }

  // Flipping a Point does nothing
  public flip = () => {};

  public flatten = () => {
    return [this];
  };

  public getLength: () => number = () => {
    return 0;
  };

  public setMaxSpeed = (maxSpeed: number) => {
    this.maxSpeed = maxSpeed;
  };

  /**
   * The duration of a point is determined by its set duration, or if it's nothing,
   * the minimum unit of time, 1 millisecond.
   */
  public getDuration = () => {
    if (this.duration > 0) {
      return this.duration;
    }

    // The minimum duration is 1ms
    return 1;
  };

  public getStart = () => {
    // Start half of one millisecond away from our desired point, at max speed this is 0.15mm away
    return this.getDesiredEntryVelocity()
      .clone()
      .multiplyScalar(0.001 / 2)
      .sub(this.pos);
  };

  public getEnd = () => {
    // End half of one millisecond away from our desired point, at max speed this is 0.15mm away
    return this.getExpectedExitVelocity()
      .clone()
      .multiplyScalar(0.001 / 2)
      .add(this.pos);
  };

  public getDesiredEntryVelocity = () => {
    return this.velocity.normalize().multiplyScalar(this.maxSpeed);
  };

  public getExpectedExitVelocity = () => {
    return this.velocity.normalize().multiplyScalar(this.maxSpeed);
  };
}

export function isTransition(movement: Movement): movement is Transition {
  return movement.type === "transition";
}

/**
 * A transition is a move from one Movement to another.
 *
 * It's probably going to be a Cubic Bezier, with the velocity components used as control points.
 */
export class Transition extends Movement {
  readonly type = "transition";
  maxSpeed: number = defaultSpeed;

  constructor(
    public from: Movement,
    public to: Movement,
    public material: MaterialJSON
  ) {
    super();
  }

  private curve: CubicBezierCurve3 | null = null;

  private lazyGenerateCurve = () => {
    if (this.curve) return this.curve;

    /**
     * v0 – The starting point.
     * v1 – The first control point.
     * v2 – The second control point.
     * v3 – The ending point.
     */
    this.curve = new CubicBezierCurve3(
      this.getStart(),
      this.getStart().clone().add(this.getDesiredEntryVelocity()),
      this.getEnd().clone().sub(this.getExpectedExitVelocity()),
      this.getEnd()
    );

    this.curve.arcLengthDivisions = 20; // divide into 20 segments for length calculations

    return this.curve;
  };

  // Swap the ordering of this transition movement
  public flip = () => {
    const temp = this.to;
    this.to = this.from;
    this.from = temp;

    // TODO: Flip the material
  };

  public flatten = () => {
    return [this];
  };

  public getLength = () => {
    // TODO: What kind of curve is this, create it,
    const curve = this.lazyGenerateCurve();

    return curve.getLength();
  };

  public setMaxSpeed = (maxSpeed: number) => {
    this.maxSpeed = maxSpeed;
  };

  public getDuration = () => {
    return this.getLength() / this.maxSpeed;
  };

  public getStart = () => {
    return this.from.getEnd();
  };

  public getEnd = () => {
    return this.to.getStart();
  };

  public getDesiredEntryVelocity = () => {
    return this.from.getExpectedExitVelocity();
  };

  public getExpectedExitVelocity = () => {
    return this.to.getDesiredEntryVelocity();
  };
}
