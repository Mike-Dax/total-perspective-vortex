import {
  declareDense,
  DenseMovements,
  InterLineTransition,
  isLine,
  isPoint,
  isTransit,
  Line,
  MILLISECONDS_IN_SECOND,
  Movement,
  Point,
  PointTransition,
  Transit,
  Transition,
  TRANSITION_OBJECT_ID,
} from './movements'

import { Settings } from './settings'
import { MathUtils, Vector3 } from 'three'
import { defaultTransitionMaterial } from './material'
import { MixMaterial } from './materials/MixMaterial'
import xxhash, { XXHash } from 'xxhash-wasm'
import { Permutor } from './permutor'

/**
 * Flatten any grouped movements into simple movements
 */
function flattenSparseBag(sparseBag: Movement[]): DenseMovements {
  let denseFlatList: DenseMovements = declareDense([])

  for (let index = 0; index < sparseBag.length; index++) {
    const movement = sparseBag[index]

    const flattened = movement.flatten()

    for (let i = 0; i < flattened.length; i++) {
      const f = flattened[i]
      denseFlatList.push(f)
    }
  }

  return denseFlatList
}

/**
 * Add transition movements between each move
 */
export function sparseToDense(
  sparseBag: Movement[],
  settings: Settings,
): DenseMovements {
  if (sparseBag.length === 0) {
    // If there are no moves, return an empty dense bag
    return declareDense([])
  }

  const flattened = flattenSparseBag(sparseBag)

  // Start with a Transit move to the start of the first movement
  let previousMovement: Movement = new Transit(
    flattened[0].getStart(),
    settings.optimisation.waitAtStartDuration,
    defaultTransitionMaterial,
    TRANSITION_OBJECT_ID,
  )

  const denseMovements: DenseMovements = declareDense([previousMovement])

  for (let index = 0; index < flattened.length; index++) {
    const movement = flattened[index]

    // Reset line lengths, etc
    movement.resetOptimisationState()

    // Set the max speed of the movement so velocities are scaled
    movement.setMaxSpeed(settings.optimisation.maxSpeed)

    // If the previous movement was a transit to the correct place for this movement, don't do a second transition
    if (
      isTransit(previousMovement) &&
      previousMovement.getEnd().distanceTo(movement.getStart()) < 1
    ) {
      // Add the movement to the dense bag
      denseMovements.push(movement)

      // Update the last movement
      previousMovement = movement
      continue
    }

    // If the last movement and this movement are both lines, and their end and start points match up
    // And their velocity angles aren't too dissimilar, reduce the length of the lines and do a transition inline
    if (
      settings.optimisation.smoothInterlineTransitions &&
      isLine(previousMovement) &&
      isLine(movement) &&
      previousMovement.getEnd().distanceTo(movement.getStart()) < 1 &&
      previousMovement
        .getExpectedExitVelocity()
        .clone()
        .normalize()
        .angleTo(movement.getDesiredEntryVelocity().clone().normalize()) <
        MathUtils.degToRad(settings.optimisation.interLineTransitionAngle)
    ) {
      // Shrink the end of the previousLine
      // Shrink the start of the current line

      const previousLine = previousMovement as Line
      const currentLine = movement as Line

      previousLine.shrinkEndByDistance(
        settings.optimisation.interLineTransitionShaveDistance,
      )
      currentLine.shrinkStartByDistance(
        settings.optimisation.interLineTransitionShaveDistance,
      )

      const interLineTransition = new InterLineTransition(
        previousMovement,
        movement,
        movement.objectID, // Take the object ID of this movement, they're probably the same.
        new MixMaterial(previousMovement, movement),
      )

      interLineTransition.setMaxSpeed(settings.optimisation.transitionMaxSpeed)

      // Add the transition to the dense bag
      denseMovements.push(interLineTransition)

      // Add the movement to the dense bag
      denseMovements.push(movement)

      // Update the last movement
      previousMovement = movement
      continue
    }

    // Overrides any other behaviour
    if (settings.optimisation.disableShapedTransitions) {
      // Build our transition movement from the old movement to the new, just use a simple Line
      const transit = new Line(
        previousMovement.getEnd(),
        movement.getStart(),
        defaultTransitionMaterial,
        TRANSITION_OBJECT_ID,
      )
      transit.setMaxSpeed(settings.optimisation.transitionMaxSpeed)

      // Add the transition to the dense bag
      denseMovements.push(transit)

      // Add the movement to the dense bag
      denseMovements.push(movement)

      // Update the last movement
      previousMovement = movement
      continue
    }

    // Points are visited by catmulls if their duration is 0, and if we have available control points
    if (
      isPoint(previousMovement) &&
      isPoint(movement) &&
      movement.duration === 0 &&
      index >= 2 &&
      index < flattened.length - 1
    ) {
      const movementPrevPrev = flattened[index - 2]
      const movementPrev = previousMovement
      const movementCurrent = movement
      const movementNext = flattened[index + 1]

      // Build our transition movement from the old movement to the new
      const transition = new PointTransition(
        movementPrevPrev,
        movementPrev,
        movementCurrent,
        movementNext,
        defaultTransitionMaterial,
      )

      transition.setMaxSpeed(settings.optimisation.transitionMaxSpeed)

      // Add the transition to the dense bag
      denseMovements.push(transition)

      // Add the movement to the dense bag
      denseMovements.push(movement)

      // Update the last movement
      previousMovement = movement
      continue
    }

    if (settings.optimisation.lineRunUp > 0 && isLine(movement)) {
      const endPoint = movement.getStart()
      const backwardDirection = movement
        .getDesiredEntryVelocity()
        .normalize()
        .multiplyScalar(-1)
      const startPoint = backwardDirection
        .multiplyScalar(settings.optimisation.lineRunUp * movement.getLength())
        .add(endPoint)

      const runUp = new Line(
        startPoint,
        endPoint,
        defaultTransitionMaterial,
        TRANSITION_OBJECT_ID,
      )
      // Set the speed to the incoming line's speed, not the transition speed.
      runUp.setMaxSpeed(settings.optimisation.maxSpeed)

      // Build our transition movement from the old movement to the new
      const transition = new Transition(
        previousMovement,
        runUp,
        defaultTransitionMaterial,
      )
      transition.setMaxSpeed(settings.optimisation.transitionMaxSpeed)

      // Add the transition to the dense bag
      denseMovements.push(transition)

      // Add the run up
      denseMovements.push(runUp)

      // Add the movement to the dense bag
      denseMovements.push(movement)

      const startPointRunOut = movement.getEnd()
      const backwardDirectionRunOut = movement
        .getExpectedExitVelocity()
        .normalize()
      const endPointRunOut = backwardDirectionRunOut
        .multiplyScalar(settings.optimisation.lineRunUp * movement.getLength())
        .add(startPointRunOut)

      const runOut = new Line(
        startPointRunOut,
        endPointRunOut,
        defaultTransitionMaterial,
        TRANSITION_OBJECT_ID,
      )
      // Set the speed to the incoming line's speed, not the transition speed.
      runOut.setMaxSpeed(settings.optimisation.maxSpeed)

      denseMovements.push(runOut)

      // Update the last movement
      previousMovement = runOut

      continue
    }

    // Build our transition movement from the old movement to the new
    const transition = new Transition(
      previousMovement,
      movement,
      defaultTransitionMaterial,
    )
    transition.setMaxSpeed(settings.optimisation.transitionMaxSpeed)

    // Add the transition to the dense bag
    denseMovements.push(transition)

    // Add the movement to the dense bag
    denseMovements.push(movement)

    // Update the last movement
    previousMovement = movement
    continue
  }

  // Flattened the movements
  return denseMovements
}

