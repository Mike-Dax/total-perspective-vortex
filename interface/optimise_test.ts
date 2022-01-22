import { Movement, Point, Line } from './src/optimiser/movements'
import { optimise2Opt, sparseToCost, hashTour } from './src/optimiser/passes'
import { Vector3 } from 'three'
import { defaultTransitionMaterial } from './src/optimiser/material'
import { importFolder } from './src/optimiser/files'
import { defaultSettings } from './src/interface/state'
import { Settings } from './src/optimiser/settings'
import { Renderable } from './src/optimiser/import'
import xxhash, { XXHash } from 'xxhash-wasm'

function orderingToString(ordering: Movement[]) {
  // return `${-delta}: ${cost} (${sparseToCost(ordering)})`

  return `${ordering.map(movement => `${movement.interFrameID}`).join(', ')}`
}

function shuffle(array: any[]) {
  let currentIndex = array.length,
    randomIndex

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ]
  }

  return array
}

import { Permutor } from './src/optimiser/permutor'

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

    if (tourIndex % 100_000 === 0) {
      console.log(
        `${
          Math.round(
            (permutor.getIterations() / permutor.getTotal()) * 100 * 10,
          ) / 10
        }% : ${best.hash.toString(16)} cost ${best.cost}`,
      )
    }

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

async function main() {
  const { create32: createHasher } = await xxhash()

  const movements: Movement[] = []

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      const z = 0
      const movement = new Point(
        new Vector3(x, y, z),
        10,
        defaultTransitionMaterial,
        ``,
      )
      movement.interFrameID = `(${x},${y}, ${z})`

      movements.push(movement)
    }
  }
  {
    const [x, y, z] = [0, 0, 1]
    const movement = new Point(
      new Vector3(x, y, z),
      10,
      defaultTransitionMaterial,
      ``,
    )
    movement.interFrameID = `(${x},${y}, ${z})`

    movements.push(movement)
  }
  {
    const [x, y, z] = [0, 0, 2]
    const movement = new Point(
      new Vector3(x, y, z),
      10,
      defaultTransitionMaterial,
      ``,
    )
    movement.interFrameID = `(${x},${y}, ${z})`

    movements.push(movement)
  }

  const best = {
    tour: movements,
    hash: hashTour(movements, createHasher),
    cost: sparseToCost(movements),
  }

  console.log(
    `${best.hash.toString(16)}: starting with cost ${best.cost}, ${
      movements.length
    } movements`,
  )
  if (true) {
    const permutor = new Permutor(movements)

    for (let index = 0; index < 10; index++) {
      let res = optimiseBruteForce(permutor, best, createHasher, 2000)
      console.log(
        `${best.hash.toString(16)}: won after ${
          res.iterations
        } tour starts considered with cost ${best.cost}`,
      )
    }
  } else {
    // The alternate candidates list
    const queue: Map<number, Movement[]> = new Map()
    const enqueued: Set<number> = new Set()

    // Add the initial tour
    queue.set(best.hash, best.tour)
    enqueued.add(best.hash)

    const res = optimise2Opt(queue, enqueued, best, createHasher)

    console.log(
      `${best.hash.toString(16)}: won after ${
        res.iterations
      } tour starts considered with cost ${best.cost}`,
    )
  }
}

main()
