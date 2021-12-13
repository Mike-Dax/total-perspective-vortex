import { Vector3 } from "three";
import { MaterialJSON } from "../material";

/**
 * The base level optimisable movement.
 */
export abstract class Movement {
  /**
   * Take this movement in the opposite direction
   */
  abstract flip: () => void;
}

/**
 * A group of movements that must be executed in order.
 */
export class OrderedMovements extends Movement {
  public movements: Movement[] = [];

  public addMovement = (movement: Movement) => {
    this.movements.push(movement);
  };

  /**
   * Flip this bag of movements
   */
  public flip = () => {
    for (const movement of this.movements) {
      movement.flip();
    }
    this.movements.reverse();
  };
}

/**
 * A line is a linear move from one location to another, with the light on.
 */
export class Line extends Movement {
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
}

/**
 * A `Point` is a fixed duration stay at a certain point.
 */
export class Point extends Movement {
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
}

/**
 * A transition gets from one place to another with various additional constraints
 *
 * It can be constrained to have a starting or ending direction.
 * It can be constrained to being or end stopped.
 */
export class Transition extends Movement {
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
}
