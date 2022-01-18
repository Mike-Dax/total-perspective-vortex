import { Movement, Point, Line } from '../src/optimiser/movements'
import { optimise2Opt, sparseToCost, swap } from '../src/optimiser/passes'
import { Vector3 } from 'three'
import { defaultTransitionMaterial } from '../src/optimiser/material'

describe('Points', () => {
  it(`the distance between points is symmetric`, () => {
    const A = new Point(new Vector3(0, 0, 0), 0, defaultTransitionMaterial, `A`)
    const B = new Point(new Vector3(4, 0, 0), 0, defaultTransitionMaterial, `B`)

    const distanceAB = A.getEnd().distanceTo(B.getStart())
    const distanceBA = B.getEnd().distanceTo(A.getStart())

    expect(distanceAB).toBe(distanceBA)
  })
})

describe('Lines', () => {
  it(`the distance between lines is correct`, () => {
    const A = new Line(
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      defaultTransitionMaterial,
      `A`,
    )
    const B = new Line(
      new Vector3(1, 0, 0),
      new Vector3(2, 0, 0),
      defaultTransitionMaterial,
      `B`,
    )

    const distanceAB = A.getEnd().distanceTo(B.getStart())
    const distanceBA = B.getEnd().distanceTo(A.getStart())

    expect(distanceAB).toBe(0)
    expect(distanceBA).toBe(2)
  })
  it(`the distance between flipped lines is correct`, () => {
    const A = new Line(
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      defaultTransitionMaterial,
      `A`,
    )
    const B = new Line(
      new Vector3(1, 0, 0),
      new Vector3(2, 0, 0),
      defaultTransitionMaterial,
      `B`,
    )

    const distanceAB = A.getEnd().distanceTo(B.getStart())

    A.flip()
    B.flip()

    const distanceBA = B.getEnd().distanceTo(A.getStart())

    expect(distanceAB).toBe(0)
    expect(distanceBA).toBe(0)
  })
})
