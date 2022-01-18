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

const ordering = [
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
  //   new Line(
  //     new Vector3(7, 0, 0),
  //     new Vector3(8, 0, 0),
  //     defaultTransitionMaterial,
  //     `H`
  //   ),
  //   new Line(
  //     new Vector3(6, 0, 0),
  //     new Vector3(5, 0, 0),
  //     defaultTransitionMaterial,
  //     `F`
  //   ),
  //   new Line(
  //     new Vector3(8, 0, 0),
  //     new Vector3(9, 0, 0),
  //     defaultTransitionMaterial,
  //     `I`
  //   ),
  //   new Line(
  //     new Vector3(6, 0, 0),
  //     new Vector3(7, 0, 0),
  //     defaultTransitionMaterial,
  //     `G`
  //   ),
]

let cost = sparseToCost(ordering)
console.log(`ordering at start = ${orderingToString(ordering, cost)}`)

let improved = true

while (improved) {
  improved = false

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
    // TODO: Test a left rotation
  }
  {
    // TODO: Test a right rotation
  }
  {
    // TODO: Test a flip
  }

  iteration: for (let i = 1; i < ordering.length - 2; i++) {
    for (let j = i + 1; j < ordering.length - 1; j++) {
      const A = ordering[i - 1]
      const B = ordering[i]
      const C = ordering[i + 1]
      const D = ordering[j - 1]
      const E = ordering[j]
      const F = ordering[j + 1]

      let operation = ''

      // Calculate the distances of the different segments, flipped or swapped
      const dABnC = A.getEnd().distanceTo(B.getStart()) + B.getEnd().distanceTo(C.getStart()) // prettier-ignore
      const dDEnF = D.getEnd().distanceTo(E.getStart()) + E.getEnd().distanceTo(F.getStart()) // prettier-ignore

      const dAEnC = A.getEnd().distanceTo(E.getStart()) + E.getEnd().distanceTo(C.getStart()) // prettier-ignore
      const dDBnF = D.getEnd().distanceTo(B.getStart()) + B.getEnd().distanceTo(F.getStart()) // prettier-ignore

      const dABfC = A.getEnd().distanceTo(B.getEnd()) + B.getStart().distanceTo(C.getStart()) // prettier-ignore
      const dDEfF = D.getEnd().distanceTo(E.getEnd()) + E.getStart().distanceTo(F.getStart()) // prettier-ignore

      const dAEfC = A.getEnd().distanceTo(E.getEnd()) + E.getStart().distanceTo(C.getStart()) // prettier-ignore
      const dDBfF = D.getEnd().distanceTo(B.getEnd()) + B.getStart().distanceTo(F.getStart()) // prettier-ignore

      // Calculate cost deltas TOOD: These are wrong

      const current = dABnC + dDEnF //       A->Bn->C    D->En->F
      const flipI = dABfC + dDEnF //         A->Bf->C    D->En->F
      const flipJ = dABnC + dDEfF //         A->Bn->C    D->Ef->F
      const flipIJ = dABfC + dDEfF //        A->Bf->C    D->Ef->F
      const swappedIJ = dAEnC + dDBnF //     A->En->C    D->Bn->F
      const flipISwapIJ = dAEnC + dDBfF //   A->En->C    D->Bf->F
      const flipJSwapIJ = dAEfC + dDBnF //   A->Ef->C    D->Bn->F
      const flipIJSwapIJ = dAEfC + dDBfF //  A->Ef->C    D->Bf->F

      // Find the winner
      const smallest = Math.min(
        current,
        flipI,
        flipJ,
        flipIJ,
        swappedIJ,
        flipISwapIJ,
        flipJSwapIJ,
        flipIJSwapIJ,
      )
      // update the cost

      const delta = current - smallest
      cost = cost - delta

      // Do the operations of the winner
      if (smallest === current) {
        // No improvement
        operation += 'n'
      } else if (smallest === flipI) {
        ordering[i].flip()
        improved = true
        operation += `f${ordering[i].objectID}`
      } else if (smallest === flipJ) {
        ordering[j].flip()
        improved = true
        operation += `f${ordering[j].objectID}`
      } else if (smallest === flipIJ) {
        ordering[i].flip()
        ordering[j].flip()
        improved = true
        operation += `f${ordering[i].objectID}${ordering[j].objectID}`
      } else if (smallest === swappedIJ) {
        swap(ordering, i, j)
        improved = true
        operation += `s${ordering[i].objectID}${ordering[j].objectID}`
      } else if (smallest === flipISwapIJ) {
        ordering[i].flip()
        swap(ordering, i, j)
        improved = true
        operation += `f${ordering[i].objectID}s${ordering[i].objectID}${ordering[j].objectID}`
      } else if (smallest === flipJSwapIJ) {
        ordering[j].flip()
        swap(ordering, i, j)
        improved = true
        operation += `f${ordering[j].objectID}s${ordering[i].objectID}${ordering[j].objectID}`
      } else if (smallest === flipIJSwapIJ) {
        ordering[i].flip()
        ordering[j].flip()
        swap(ordering, i, j)
        improved = true
        operation += `f${ordering[i].objectID}${ordering[j].objectID}s${ordering[i].objectID}${ordering[j].objectID}`
      }

      console.log(
        `ordering at iteration ${i},${j}, ${operation} -> ${orderingToString(
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

// D(4->3), B(3->2), E(4->5), C(2->1), A(1->0) = 5
// D(4->3), E(4->5), B(3->2), C(2->1), A(1->0) = 3
