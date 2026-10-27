import { useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type BufferGeometry, type Group, type Material, Mesh } from 'three'
import { yawFor } from './fitPiece.ts'
import { ReelFrameContext } from './frame.ts'
import { PORTRAIT_QUEEN, squareToWorld } from './layout.ts'
import { useStauntonGeometries } from './models.ts'
import type { PlacedPiece } from './types.ts'

function ease(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2
}

function contactRadius(geometry: BufferGeometry) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return 0.28
  return Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.46
}

export function StauntonPiece({
  piece,
  geometry,
  solid,
  fade,
  contact,
}: {
  piece: PlacedPiece
  geometry: BufferGeometry
  solid: Material
  fade: Material
  contact: Material
}) {
  const frame = useContext(ReelFrameContext)
  const ref = useRef<Group>(null)
  const portrait = piece.id === PORTRAIT_QUEEN.id
  const material = portrait ? solid : fade
  const radius = useMemo(() => contactRadius(geometry), [geometry])

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
        <circleGeometry args={[radius, 24]} />
      </mesh>
      <mesh geometry={geometry} material={material} castShadow={portrait} />
    </group>
  )
}

export function StauntonSet({
  pieces,
  ivory,
  ebony,
  ivoryFade,
  ebonyFade,
  contact,
}: {
  pieces: PlacedPiece[]
  ivory: Material
  ebony: Material
  ivoryFade: Material
  ebonyFade: Material
  contact: Material
}) {
  const geometries = useStauntonGeometries()
  return pieces.map((piece) => (
    <StauntonPiece
      key={piece.id}
      piece={piece}
      geometry={geometries[piece.type]}
      solid={piece.color === 'w' ? ivory : ebony}
      fade={piece.color === 'w' ? ivoryFade : ebonyFade}
      contact={contact}
    />
  ))
}
