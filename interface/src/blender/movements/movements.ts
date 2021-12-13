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
  abstract getDesiredEntryDirection: () => Vector3 | null;
  /**
   * Get the desired exit direction of this movement
   */
  abstract getExpectedExitDirection: () => Vector3 | null;
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

  public getDesiredEntryDirection = () => {
    if (this.movements.length === 0) {
      throw new Error(
        "OrderedMovements is empty, but getDesiredEntryDirection was called"
      );
    }

    return this.movements[0].getDesiredEntryDirection();
  };

  public getExpectedExitDirection = () => {
    if (this.movements.length === 0) {
      throw new Error(
        "OrderedMovements is empty, but getExpectedExitDirection was called"
      );
    }

    return this.movements[this.movements.length - 1].getExpectedExitDirection();
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

  public getStart = () => {
    return this.from;
  };

  public getEnd = () => {
    return this.to;
  };

  public getDesiredEntryDirection = () => {
    return this.to.clone().sub(this.from).normalize();
  };

  public getExpectedExitDirection = () => {
    return this.to.clone().sub(this.from).normalize();
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

  // For a particle, approach in the direction of its velocity
  public direction: Vector3 | null = null;

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

  public getStart = () => {
    return this.pos;
  };

  public getEnd = () => {
    return this.pos;
  };

  public getDesiredEntryDirection = () => {
    return this.direction;
  };

  public getExpectedExitDirection = () => {
    return this.direction;
  };
}

export function isTransition(movement: Movement): movement is Transition {
  return movement.type === "transition";
}

/**
 * A transition gets from one place to another with various additional constraints
 *
 * It can be constrained to have a starting or ending direction.
 * It can be constrained to being or end stopped.
 */
export class Transition extends Movement {
  readonly type = "transition";

  public startingDirection: Vector3 | null = null;
  public endingDirection: Vector3 | null = null;
  public startStopped: boolean = false;
  public endStopped: boolean = false;

  constructor(
    public from: Vector3,
    public to: Vector3,
    public material: MaterialJSON
  ) {
    super();
  }

  // Swap the ordering of this transition movement
  flip = () => {
    const temp = this.to;
    this.to = this.from;
    this.from = temp;

    const tempDir = this.startingDirection;
    this.startingDirection = this.endingDirection;
    this.endingDirection = tempDir;

    const tempStopped = this.startStopped;
    this.startStopped = this.endStopped;
    this.endStopped = tempStopped;

    // TODO: Flip the material
  };

  public getStart = () => {
    return this.from;
  };

  public getEnd = () => {
    return this.to;
  };

  public getDesiredEntryDirection = () => {
    return this.startingDirection;
  };

  public getExpectedExitDirection = () => {
    return this.endingDirection;
  };
}
