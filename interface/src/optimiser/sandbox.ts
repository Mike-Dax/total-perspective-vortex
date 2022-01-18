import { Vector3 } from 'three'
import { defaultTransitionMaterial } from './material'
import { Point } from './movements'
import { optimise2Opt } from './passes'

const movements = [
  new Point(new Vector3(0, 0, 0), 100, defaultTransitionMaterial, `A`),
  new Point(new Vector3(1, 0, 0), 100, defaultTransitionMaterial, `A`),
  new Point(new Vector3(2, 0, 0), 100, defaultTransitionMaterial, `A`),
  new Point(new Vector3(3, 0, 0), 100, defaultTransitionMaterial, `A`),
  new Point(new Vector3(4, 0, 0), 100, defaultTransitionMaterial, `A`),
]

const optimised = optimise2Opt(movements)

console.log(optimised)
