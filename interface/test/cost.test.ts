import { Movement, Point, Line } from '../src/optimiser/movements'
import { optimise2Opt, sparseToCost, swap } from '../src/optimiser/passes'
import { Vector3 } from 'three'
import { defaultTransitionMaterial } from '../src/optimiser/material'

function orderingToString(ordering: Movement[], cost: number) {
  return `${ordering
    .map(
      movement =>
        `${movement.objectID}(${movement.getStart().x}->${
          movement.getEnd().x
        })`,
    )
    .join(', ')} = ${cost}`
}

describe('Cost function', () => {
  it(`can cost a tour`, () => {
    const movements = [
      new Point(new Vector3(0, 0, 0), 0, defaultTransitionMaterial, `A`),
      new Point(new Vector3(4, 0, 0), 0, defaultTransitionMaterial, `B`),
      new Point(new Vector3(2, 0, 0), 0, defaultTransitionMaterial, `B`),
    ]

    const cost = sparseToCost(movements)

    expect(cost).toBe(6)
  })
  it(`can cost a tour when something is swapped`, () => {
    const movements = [
      new Point(new Vector3(0, 0, 0), 0, defaultTransitionMaterial, `A`),
      new Point(new Vector3(3, 0, 0), 0, defaultTransitionMaterial, `B`),
      new Point(new Vector3(2, 0, 0), 0, defaultTransitionMaterial, `B`),
      new Point(new Vector3(1, 0, 0), 0, defaultTransitionMaterial, `B`),
      new Point(new Vector3(4, 0, 0), 0, defaultTransitionMaterial, `B`),
    ]

    let cost = sparseToCost(movements)
    expect(cost).toBe(8)

    swap(movements, 1, 3)

    cost = sparseToCost(movements)

    expect(cost).toBe(4)
  })
  it(`can find an optimal point tour`, () => {
    const movements = [
      new Point(new Vector3(0, 0, 0), 0, defaultTransitionMaterial, `A`),
      new Point(new Vector3(3, 0, 0), 0, defaultTransitionMaterial, `B`),
      new Point(new Vector3(1, 0, 0), 0, defaultTransitionMaterial, `B`),
      new Point(new Vector3(2, 0, 0), 0, defaultTransitionMaterial, `B`),
      new Point(new Vector3(4, 0, 0), 0, defaultTransitionMaterial, `B`),
    ]

    const optimised = optimise2Opt(movements, 4000)

    const cost = sparseToCost(optimised.ordering)

    expect(cost).toBe(4)
  })

  it(`can find an optimal line tour`, () => {
    const ordering = [
      new Line(
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0),
        defaultTransitionMaterial,
        `A`,
      ),
      new Line(
        new Vector3(3, 0, 0),
        new Vector3(2, 0, 0),
        defaultTransitionMaterial,
        `B`,
      ),
      new Line(
        new Vector3(2, 0, 0),
        new Vector3(1, 0, 0),
        defaultTransitionMaterial,
        `C`,
      ),
      new Line(
        new Vector3(4, 0, 0),
        new Vector3(3, 0, 0),
        defaultTransitionMaterial,
        `D`,
      ),
      new Line(
        new Vector3(4, 0, 0),
        new Vector3(5, 0, 0),
        defaultTransitionMaterial,
        `E`,
      ),
      new Line(
        new Vector3(6, 0, 0),
        new Vector3(5, 0, 0),
        defaultTransitionMaterial,
        `F`,
      ),
    ]

    let cost = sparseToCost(ordering)
    console.log(`ordering at start = ${orderingToString(ordering, cost)}`)

    let improved = true

    while (improved) {
      improved = false

      iteration: for (let i = 1; i < ordering.length - 1; i++) {
        for (let j = i + 1; j < ordering.length; j++) {
          const A = ordering[(i - 1) % ordering.length]
          const B = ordering[i]
          const C = ordering[i + 1]
          const D = ordering[j - 1]
          const E = ordering[j]
          const F = ordering[(j + 1) % ordering.length]

          // Calculate the distances of the different segments, flipped or swapped
          const dABnC = A.getEnd().distanceTo(B.getStart()) + B.getEnd().distanceTo(C.getStart()) // prettier-ignore
          const dDEnF = D.getEnd().distanceTo(E.getStart()) + E.getEnd().distanceTo(F.getStart()) // prettier-ignore

          const dAEnC = A.getEnd().distanceTo(E.getStart()) + E.getEnd().distanceTo(C.getStart()) // prettier-ignore
          const dDBnF = D.getEnd().distanceTo(B.getStart()) + B.getEnd().distanceTo(F.getStart()) // prettier-ignore

          const dABfC = A.getEnd().distanceTo(B.getEnd()) + B.getStart().distanceTo(C.getStart()) // prettier-ignore
          const dDEfF = D.getEnd().distanceTo(E.getEnd()) + E.getStart().distanceTo(F.getStart()) // prettier-ignore

          const dAEfC = A.getEnd().distanceTo(E.getEnd()) + E.getStart().distanceTo(C.getStart()) // prettier-ignore
          const dDBfF = D.getEnd().distanceTo(B.getEnd()) + B.getStart().distanceTo(F.getStart()) // prettier-ignore

          // Calculate cost deltas
          const current = dABnC + dDEnF
          const flipI = dABfC + dDEnF
          const flipJ = dABnC + dDEfF
          const flipIJ = dABfC + dDEfF
          const swappedIJ = dAEnC + dDBnF
          const flipISwapIJ = dAEnC + dDBfF
          const flipJSwapIJ = dAEfC + dDBnF
          const flipIJSwapIJ = dAEfC + dDBfF

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

          // Do the operations of the winner
          if (smallest === current) {
            // No improvement
          } else if (smallest === flipI) {
            ordering[i].flip()
            cost = cost - current + flipI
            improved = true
          } else if (smallest === flipJ) {
            ordering[j].flip()
            cost = cost - current + flipJ
            improved = true
          } else if (smallest === flipIJ) {
            ordering[i].flip()
            ordering[j].flip()
            cost = cost - current + flipIJ
            improved = true
          } else if (smallest === swappedIJ) {
            swap(ordering, i, j)
            cost = cost - current + swappedIJ
            improved = true
          } else if (smallest === flipISwapIJ) {
            ordering[i].flip()
            swap(ordering, i, j)
            cost = cost - current + flipISwapIJ
            improved = true
          } else if (smallest === flipJSwapIJ) {
            ordering[j].flip()
            swap(ordering, i, j)
            cost = cost - current + flipJSwapIJ
            improved = true
          } else if (smallest === flipIJSwapIJ) {
            ordering[i].flip()
            ordering[j].flip()
            swap(ordering, i, j)
            cost = cost - current + flipIJSwapIJ
            improved = true
          }

          console.log(
            `ordering at iteration ${i},${j} = ${orderingToString(
              ordering,
              cost,
            )}`,
          )

          if (cost + smallest - current < 0) {
            throw new Error('uh')
          }
        }
      }
    }
  })
})
