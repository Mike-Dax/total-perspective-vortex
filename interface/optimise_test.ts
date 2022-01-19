import { Movement, Point, Line } from './src/optimiser/movements'
import { optimise2Opt, sparseToCost, swap } from './src/optimiser/passes'
import { Vector3 } from 'three'
import { defaultTransitionMaterial } from './src/optimiser/material'

function orderingToString(ordering: Movement[], cost: number, delta = 0) {
  return `${-delta}: ${ordering
    .map(
      movement =>
        `${movement.objectID}(${movement.getStart().x}->${
          movement.getEnd().x
        })`,
    )
    .join(', ')} = ${cost} (${sparseToCost(ordering)})`
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

const movements = [
  new Line(
    new Vector3(4, 0, 0),
    new Vector3(3, 0, 0),
    defaultTransitionMaterial,
    `D`,
  ),
  new Line(
    new Vector3(3, 0, 0),
    new Vector3(2, 0, 0),
    defaultTransitionMaterial,
    `B`,
  ),
  new Line(
    new Vector3(4, 0, 0),
    new Vector3(5, 0, 0),
    defaultTransitionMaterial,
    `E`,
  ),
  new Line(
    new Vector3(2, 0, 0),
    new Vector3(1, 0, 0),
    defaultTransitionMaterial,
    `C`,
  ),
  new Line(
    new Vector3(1, 0, 0),
    new Vector3(0, 0, 0),
    defaultTransitionMaterial,
    `A`,
  ),
  new Line(
    new Vector3(7, 0, 0),
    new Vector3(8, 0, 0),
    defaultTransitionMaterial,
    `H`,
  ),
  new Line(
    new Vector3(6, 0, 0),
    new Vector3(5, 0, 0),
    defaultTransitionMaterial,
    `F`,
  ),
  new Line(
    new Vector3(8, 0, 0),
    new Vector3(9, 0, 0),
    defaultTransitionMaterial,
    `I`,
  ),
  new Line(
    new Vector3(6, 0, 0),
    new Vector3(7, 0, 0),
    defaultTransitionMaterial,
    `G`,
  ),
]

// assert there's a least 4 elements

const ordering = optimiseBySearch(movements)

let cost = sparseToCost(ordering)
console.log(`ordering at start = ${orderingToString(ordering, cost)}`)

let improved = true

while (improved) {
  improved = false

  const n = false
  const f = true

  // The main iteration loop can't flip or swap the ends, so do that up here
  {
    // Test flipping the start
    const A = ordering[0]
    const B = ordering[1]

    const dAnB = A.getEnd().distanceTo(B.getStart())
    const dAfB = A.getStart().distanceTo(B.getEnd())

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
    const E = ordering[ordering.length - 2]
    const F = ordering[ordering.length - 1]

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
    // Test a left rotation
    const A = ordering[0]
    const B = ordering[1]
    const C = ordering[ordering.length - 2]
    const D = ordering[ordering.length - 1]

    // A B ... C D
    // B ... C D A
    // destroys the AB link, adds the DA link

    const dAnBn = d(A, n, B, n)
    const dDnAn = d(D, n, A, n)

    if (dDnAn < dAnBn) {
      ordering.push(ordering.shift()!)
      console.log(`rotating left`)

      const delta = dAnBn - dDnAn

      cost = cost - delta
      improved = true
    }
  }
  {
    // Test a right rotation
    const A = ordering[0]
    const B = ordering[1]
    const C = ordering[ordering.length - 2]
    const D = ordering[ordering.length - 1]

    // A B ... C D
    // D A B ... C
    // destroys the CD link, adds the DA link

    const dCnDn = d(C, n, D, n)
    const dDnAn = d(D, n, A, n)

    if (dDnAn < dCnDn) {
      ordering.unshift(ordering.pop()!)
      console.log(`rotating right`)

      const delta = dCnDn - dDnAn

      cost = cost - delta
      improved = true
    }
  }
  {
    // TODO: Test a flip
  }
  iteration: for (let b = 1; b < ordering.length - 2; b++) {
    for (let e = b + 1; e < ordering.length - 1; e++) {
      let operation = ''

      // If they're next to each other, it's a special case
      if (e === b + 1) {
        const A = ordering[b - 1]
        const B = ordering[b]
        const C = ordering[e]
        const D = ordering[e + 1]

        const current = d(A, n, B, n) + d(B, n, C, n) + d(C, n, D, n)
        const flipB = d(A, n, B, f) + d(B, f, C, n) + d(C, n, D, n)
        const flipC = d(A, n, B, n) + d(B, n, C, f) + d(C, f, D, n)
        const flipBC = d(A, n, B, f) + d(B, f, C, f) + d(C, f, D, n)
        const swapBC = d(A, n, C, n) + d(C, n, B, n) + d(B, n, D, n)
        const flipBSwapBC = d(A, n, C, n) + d(C, n, B, f) + d(B, f, D, n)
        const flipCSwapBC = d(A, n, C, f) + d(C, f, B, n) + d(B, n, D, n)
        const flipBCSwapBC = d(A, n, C, f) + d(C, f, B, f) + d(B, f, D, n)

        // Find the winner
        const smallest = Math.min(
          current,
          flipB,
          flipC,
          flipBC,
          swapBC,
          flipBSwapBC,
          flipCSwapBC,
          flipBCSwapBC,
        )

        // update the cost
        const delta = current - smallest
        cost = cost - delta

        // Do the operations of the winner

        if (smallest === current) {
          // No improvement
          operation += 'n'
        } else if (smallest === flipB) {
          ordering[b].flip()
          improved = true
          operation += `f${ordering[b].objectID}`
        } else if (smallest === flipC) {
          ordering[e].flip()
          improved = true
          operation += `f${ordering[e].objectID}`
        } else if (smallest === flipBC) {
          ordering[b].flip()
          ordering[e].flip()
          improved = true
          operation += `f${ordering[b].objectID}${ordering[e].objectID}`
        } else if (smallest === swapBC) {
          swap(ordering, b, e)
          improved = true
          operation += `s${ordering[b].objectID}${ordering[e].objectID}`
        } else if (smallest === flipBSwapBC) {
          ordering[b].flip()
          swap(ordering, b, e)
          improved = true
          operation += `f${ordering[b].objectID}s${ordering[b].objectID}${ordering[e].objectID}`
        } else if (smallest === flipCSwapBC) {
          ordering[e].flip()
          swap(ordering, b, e)
          improved = true
          operation += `f${ordering[e].objectID}s${ordering[b].objectID}${ordering[e].objectID}`
        } else if (smallest === flipBCSwapBC) {
          ordering[b].flip()
          ordering[e].flip()
          swap(ordering, b, e)
          improved = true
          operation += `f${ordering[b].objectID}${ordering[e].objectID}s${ordering[b].objectID}${ordering[e].objectID}`
        }

        console.log(
          `ordering at iteration ${b},${e}, ${operation} -> ${orderingToString(
            ordering,
            cost,
            delta,
          )}`,
        )

        continue
      }

      // The segments are not overlapping
      const A = ordering[b - 1]
      const B = ordering[b]
      const C = ordering[b + 1]
      const D = ordering[e - 1]
      const E = ordering[e]
      const F = ordering[e + 1]

      // Calculate the distances of the different segments, flipped or swapped
      const current = d(A, n, B, n) + d(B, n, C, n) + d(D, n, E, n) + d(E, n, F, n) // prettier-ignore
      const flipB = d(A, n, B, f) + d(B, f, C, n) + d(D, n, E, n) + d(E, n, F, n) // prettier-ignore
      const flipE = d(A, n, B, n) + d(B, n, C, n) + d(D, n, E, f) + d(E, f, F, n) // prettier-ignore
      const flipBE = d(A, n, B, f) + d(B, f, C, n) + d(D, n, E, f) + d(E, f, F, n) // prettier-ignore
      const swapBE = d(A, n, E, n) + d(E, n, C, n) + d(D, n, B, n) + d(B, n, F, n) // prettier-ignore
      const flipBSwapBE = d(A, n, E, n) + d(E, n, C, n) + d(D, n, B, f) + d(B, f, F, n) // prettier-ignore
      const flipESwapBE = d(A, n, E, f) + d(E, f, C, n) + d(D, n, B, n) + d(B, n, F, n) // prettier-ignore
      const flipBESwapBE = d(A, n, E, f) + d(E, f, C, n) + d(D, n, B, f) + d(B, f, F, n) // prettier-ignore

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
      const delta = current - smallest
      cost = cost - delta

      // Do the operations of the winner
      if (smallest === current) {
        // No improvement
        operation += 'n'
      } else if (smallest === flipB) {
        ordering[b].flip()
        improved = true
        operation += `f${ordering[b].objectID}`
      } else if (smallest === flipE) {
        ordering[e].flip()
        improved = true
        operation += `f${ordering[e].objectID}`
      } else if (smallest === flipBE) {
        ordering[b].flip()
        ordering[e].flip()
        improved = true
        operation += `f${ordering[b].objectID}${ordering[e].objectID}`
      } else if (smallest === swapBE) {
        swap(ordering, b, e)
        improved = true
        operation += `s${ordering[b].objectID}${ordering[e].objectID}`
      } else if (smallest === flipBSwapBE) {
        ordering[b].flip()
        swap(ordering, b, e)
        improved = true
        operation += `f${ordering[b].objectID}s${ordering[b].objectID}${ordering[e].objectID}`
      } else if (smallest === flipESwapBE) {
        ordering[e].flip()
        swap(ordering, b, e)
        improved = true
        operation += `f${ordering[e].objectID}s${ordering[b].objectID}${ordering[e].objectID}`
      } else if (smallest === flipBESwapBE) {
        ordering[b].flip()
        ordering[e].flip()
        swap(ordering, b, e)
        improved = true
        operation += `f${ordering[b].objectID}${ordering[e].objectID}s${ordering[b].objectID}${ordering[e].objectID}`
      }

      console.log(
        `ordering at iteration ${b},${e}, ${operation} -> ${orderingToString(
          ordering,
          cost,
          delta,
        )}`,
      )

      if (cost < 0) {
        debugger
      }
    }
  }
}

console.log(`ordering at completion = ${orderingToString(ordering, cost)}`)

// D(4->3), B(3->2), E(4->5), C(2->1), A(1->0) =2+3=5
// D(4->3), E(4->5), B(3->2), C(2->1), A(1->0) =1+2=3