export function getTotalDuration(denseMoves: DenseMovements) {
  // For now, use the total duration as the cost function
  let cost = 0

  for (let index = 0; index < denseMoves.length; index++) {
    const movement = denseMoves[index]
    cost += movement.getDuration()
  }

  return cost
}

/**
 * Take a sparse set of movements, calculate their total 'cost'
 */
export function sparseToCost(movements: Movement[]): number {
  let d2Total = 0

  for (let index = 1; index < movements.length; index++) {
    const movementP = movements[index - 1]
    const movement = movements[index]
    const d2 = movementP.getEnd().distanceTo(movement.getStart())

    d2Total += d2
  }

  // for (let index = 1; index < movements.length; index++) {
  //   const movementP = movements[index - 1]
  //   const movement = movements[index]
  //   const d2 = new Transition(movementP, movement, defaultTransitionMaterial)

  //   d2Total += d2.getLength()
  // }

  return d2Total
}

export function hashTour(
  movements: Movement[],
  createHasher: (seed?: number) => XXHash<number>,
) {
  const hasher = createHasher()

  for (let index = 0; index < movements.length; index++) {
    const movement = movements[index]
    hasher.update(movement.interFrameID)
  }

  return hasher.digest()
}

function applyOperations(
  ordering: Movement[],
  copyToAlternates: { signal: boolean },
  queue: Map<number, Movement[]>,
  enqueued: Set<number>,
  leftIndex: number,
  rightIndex: number,
  flipLeft: boolean,
  flipRight: boolean,
  swap: boolean,
  createHasher: (seed?: number) => XXHash<number>,
) {
  // Copy the ordering if we're copying this operation into the queue list
  const mutableOrdering = copyToAlternates.signal ? ordering.slice() : ordering

  if (flipLeft) {
    mutableOrdering[leftIndex].flip()
  }
  if (flipRight) {
    mutableOrdering[rightIndex].flip()
  }
  if (swap) {
    const temp = mutableOrdering[leftIndex]
    mutableOrdering[leftIndex] = mutableOrdering[rightIndex]
    mutableOrdering[rightIndex] = temp
  }

  if (copyToAlternates.signal) {
    const hash = hashTour(mutableOrdering, createHasher)

    // Only add this tour possibility if we haven't seen it before
    if (!enqueued.has(hash)) {
      enqueued.add(hash)
      queue.set(hash, mutableOrdering)
    }
  } else {
    // All subsequent operations should copy to alternates
    copyToAlternates.signal = true
  }
}

