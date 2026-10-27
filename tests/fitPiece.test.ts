import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BoxGeometry } from 'three'
import { PORTRAIT_QUEEN } from '../src/board/layout.ts'
import { fitPieceGeometry, yawFor } from '../src/board/fitPiece.ts'
import type { PlacedPiece } from '../src/board/types.ts'

function sizeOf(geometry: BoxGeometry) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) throw new Error('missing bounds')
  return {
    minY: box.min.y,
    height: box.max.y - box.min.y,
    width: Math.max(box.max.x - box.min.x, box.max.z - box.min.z),
    centerX: (box.min.x + box.max.x) / 2,
    centerZ: (box.min.z + box.max.z) / 2,
  }
}

test('a piece sits on the square at the target height', () => {
  const geometry = new BoxGeometry(0.2, 1, 0.2)
  fitPieceGeometry(geometry, 1.6)
  const size = sizeOf(geometry)
  assert.ok(Math.abs(size.minY) < 1e-4)
  assert.ok(Math.abs(size.height - 1.6) < 1e-4)
  assert.ok(Math.abs(size.centerX) < 1e-4)
  assert.ok(Math.abs(size.centerZ) < 1e-4)
})

test('a base wider than 0.72 is scaled down so neighbors do not overlap', () => {
  const geometry = new BoxGeometry(2, 4, 2)
  fitPieceGeometry(geometry, 1.6)
  const size = sizeOf(geometry)
  assert.ok(size.width <= 0.72 + 1e-4)
  assert.ok(Math.abs(size.minY) < 1e-4)
  assert.ok(size.height < 1.6)
})

test('knights face across the board, and the portrait queen turns as the camera pulls back', () => {
  const white: PlacedPiece = { id: 'w-n-b1', square: 'b1', type: 'n', color: 'w' }
  const black: PlacedPiece = { id: 'b-n-b8', square: 'b8', type: 'n', color: 'b' }
  const queen: PlacedPiece = { ...PORTRAIT_QUEEN }
  assert.ok(Math.abs(yawFor(white, 1) - Math.PI) < 0.5)
  assert.ok(Math.abs(yawFor(black, 1)) < 0.5)
  assert.ok(Math.abs(Math.abs(yawFor(white, 1) - yawFor(black, 1)) - Math.PI) < 0.01)
  assert.equal(yawFor(queen, 0), -0.5)
  assert.equal(yawFor(queen, 1), 0)
})
