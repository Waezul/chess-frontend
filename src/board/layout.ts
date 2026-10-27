import type { PlacedPiece } from './types.ts'

export const PITCH = 1
export const GAP = 0.015
export const TILE = PITCH - GAP

const D1_X = 0.78
const D1_Z = 0

export const PORTRAIT_QUEEN: PlacedPiece = {
  id: 'w-q-d1',
  square: 'd1',
  type: 'q',
  color: 'w',
}

export function squareToWorld(square: string): [number, number, number] {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  return [D1_X + (file - 3) * PITCH, 0.002, D1_Z - rank * PITCH]
}

export function boardBounds() {
  const a1 = squareToWorld('a1')
  const h8 = squareToWorld('h8')
  const minX = Math.min(a1[0], h8[0]) - TILE / 2
  const maxX = Math.max(a1[0], h8[0]) + TILE / 2
  const minZ = Math.min(a1[2], h8[2]) - TILE / 2
  const maxZ = Math.max(a1[2], h8[2]) + TILE / 2
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
  }
}