export function swap(array: any[], a: number, b: number) {
  const temp = array[a]
  array[a] = array[b]
  array[b] = temp
}

export interface OrderingCache {
  [id: string]: number
}

export interface Progress {
  duration: number
  text: string
  orderingCache: OrderingCache
  // Whether this is the final update of this run
  completed: boolean
  // Whether a minima was found
  minimaFound: boolean
  // How much wall time spent optimising
  timeSpent: number
  currentCost: number
  startingCost: number
}

export type Continue = boolean

function optimiseByCache(sparseBag: Movement[], orderingCache: OrderingCache) {
  const movements = sparseBag.slice() // Copy the ordering

  // Sort the movements according to the movement cache
  movements.sort((a, b) => {
    const aOrder = orderingCache[a.interFrameID] ?? 0
    const bOrder = orderingCache[b.interFrameID] ?? 0

    // Sort in ascending order
    return aOrder - bOrder
  })

  return movements
}

export function optimiseBySearch(sparseBag: Movement[]) {
  if (sparseBag.length < 2) {
    return sparseBag
  }

  const toOrder: Movement[] = sparseBag.slice() // Copy the array

  // Pick a random movement to start at, remove it from the array
  let previousMovement = toOrder.splice(
    0, // start at 0
    1, // grab one
  )[0] // splice returns an array of the deleted items, index 0 is our starting point
  const nnOrdering = [previousMovement]

  // Find the closest next movement, potentially flipping it
  while (toOrder.length > 0) {
    let closest: Movement = previousMovement
    let closestDistance = Infinity
    let closestIndex = 0

    for (let index = 0; index < toOrder.length; index++) {
      const movement = toOrder[index]

      // Check if the end of the next movement is closer
      let d = movement.getStart().distanceTo(previousMovement.getEnd())

      if (d < closestDistance) {
        closestDistance = d
        closest = movement
        closestIndex = index
      }

      // Try flipping it
      movement.flip()

      d = movement.getStart().distanceTo(previousMovement.getEnd())

      // If it is closer, leave it flipped
      if (d < closestDistance) {
        closestDistance = d
        closest = movement
        closestIndex = index
        continue
      }

      // Otherwise flip it back
      movement.flip()
    }

    // We've found the next closest, pop it off
    toOrder.splice(closestIndex, 1)

    // And add it to the nnOrdered array
    nnOrdering.push(closest)

    // Update the previousMovement
    previousMovement = closest
  }

  return nnOrdering
}

