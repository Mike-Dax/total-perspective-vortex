import { MathUtils, Vector3 } from 'three'
import { VisualisationSettings } from '../../interface/state'
import { Settings } from '../../optimiser/settings'
import { PlannerLightMove, LightMoveType } from './../hardware'
import {
  AddComponentCallback,
  AddLineCallback,
  isPointTransition,
  isTransition,
  Movement,
  MOVEMENT_TYPE,
  RGB,
} from './../movements'
import { Material } from './Base'
import { Html } from '@react-three/drei'
import { Intent, Tag } from '@blueprintjs/core'
import { NodeID } from '../../interface/RenderableTree'
import React from 'react'
import { annotateDrawOrder, lerpRGB, MATERIALS, rgbToHsi } from './utilities'

export function isMixMaterial(material: Material): material is MixMaterial {
  return material.type === MATERIALS.MIX
}

/**
 * MixMaterials transition between two materials at time factor transitionT
 */
export class MixMaterial extends Material {
  readonly type = MATERIALS.MIX

  constructor(
    public start: Movement,
    public end: Movement,
    private transitionT: number = 0.5,
  ) {
    super()
  }

  public generateLightpath = (movement: Movement) => {
    const fadesStart: PlannerLightMove[] =
      this.start.material.generateLightpath(movement)
    const fadesEnd: PlannerLightMove[] =
      this.end.material.generateLightpath(movement)

    return [
      ...fadesStart.map(fade => {
        fade.duration = Math.ceil(fade.duration * this.transitionT)

        return fade
      }),
      ...fadesEnd.map(fade => {
        fade.duration = Math.ceil(fade.duration * (1 - this.transitionT))

        return fade
      }),
    ]
  }

  public generateThreeJSRepresentation = (
    movementIndex: number,
    movement: Movement,
    settings: Settings,
    visualisationSettings: VisualisationSettings,
    addColouredLine: AddLineCallback,
    addDottedLine: AddLineCallback,
    addReactComponent: AddComponentCallback,
    fromT: number,
    toT: number,
  ) => {
    // Annotate draw order
    annotateDrawOrder(
      movementIndex,
      movement,
      visualisationSettings,
      addReactComponent,
    )

    // Render the start material to the half way point
    this.start.material.generateThreeJSRepresentation(
      movementIndex,
      movement,
      settings,
      Object.assign({}, visualisationSettings, { annotateDrawOrder: false }), // disable draw order annotation for the segments
      addColouredLine,
      addDottedLine,
      addReactComponent,
      MathUtils.mapLinear(fromT, 0, 1, 0, this.transitionT),
      MathUtils.mapLinear(toT, 0, 1, 0, this.transitionT),
    )

    // Render the end material from the half way point
    this.end.material.generateThreeJSRepresentation(
      movementIndex,
      movement,
      settings,
      Object.assign({}, visualisationSettings, { annotateDrawOrder: false }), // disable draw order annotation for the segments
      addColouredLine,
      addDottedLine,
      addReactComponent,
      MathUtils.mapLinear(fromT, 0, 1, this.transitionT, 1),
      MathUtils.mapLinear(toT, 0, 1, this.transitionT, 1),
    )
  }
}
