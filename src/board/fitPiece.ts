import { BufferGeometry, Vector3 } from 'three'
import { PORTRAIT_QUEEN } from './layout.ts'
import type { PlacedPiece } from './types.ts'

const MAX_FOOTPRINT = 0.72
const KNIGHT_TURN = 0.42

const size = new Vector3()

export function fitPieceGeometry(geometry: BufferGeometry, height: number) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box || height <= 0) return geometry
  box.getSize(size)
  if (size.y <= 1e-8) return geometry
  let scale = height / size.y
  const footprint = Math.max(size.x, size.z) * scale
  if (footprint > MAX_FOOTPRINT) scale *= MAX_FOOTPRINT / footprint
  geometry.scale(scale, scale, scale)
  geometry.computeBoundingBox()
  const fitted = geometry.boundingBox
  if (!fitted) return geometry
  geometry.translate(-(fitted.min.x + fitted.max.x) / 2, -fitted.min.y, -(fitted.min.z + fitted.max.z) / 2)
  return geometry
}

export function yawFor(piece: PlacedPiece, zoom: number) {
  if (piece.type === 'n') return piece.color === 'w' ? Math.PI + KNIGHT_TURN : KNIGHT_TURN
  if (piece.id === PORTRAIT_QUEEN.id) return -0.5 * (1 - zoom) + 0
  return 0
}