/**
 * Warning, has factorial time complexity.
 *
 * Takes 5s for 10 movements
 * Takes 15s for 11 movements
 * Takes 112s for 12 movements
 * Don't bother after 12.
 */
export function optimiseBruteForce(
  permutor: Permutor<Movement>,
  best: {
    tour: Movement[]
    hash: number
    cost: number
  },
  createHasher: (seed?: number) => XXHash<number>,
  timeLimit = 0,
) {
  const start = Date.now()

  let tourIndex = 0

  while (permutor.hasNext()) {
    const time = Date.now() - start

    // Check if the time limit has been exceeded
    if (timeLimit > 0 && time > timeLimit) {
      return { iterations: tourIndex + 1, completed: false, time: time }
    }

    tourIndex++

    const currentOrdering = permutor.next()
    const cost = sparseToCost(currentOrdering)

    // If this tour isn't better, check the next one
    if (cost > best.cost) {
      continue
    }

    if (cost < best.cost) {
      const hash = hashTour(currentOrdering, createHasher)

      // If we have a new best tour, set it
      best.tour = currentOrdering
      best.hash = hash
      best.cost = cost
    }
  }

  return {
    iterations: tourIndex + 1,
    completed: true,
    time: Date.now() - start,
  }
}

const n = false
const f = true

function d(
  first: Movement,
  firstFlipped: boolean,
  second: Movement,
  secondFlipped: boolean,
) {
  if (!firstFlipped && !secondFlipped) {
    return first.getEnd().distanceTo(second.getStart())
  } else if (firstFlipped && !secondFlipped) {
    return first.getStart().distanceTo(second.getStart())
  } else if (!firstFlipped && secondFlipped) {
    return first.getEnd().distanceTo(second.getEnd())
  } else if (firstFlipped && secondFlipped) {
    return first.getStart().distanceTo(second.getEnd())
  }

  throw new Error(`Unreachable`)
}

/**
 * Cannot be called with a tour below 4 moves!
 */
