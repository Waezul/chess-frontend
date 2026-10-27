import { useContext, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, type Material, Mesh } from 'three'
import { ReelFrameContext } from './frame.ts'
import {
  bishopGeometry,
  footGeometry,
  kingGeometry,
  knightGeometry,
  pawnGeometry,
  queenGeometry,
  rookGeometry,
  ROOK_MERLONS,
} from './geometry.ts'
import { PORTRAIT_QUEEN, squareToWorld } from './layout.ts'
import type { PlacedPiece } from './types.ts'

const PEARLS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
  return [Math.cos(angle) * 0.246, Math.sin(angle) * 0.246] as const
})

function ease(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2
}

function yawFor(piece: PlacedPiece, zoom: number) {
  if (piece.type === 'n') return piece.color === 'w' ? 0.42 : Math.PI - 0.42
  if (piece.id === PORTRAIT_QUEEN.id) return -0.5 * (1 - zoom)
  return 0
}

function QueenMesh({ material, shadow }: { material: Material; shadow: boolean }) {
  return (
    <group>
      <mesh geometry={queenGeometry} material={material} castShadow={shadow} />
      <mesh material={material} position={[0, 1.535, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={shadow}>
        <torusGeometry args={[0.242, 0.022, 16, 64]} />
      </mesh>
      {PEARLS.map(([x, z], index) => (
        <mesh key={index} material={material} position={[x, 1.575, z]} castShadow={shadow}>
          <sphereGeometry args={[0.046, 24, 16]} />
        </mesh>
      ))}
      <mesh material={material} position={[0, 1.84, 0]} castShadow={shadow}>
        <sphereGeometry args={[0.078, 32, 24]} />
      </mesh>
    </group>
  )
}

function PawnMesh({ material, shadow }: { material: Material; shadow: boolean }) {
  return (
    <group>
      <mesh geometry={pawnGeometry} material={material} castShadow={shadow} />
      <mesh material={material} position={[0, 0.838, 0]} castShadow={shadow}>
        <sphereGeometry args={[0.162, 32, 20]} />
      </mesh>
    </group>
  )
}

function RookMesh({ material, shadow }: { material: Material; shadow: boolean }) {
  return (
    <group>
      <mesh geometry={rookGeometry} material={material} castShadow={shadow} />
      {ROOK_MERLONS.map((angle) => (
        <mesh
          key={angle}
          material={material}
          position={[Math.cos(angle) * 0.125, 1.2, Math.sin(angle) * 0.125]}
          rotation={[0, -angle, 0]}
          castShadow={shadow}
        >
          <boxGeometry args={[0.11, 0.1, 0.07]} />
        </mesh>
      ))}
    </group>
  )
}

function KnightMesh({ material, shadow }: { material: Material; shadow: boolean }) {
  return (
    <group>
      <mesh geometry={footGeometry} material={material} castShadow={shadow} />
      <mesh geometry={knightGeometry} material={material} castShadow={shadow} />
    </group>
  )
}

function BishopMesh({
  material,
  slit,
  shadow,
}: {
  material: Material
  slit: Material
  shadow: boolean
}) {
  return (
    <group>
      <mesh geometry={bishopGeometry} material={material} castShadow={shadow} />
      <mesh material={slit} position={[0, 1.28, 0.07]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.018, 0.36, 0.07]} />
      </mesh>
    </group>
  )
}

function KingMesh({ material, shadow }: { material: Material; shadow: boolean }) {
  return (
    <group>
      <mesh geometry={kingGeometry} material={material} castShadow={shadow} />
      <mesh material={material} position={[0, 1.95, 0]} castShadow={shadow}>
        <boxGeometry args={[0.028, 0.2, 0.028]} />
      </mesh>
      <mesh material={material} position={[0, 1.99, 0]} castShadow={shadow}>
        <boxGeometry args={[0.15, 0.028, 0.028]} />
      </mesh>
    </group>
  )
}

export function StauntonPiece({
  piece,
  solid,
  fade,
  slit,
  contact,
}: {
  piece: PlacedPiece
  solid: Material
  fade: Material
  slit: Material
  contact: Material
}) {
  const frame = useContext(ReelFrameContext)
  const ref = useRef<Group>(null)
  const portrait = piece.id === PORTRAIT_QUEEN.id
  const material = portrait ? solid : fade

  useFrame(() => {
    const group = ref.current
    const current = frame?.current
    if (!group || !current) return
    const motion = current.slides.find((slide) => slide.id === piece.id)
    const dest = squareToWorld(motion ? motion.to : piece.square)
    const from = motion ? squareToWorld(motion.from) : dest
    const t = motion ? ease(current.slideT) : 1
    let x = from[0] + (dest[0] - from[0]) * t
    let z = from[2] + (dest[2] - from[2]) * t
    if (portrait) {
      const home = squareToWorld(PORTRAIT_QUEEN.square)
      x = home[0] + (x - home[0]) * current.zoom
      z = home[2] + (z - home[2]) * current.zoom
    }
    group.position.set(x, dest[1], z)
    group.rotation.y = yawFor(piece, current.zoom)
    const shadow = portrait && current.zoom < 0.45
    if (group.userData.shadow !== shadow) {
      group.userData.shadow = shadow
      group.traverse((child) => {
        if (child instanceof Mesh && child.name !== 'contact') child.castShadow = shadow
      })
    }
  })

  return (
    <group ref={ref}>
      <mesh
        name="contact"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        material={contact}
        castShadow={false}
      >
        <circleGeometry args={[0.3, 20]} />
      </mesh>
      {piece.type === 'q' ? <QueenMesh material={material} shadow={portrait} /> : null}
      {piece.type === 'k' ? <KingMesh material={material} shadow={false} /> : null}
      {piece.type === 'r' ? <RookMesh material={material} shadow={false} /> : null}
      {piece.type === 'b' ? <BishopMesh material={material} slit={slit} shadow={false} /> : null}
      {piece.type === 'n' ? <KnightMesh material={material} shadow={false} /> : null}
      {piece.type === 'p' ? <PawnMesh material={material} shadow={false} /> : null}
    </group>
  )
}
