import { TreeNodeInfo } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Vector3 } from 'three'
import { NodeInfo, NodeTypes } from '../interface/RenderableTree'
import { ObjectNameTree } from './files'
import { importMaterial, MaterialJSON } from './material'
import { isSimpleColorMaterial, SimpleColorMaterial } from './materials/Color'
import { ColorRampMaterial } from './materials/ColorRamp'
import { lerpRGB } from './materials/utilities'
import { Point, Movement, Line, MovementGroup, RGB } from './movements'
import { getShouldSkip, getToMovementSettings, Settings } from './settings'

export class GPencilLayer {
  public strokes: GPencilStroke[] = []
  public material: MaterialJSON
  public info: string

  constructor(info: string, material: MaterialJSON) {
    this.info = info
    this.material = material
  }

  public addStroke = (stroke: GPencilStroke) => {
    this.strokes.push(stroke)
  }
}

export class GPencilStroke {
  public useCyclic: boolean
  public points: GPencilStrokePoint[] = []

  constructor(useCyclic: boolean) {
    this.useCyclic = useCyclic
  }

  public addPoint = (point: GPencilStrokePoint) => {
    this.points.push(point)
  }
}

export interface GPencilStrokePoint {
  id: string
  co: [number, number, number] // position
  pressure: number // Pressure of tablet at point when drawing it
  strength: number // Color intensity (alpha factor)
  vertexColor: [number, number, number, number] // Vertex color
}

export interface GPencilToMovementsSettings {
  /**
   * If enabled, strokes are broken up into singular lines that may be individually optimised.
   */
  breakUpStrokes?: boolean
}

export class GPencil {
  readonly type = 'gpencil'

  constructor(public name: string) {}

  private layers: GPencilLayer[] = []

  public addLayer = (layer: GPencilLayer) => {
    this.layers.push(layer)
  }

  public getObjectTree: () => TreeNodeInfo<NodeInfo> = () => {
    const node: TreeNodeInfo<NodeInfo> = {
      id: this.name,
      label: this.name,
      icon: IconNames.DRAW,
      nodeData: {
        type: NodeTypes.GPENCIL,
      },
      childNodes: this.layers.map(layer => ({
        id: `${this.name}-${layer.info}`,
        icon: IconNames.LAYERS,
        label: layer.info,
        nodeData: {
          type: NodeTypes.GPENCIL_LAYER,
          hidden: false,
        },
      })),
    }

    return node
  }

  public toMovements = (settings: Settings) => {
    const movements: Movement[] = []

    for (const layer of this.layers) {
      for (const stroke of layer.strokes) {
        const objectID = `${this.name}-${layer.info}`
        const overrideKeys = [this.name, objectID]

        if (getShouldSkip(settings, overrideKeys)) {
          continue
        }

        // A stroke needs at least two points to form a line
        if (stroke.points.length < 2) {
          continue
        }

        const settingsWithOverride = getToMovementSettings(
          settings,
          'gpencil',
          [this.name, objectID],
        )

        let lastPoint = new Vector3(
          stroke.points[0].co[0],
          stroke.points[0].co[1],
          stroke.points[0].co[2],
        )

        const orderedMovements = new MovementGroup()

        const material = importMaterial(layer.material)

        let doVertexColoring = isSimpleColorMaterial(material)

        let lastPointFinalColor = doVertexColoring
          ? lerpRGB(
              (material as SimpleColorMaterial).color,
              [
                stroke.points[0].vertexColor[0],
                stroke.points[0].vertexColor[1],
                stroke.points[0].vertexColor[2],
              ],
              stroke.points[0].vertexColor[3],
            )
          : ([0, 0, 0] as RGB)

        // Start at the second point, the first is located above
        for (let index = 1; index < stroke.points.length; index++) {
          const point = stroke.points[index]
          const co = point.co

          let currentPoint = new Vector3(co[0], co[1], co[2])

          let vertexMat = material

          if (doVertexColoring) {
            // TODO: Not sure what mix mode we should actually use, for now it's just a simple lerp based on alpha of the vertex color
            const thisPointFinalColor = lerpRGB(
              (material as SimpleColorMaterial).color,
              [
                point.vertexColor[0],
                point.vertexColor[1],
                point.vertexColor[2],
              ],
              point.vertexColor[3],
            )

            vertexMat = new ColorRampMaterial(
              lastPointFinalColor,
              thisPointFinalColor,
            )

            lastPointFinalColor = thisPointFinalColor
          }

          // Create a line from the lastPoint to the currentPoint
          const line: Movement = new Line(
            lastPoint,
            currentPoint,
            vertexMat,
            objectID,
          )

          // This ID isn't guaranteed to be stable, but it'll probably be close at least some of the time
          line.interFrameID = point.id

          orderedMovements.addMovement(line)

          lastPoint = currentPoint

          // TODO: Read vertex colours and mix into the layer material
        }

        if (settingsWithOverride.breakUpStrokes) {
          movements.push(...orderedMovements.getMovements())
        } else {
          movements.push(orderedMovements)
        }
      }
    }

    return movements
  }
}

export interface GPencilJSON {
  type: 'gpencil'
  frame: number
  name: string
  layers: {
    info: string
    material: MaterialJSON
    strokes: {
      useCyclic: boolean
      points: {
        id: string
        co: [number, number, number]
        pressure: number
        strength: number
        vertexColor: [number, number, number, number]
      }[]
    }[]
  }[]
}

export function importGPencil(json: GPencilJSON) {
  const gPencil = new GPencil(json.name)

  for (const jLayer of json.layers) {
    let layer = new GPencilLayer(jLayer.info, jLayer.material)
    gPencil.addLayer(layer)

    for (const jStroke of jLayer.strokes) {
      const stroke = new GPencilStroke(jStroke.useCyclic)
      layer.addStroke(stroke)

      for (const jPoint of jStroke.points) {
        stroke.addPoint(jPoint)
      }
    }
  }

  return gPencil
}