export function optimise2Opt(
  queue: Map<number, Movement[]>,
  enqueued: Set<number>,
  best: {
    tour: Movement[]
    hash: number
    cost: number
  },
  createHasher: (seed?: number) => XXHash<number>,
  timeLimit = 0,
) {
  const start = Date.now()

  let tourIndex = 0

  while (queue.size > 0) {
    tourIndex++

    let [hash, currentOrdering]: [number, Movement[]] = queue
      .entries()
      .next().value

    // Remove the candidate from the queue
    queue.delete(hash)

    // Iteratively improve upon the candidate tour

    let cost = sparseToCost(currentOrdering)

    // If this tour candidate is no longer on equal footing with the current best tour, bail immediately
    if (cost > best.cost) {
      continue
    }

    let improved = true

    while (improved) {
      improved = false

      const n = false
      const f = true

      for (let b = 1; b < currentOrdering.length - 2; b++) {
        const time = Date.now() - start
        // Check if the time limit has been exceeded
        if (timeLimit > 0 && time > timeLimit) {
          const hash = hashTour(currentOrdering, createHasher)

          // Add this tour back into the queue since we didn't get to finish it.
          if (!enqueued.has(hash)) {
            queue.set(hash, currentOrdering)
          }

          return { iterations: tourIndex + 1, completed: false, time: time }
        }

        for (let e = b + 1; e < currentOrdering.length - 1; e++) {
          let operation = ''

          let current = 0
          let flipB = 0
          let flipE = 0
          let flipBE = 0
          let swapBE = 0
          let flipBSwapBE = 0
          let flipESwapBE = 0
          let flipBESwapBE = 0

          // If they're next to each other, it's a special case
          if (e === b + 1) {
            const A = currentOrdering[b - 1]
            const B = currentOrdering[b]
            const C = currentOrdering[e]
            const D = currentOrdering[e + 1]

            current = d(A, n, B, n) + d(B, n, C, n) + d(C, n, D, n)
            flipB = d(A, n, B, f) + d(B, f, C, n) + d(C, n, D, n)
            flipE = d(A, n, B, n) + d(B, n, C, f) + d(C, f, D, n)
            flipBE = d(A, n, B, f) + d(B, f, C, f) + d(C, f, D, n)
            swapBE = d(A, n, C, n) + d(C, n, B, n) + d(B, n, D, n)
            flipBSwapBE = d(A, n, C, n) + d(C, n, B, f) + d(B, f, D, n)
            flipESwapBE = d(A, n, C, f) + d(C, f, B, n) + d(B, n, D, n)
            flipBESwapBE = d(A, n, C, f) + d(C, f, B, f) + d(B, f, D, n)
          } else {
            // The segments are not overlapping
            const A = currentOrdering[b - 1]
            const B = currentOrdering[b]
            const C = currentOrdering[b + 1]
            const D = currentOrdering[e - 1]
            const E = currentOrdering[e]
            const F = currentOrdering[e + 1]

            // Calculate the distances of the different segments, flipped or swapped
            current = d(A, n, B, n) + d(B, n, C, n) + d(D, n, E, n) + d(E, n, F, n) // prettier-ignore
            flipB = d(A, n, B, f) + d(B, f, C, n) + d(D, n, E, n) + d(E, n, F, n) // prettier-ignore
            flipE = d(A, n, B, n) + d(B, n, C, n) + d(D, n, E, f) + d(E, f, F, n) // prettier-ignore
            flipBE = d(A, n, B, f) + d(B, f, C, n) + d(D, n, E, f) + d(E, f, F, n) // prettier-ignore
            swapBE = d(A, n, E, n) + d(E, n, C, n) + d(D, n, B, n) + d(B, n, F, n) // prettier-ignore
            flipBSwapBE = d(A, n, E, n) + d(E, n, C, n) + d(D, n, B, f) + d(B, f, F, n) // prettier-ignore
            flipESwapBE = d(A, n, E, f) + d(E, f, C, n) + d(D, n, B, n) + d(B, n, F, n) // prettier-ignore
            flipBESwapBE = d(A, n, E, f) + d(E, f, C, n) + d(D, n, B, f) + d(B, f, F, n) // prettier-ignore
          }

          // Find the winner
          const smallest = Math.min(
            current,
            flipB,
            flipE,
            flipBE,
            swapBE,
            flipBSwapBE,
            flipESwapBE,
            flipBESwapBE,
          )

          // update the cost
          if (smallest !== current) {
            improved = true
            const delta = current - smallest
            cost = cost - delta

            const copyToAlternates = { signal: false }

            if (smallest === flipB) {
              applyOperations(currentOrdering, copyToAlternates, queue, enqueued, b, e, true, false, false, createHasher) // prettier-ignore
            }
            if (smallest === flipE) {
              applyOperations(currentOrdering, copyToAlternates, queue, enqueued, b, e, false, true, false, createHasher) // prettier-ignore
            }
            if (smallest === flipBE) {
              applyOperations(currentOrdering, copyToAlternates, queue, enqueued, b, e, true, true, false, createHasher) // prettier-ignore
            }
            if (smallest === swapBE) {
              applyOperations(currentOrdering, copyToAlternates, queue, enqueued, b, e, false, false, true, createHasher) // prettier-ignore
            }
            if (smallest === flipBSwapBE) {
              applyOperations(currentOrdering, copyToAlternates, queue, enqueued, b, e, true, false, true, createHasher) // prettier-ignore
            }
            if (smallest === flipESwapBE) {
              applyOperations(currentOrdering, copyToAlternates, queue, enqueued, b, e, false, true, true, createHasher) // prettier-ignore
            }
            if (smallest === flipBESwapBE) {
              applyOperations(currentOrdering, copyToAlternates, queue, enqueued, b, e, true, true, true, createHasher) // prettier-ignore
            }
          }
        }
      }

      // Final optimisation passes to rotate the tour
      {
        // Test for all rotations, removing the longest link if possible
        let longestLinkIndex = 0
        let longestLinkDistance = 0

        for (let index = 0; index < currentOrdering.length; index++) {
          const prev = currentOrdering[index]
          const current = currentOrdering[(index + 1) % currentOrdering.length]
          const distance = prev.getEnd().distanceTo(current.getStart())

          if (distance > longestLinkDistance) {
            longestLinkIndex = index
            longestLinkDistance = distance
          }
        }

        if (longestLinkIndex !== currentOrdering.length - 1) {
          const left = currentOrdering.slice(0, longestLinkIndex + 1)
          const right = currentOrdering.slice(longestLinkIndex + 1)

          // Reorder the arrays to remove the longest link
          currentOrdering = right.concat(left)
          const newLink = right[right.length - 1]
            .getEnd()
            .distanceTo(left[0].getStart())
          cost = cost - longestLinkDistance + newLink
        }
      }
      // The main iteration loop can't flip or swap the ends, so do that up here
      {
        // Test flipping the start
        const A = currentOrdering[0]
        const B = currentOrdering[1]

        const dAnB = A.getEnd().distanceTo(B.getStart())
        const dAfB = A.getStart().distanceTo(B.getStart())

        if (dAfB < dAnB) {
          A.flip()
          console.log(`flipping start`)

          const delta = dAnB - dAfB

          cost = cost - delta
          improved = true
        }
      }
      {
        // Test flipping the end
        const E = currentOrdering[currentOrdering.length - 2]
        const F = currentOrdering[currentOrdering.length - 1]

        const dEFn = E.getEnd().distanceTo(F.getStart())
        const dEFf = E.getEnd().distanceTo(F.getEnd())

        if (dEFf < dEFn) {
          F.flip()
          console.log(`flipping end`)

          const delta = dEFn - dEFf

          cost = cost - delta
          improved = true
        }
      }
      {
        // TODO: Test a flip
      }
    }

    if (cost < best.cost) {
      // If we have a new best tour, set it
      best.tour = currentOrdering
      best.hash = hash
      best.cost = cost
    }
  }

  return {
    iterations: tourIndex + 1,
    completed: true,
    time: Date.now() - start,
  }
}

