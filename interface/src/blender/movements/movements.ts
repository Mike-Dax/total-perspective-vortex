import { Vector3 } from "three";
import { MaterialJSON } from "../material";

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
  public flatten = (add: (movement: Movement) => void) => {
    add(this);
  };

  /**
   * Get the length of this movement in mm
   */
  abstract getLength: () => number;

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

  public flatten = (add: (movement: Movement) => void) => {
    for (const movement of this.movements) {
      add(movement);
    }
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

  public getStart = () => {
    if (this.movements.length === 0) {
      throw new Error("OrderedMovements is empty, but getStart was called");
    }

    return this.movements[0].getStart();
  };

  public getEnd = () => {
    if (this.movements.length === 0) {
      throw new Error("OrderedMovements is empty, but getEnd was called");
    }

    return this.movements[this.movements.length - 1].getEnd();
  };

  public getDesiredEntryVelocity = () => {
    if (this.movements.length === 0) {
      throw new Error(
        "OrderedMovements is empty, but getDesiredEntryVelocity was called"
      );
    }

    return this.movements[0].getDesiredEntryVelocity();
  };

  public getExpectedExitVelocity = () => {
    if (this.movements.length === 0) {
      throw new Error(
        "OrderedMovements is empty, but getExpectedExitVelocity was called"
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

  constructor(
    public from: Vector3,
    public to: Vector3,
    public material: MaterialJSON
  ) {
    super();
  }

  // Swap the ordering of these points
  flip = () => {
    const temp = this.to;
    this.to = this.from;
    this.from = temp;

    // TODO: Flip the material
  };

  public getLength: () => number = () => {
    return this.from.distanceTo(this.to);
  };

  public getStart = () => {
    return this.from;
  };

  public getEnd = () => {
    return this.to;
  };

  public getDesiredEntryVelocity = () => {
    return this.to.clone().sub(this.from); // .normalize();
  };

  public getExpectedExitVelocity = () => {
    return this.to.clone().sub(this.from); // .normalize();
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
  flip = () => {};

  // TODO: A boolean to indicate a movement doesn't gain anything from flipping?

  public getLength: () => number = () => {
    return 0;
  };

  public getStart = () => {
    return this.pos;
  };

  public getEnd = () => {
    return this.pos;
  };

  public getDesiredEntryVelocity = () => {
    return this.velocity;
  };

  public getExpectedExitVelocity = () => {
    return this.velocity;
  };
}

export function isTransition(movement: Movement): movement is Transition {
  return movement.type === "transition";
}

/**
 * A transition is a move from one Movement to another.
 *
 * It's probably going to be a Cubic Bezier, with the scaled velocity components as control points
 */
export class Transition extends Movement {
  readonly type = "transition";

  constructor(
    public from: Movement,
    public to: Movement,
    public material: MaterialJSON
  ) {
    super();
  }

  // Swap the ordering of this transition movement
  flip = () => {
    const temp = this.to;
    this.to = this.from;
    this.from = temp;

    // TODO: Flip the material
  };

  public getLength: () => number = () => {
    // TODO: What kind of curve is this, create it,

    return 0;
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
