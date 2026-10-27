import { ExtrudeGeometry, LatheGeometry, Shape, Vector2 } from 'three'
import {
  createBishopProfile,
  createFootProfile,
  createKingProfile,
  createPawnProfile,
  createQueenProfile,
  createRookProfile,
} from './queenProfile.ts'

function lathe(points: Vector2[], segments: number) {
  return new LatheGeometry(points, segments)
}

export const queenGeometry = lathe(createQueenProfile(), 80)
export const pawnGeometry = lathe(createPawnProfile(), 48)
export const rookGeometry = lathe(createRookProfile(), 56)
export const bishopGeometry = lathe(createBishopProfile(), 64)
export const kingGeometry = lathe(createKingProfile(), 72)
export const footGeometry = lathe(createFootProfile(), 48)

function knightShape() {
  const shape = new Shape()
  shape.moveTo(0.16, 0.13)
  shape.bezierCurveTo(0.28, 0.2, 0.3, 0.36, 0.22, 0.5)
  shape.bezierCurveTo(0.16, 0.58, 0.2, 0.64, 0.36, 0.72)
  shape.bezierCurveTo(0.5, 0.78, 0.58, 0.84, 0.5, 0.9)
  shape.bezierCurveTo(0.42, 0.96, 0.3, 1.0, 0.22, 1.1)
  shape.lineTo(0.16, 1.2)
  shape.lineTo(0.07, 1.35)
  shape.lineTo(-0.01, 1.16)
  shape.bezierCurveTo(-0.06, 1.08, -0.12, 0.98, -0.16, 0.86)
  shape.bezierCurveTo(-0.22, 0.7, -0.2, 0.52, -0.14, 0.34)
  shape.bezierCurveTo(-0.1, 0.22, -0.04, 0.15, 0.02, 0.13)
  shape.lineTo(0.16, 0.13)
  return shape
}

function createKnightGeometry() {
  const geometry = new ExtrudeGeometry(knightShape(), {
    depth: 0.36,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 2,
    curveSegments: 10,
  })
  geometry.translate(-0.14, 0, -0.18)
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index)
    if (y <= 0.72) continue
    const t = Math.min((y - 0.72) / 0.6, 1)
    const bend = t * t * 0.32
    position.setZ(index, position.getZ(index) + bend)
  }
  geometry.computeVertexNormals()
  return geometry
}

export const knightGeometry = createKnightGeometry()

export const ROOK_MERLONS = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
