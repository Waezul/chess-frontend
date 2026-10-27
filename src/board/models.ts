import { useLayoutEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Mesh, type Object3D } from 'three'
import bishopUrl from './models/bishop.glb'
import { fitPieceGeometry } from './fitPiece.ts'
import kingUrl from './models/king.glb'
import knightUrl from './models/knight.glb'
import pawnUrl from './models/pawn.glb'
import queenUrl from './models/queen.glb'
import rookUrl from './models/rook.glb'
import type { PieceType } from './types.ts'

const HEIGHT: Record<PieceType, number> = {
  k: 1.6,
  q: 1.39,
  b: 1.12,
  n: 1.07,
  r: 0.96,
  p: 0.85,
}

const URLS: Record<PieceType, string> = {
  k: kingUrl,
  q: queenUrl,
  b: bishopUrl,
  n: knightUrl,
  r: rookUrl,
  p: pawnUrl,
}

for (const url of Object.values(URLS)) useGLTF.preload(url)

function pieceGeometry(scene: Object3D, height: number) {
  const meshes: Mesh[] = []
  scene.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child)
  })
  const geometry = meshes[0]?.geometry
  if (!geometry) throw new Error('Staunton mesh is missing')
  return fitPieceGeometry(geometry.clone(), height)
}

export function useStauntonGeometries() {
  const king = useGLTF(URLS.k)
  const queen = useGLTF(URLS.q)
  const bishop = useGLTF(URLS.b)
  const knight = useGLTF(URLS.n)
  const rook = useGLTF(URLS.r)
  const pawn = useGLTF(URLS.p)
  const invalidate = useThree((state) => state.invalidate)
  const geometries = useMemo(
    () => ({
      k: pieceGeometry(king.scene, HEIGHT.k),
      q: pieceGeometry(queen.scene, HEIGHT.q),
      b: pieceGeometry(bishop.scene, HEIGHT.b),
      n: pieceGeometry(knight.scene, HEIGHT.n),
      r: pieceGeometry(rook.scene, HEIGHT.r),
      p: pieceGeometry(pawn.scene, HEIGHT.p),
    }),
    [bishop.scene, king.scene, knight.scene, pawn.scene, queen.scene, rook.scene],
  )

  useLayoutEffect(() => {
    invalidate()
  }, [geometries, invalidate])

  return geometries
}