/**
 * Reorders and flips the members of a sparse bag of movements, optimising for the fastest tour.
 *
 * Async so we can interrupt the event queue to check for pausing, otherwise it'll just run.
 */
export async function optimise(
  sparseBag: Movement[],
  partialUpdate: boolean,
  settings: Settings,
  updateProgress: (progress: Progress) => Promise<Continue>,
  orderingCache: OrderingCache | null = null,
) {
  const startedOptimisation = Date.now()

  // Setup our ordering cache
  const nextOrderingCache: OrderingCache = {}

  const populateOrderingCache = (movements: Movement[]) => {
    // Store the final order for passing to the next frame
    for (let index = 0; index < movements.length; index++) {
      const movement = movements[index]
      nextOrderingCache[movement.interFrameID] = index
    }

    return nextOrderingCache
  }

  const startingCost = sparseToCost(sparseBag)

  // Partial updates just run a beam search

  if (partialUpdate) {
    const beamSearched = optimiseBySearch(sparseBag)

    const currentDense = sparseToDense(beamSearched, settings)
    const curentDuration = getTotalDuration(currentDense)

    // Final status update
    await updateProgress({
      duration: getTotalDuration(currentDense),
      text: `Optimised to ${Math.round(curentDuration * 100) / 100}ms`,
      orderingCache: populateOrderingCache(beamSearched),
      completed: true,
      minimaFound: false,
      timeSpent: Date.now() - startedOptimisation,
      startingCost,
      currentCost: sparseToCost(sparseBag),
    })

    return
  }

  const { create32: createHasher } = await xxhash()

  let movements = optimiseBySearch(sparseBag)

  const best = {
    tour: movements,
    hash: hashTour(movements, createHasher),
    cost: sparseToCost(movements),
  }

  const OPTIMISATION_TIME = 5000

  let iterations = 0

  // If we have less than 12 movements (probably 15s), do a brute force solve
  if (movements.length < 12) {
    const permutor = new Permutor(movements)

    while (true) {
      // Do 5 seconds of optimisation at a time, then check in to see if we should cancel
      const nextPass = optimiseBruteForce(
        permutor,
        best,
        createHasher,
        OPTIMISATION_TIME,
      )

      iterations += nextPass.iterations

      const currentDense = sparseToDense(best.tour, settings)
      const currentDuration = getTotalDuration(currentDense)

      // Finish within the time it takes to _do_ the frame no matter what
      let done =
        nextPass.completed || Date.now() - startedOptimisation > currentDuration

      const shouldContinue = await updateProgress({
        duration: getTotalDuration(currentDense),
        text: `Optimised to ${Math.round(currentDuration * 100) / 100}ms`,
        orderingCache: populateOrderingCache(best.tour),
        completed: done,
        minimaFound: done,
        timeSpent: Date.now() - startedOptimisation,
        startingCost,
        currentCost: sparseToCost(sparseBag),
      })

      // console.log(
      //   `iterations: ${iterations}, currentDuration: ${currentDuration}, time: ${
      //     (Date.now() - startedOptimisation) / 1000
      //   }s`,
      // )

      // If we've reached a minima, or should stop, or we've taken longer than the length of the tour to optimise, exit
      if (done || !shouldContinue) {
        return
      }
    }
  }

  // The alternate candidates list
  const queue: Map<number, Movement[]> = new Map()
  const enqueued: Set<number> = new Set()

  // Add the initial tour
  queue.set(best.hash, best.tour)
  enqueued.add(best.hash)

  // Otherwise do a 2opt
  while (true) {
    // Do 5 seconds of optimisation at a time, then check in to see if we should cancel
    const nextPass = optimise2Opt(
      queue,
      enqueued,
      best,
      createHasher,
      OPTIMISATION_TIME,
    )

    iterations += nextPass.iterations

    const currentDense = sparseToDense(best.tour, settings)
    const currentDuration = getTotalDuration(currentDense)

    // Finish within the time it takes to _do_ the frame no matter what
    let done =
      nextPass.completed || Date.now() - startedOptimisation > currentDuration

    const shouldContinue = await updateProgress({
      duration: getTotalDuration(currentDense),
      text: `Optimised to ${Math.round(currentDuration * 100) / 100}ms`,
      orderingCache: populateOrderingCache(best.tour),
      completed: done,
      minimaFound: done,
      timeSpent: Date.now() - startedOptimisation,
      startingCost,
      currentCost: sparseToCost(sparseBag),
    })

    // console.log(
    //   `iterations: ${iterations}, currentDuration: ${currentDuration}, time: ${
    //     (Date.now() - startedOptimisation) / 1000
    //   }s`,
    // )

    // If we've reached a minima, or should stop, or we've taken longer than the length of the tour to optimise, exit
    if (done || !shouldContinue) {
      return
    }
  }
}
