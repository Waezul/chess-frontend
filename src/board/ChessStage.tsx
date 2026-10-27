import { PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, Suspense, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BoxGeometry,
  Color,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type DirectionalLight,
  type Group,
  type Material,
  type PerspectiveCamera as PerspectiveCameraImpl,
  type SpotLight,
} from 'three'
import { ReelFrameContext, type FrameRef, type ReelFrame } from './frame.ts'
import { boardBounds, PORTRAIT_QUEEN, squareToWorld, TILE } from './layout.ts'
import { parsePgnReel, positionAt } from './pgnReel.ts'
import { StauntonSet } from './pieces.tsx'
import type { PlacedPiece, ReplayGame } from './types.ts'

const ROOM = '#202223'
const BOUNDS = boardBounds()

const PORTRAIT_SHOT = {
  wide: { fov: 27, position: [-0.05, 0.88, 4.55] as const, look: [0.22, 0.52, 0] as const },
  narrow: { fov: 31, position: [-0.95, 1.08, 5.75] as const, look: [0.02, 0.62, 0] as const },
}

const TABLE_SHOT = {
  wide: { fov: 32, position: [-1.05, 12.8, 9.2] as const, look: [-0.85, 0.08, -3.45] as const },
  narrow: { fov: 68, position: [BOUNDS.cx, 11.6, 6.4] as const, look: [BOUNDS.cx, 1.15, -3.55] as const },
}

const SQUARES = Array.from({ length: 64 }, (_, index) => {
  const file = index % 8
  const rank = Math.floor(index / 8)
  const square = `${'abcdefgh'[file]}${rank + 1}`
  const [x, , z] = squareToWorld(square)
  return { square, x, z, dark: (file + rank) % 2 === 0 }
})

type StageView = {
  pieces: PlacedPiece[]
  marks: [string, string] | null
}

type Materials = {
  ivory: MeshPhysicalMaterial
  ebony: MeshPhysicalMaterial
  ivoryFade: MeshPhysicalMaterial
  ebonyFade: MeshPhysicalMaterial
  light: MeshStandardMaterial
  dark: MeshStandardMaterial
  slab: MeshStandardMaterial
  contact: MeshBasicMaterial
  edge: MeshBasicMaterial
  edgeInk: MeshBasicMaterial
  mark: MeshBasicMaterial
  markInk: MeshBasicMaterial
}

function mix(from: number, to: number, t: number) {
  return from + (to - from) * t
}

function ease(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return x * x * (3 - 2 * x)
}

function useMaterials(): Materials {
  return useMemo(() => {
    const ivory = new MeshPhysicalMaterial({
      color: '#f7f4ec',
      roughness: 0.46,
      metalness: 0.03,
      clearcoat: 0.28,
      clearcoatRoughness: 0.42,
    })
    const ebony = new MeshPhysicalMaterial({
      color: '#1c1b19',
      roughness: 0.36,
      metalness: 0.14,
      clearcoat: 0.16,
      clearcoatRoughness: 0.4,
    })
    const ivoryFade = ivory.clone()
    ivoryFade.transparent = true
    ivoryFade.opacity = 0
    const ebonyFade = ebony.clone()
    ebonyFade.transparent = true
    ebonyFade.opacity = 0
    const light = new MeshStandardMaterial({
      color: '#d4d0c8',
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0,
    })
    const dark = new MeshStandardMaterial({
      color: '#5c5954',
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0,
    })
    const slab = new MeshStandardMaterial({ color: '#141413', roughness: 0.68, metalness: 0.08 })
    const contact = new MeshBasicMaterial({
      color: '#050505',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const edge = new MeshBasicMaterial({ color: '#f5f5f2' })
    const edgeInk = new MeshBasicMaterial({ color: '#141413' })
    const mark = new MeshBasicMaterial({
      color: '#f5f5f2',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
    const markInk = new MeshBasicMaterial({
      color: '#141413',
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
    return { ivory, ebony, ivoryFade, ebonyFade, light, dark, slab, contact, edge, edgeInk, mark, markInk }
  }, [])
}

function KeyLight() {
  const frame = useContext(ReelFrameContext)
  const light = useRef<SpotLight>(null)
  const invalidate = useThree((state) => state.invalidate)
  const scene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    const spot = light.current
    if (!spot) return
    spot.target.position.set(0.7, 0.85, 0)
    spot.shadow.radius = 14
    scene.add(spot.target)
    invalidate()
    return () => {
      scene.remove(spot.target)
    }
  }, [invalidate, scene])

  useFrame(() => {
    const spot = light.current
    const zoom = frame?.current.zoom ?? 0
    if (!spot) return
    spot.position.set(mix(5.6, BOUNDS.cx, zoom), mix(8.4, 13.4, zoom), mix(2.4, BOUNDS.cz + 2.6, zoom))
    spot.target.position.set(mix(0.7, BOUNDS.cx, zoom), mix(0.85, 0, zoom), mix(0, BOUNDS.cz, zoom))
    spot.angle = mix(0.55, 0.92, zoom)
    spot.intensity = mix(250, 420, zoom)
    spot.castShadow = zoom < 0.48
  })

  return (
    <spotLight
      ref={light}
      position={[5.6, 8.4, 2.4]}
      angle={0.55}
      penumbra={1}
      decay={2}
      distance={0}
      intensity={250}
      color="#fff4e4"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0004}
      shadow-normalBias={0.035}
    />
  )
}

function CoolFill() {
  const frame = useContext(ReelFrameContext)
  const light = useRef<DirectionalLight>(null)
  useFrame(() => {
    if (!light.current) return
    light.current.intensity = mix(2.05, 3.15, frame?.current.zoom ?? 0)
  })
  return <directionalLight ref={light} position={[-3.6, 3.4, -2.2]} intensity={2.05} color="#e4ebf2" />
}

function Ground({ fade }: { fade: { value: number } }) {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: '#000000',
      roughness: 1,
      metalness: 0,
      transparent: true,
      depthWrite: false,
    })
    mat.customProgramCacheKey = () => 'room-ground'
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uFade = fade
      shader.fragmentShader = `uniform float uFade;\n${shader.fragmentShader}`
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
        `
          float groundShadow = 1.0;
          #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
            groundShadow = getShadow(
              spotShadowMap[ 0 ],
              spotLightShadows[ 0 ].shadowMapSize,
              spotLightShadows[ 0 ].shadowIntensity,
              spotLightShadows[ 0 ].shadowBias,
              spotLightShadows[ 0 ].shadowRadius,
              vSpotLightCoord[ 0 ]
            );
          #endif
          vec3 outgoingLight = vec3(0.0);
        `,
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        'gl_FragColor = vec4(0.0, 0.0, 0.0, (1.0 - groundShadow) * uFade);',
      )
    }
    return mat
  }, [fade])
  const frame = useContext(ReelFrameContext)

  useFrame(() => {
    const zoom = frame?.current.zoom ?? 0
    fade.value = 1 - smoothstep(0.12, 0.75, zoom)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.35, 0, 0]} receiveShadow material={material}>
      <circleGeometry args={[48, 48]} />
    </mesh>
  )
}

function CameraRig() {
  const frame = useContext(ReelFrameContext)
  const cameraRef = useRef<PerspectiveCameraImpl>(null)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const invalidate = useThree((state) => state.invalidate)
  const narrow = width / Math.max(height, 1) < 0.92

  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera) return
    const shot = narrow ? PORTRAIT_SHOT.narrow : PORTRAIT_SHOT.wide
    camera.fov = shot.fov
    camera.position.set(shot.position[0], shot.position[1], shot.position[2])
    camera.lookAt(shot.look[0], shot.look[1], shot.look[2])
    camera.updateProjectionMatrix()
    invalidate()
  }, [invalidate, narrow])

  useFrame(() => {
    const camera = cameraRef.current
    if (!camera) return
    const zoom = frame?.current.zoom ?? 0
    const from = narrow ? PORTRAIT_SHOT.narrow : PORTRAIT_SHOT.wide
    const to = narrow ? TABLE_SHOT.narrow : TABLE_SHOT.wide
    camera.fov = mix(from.fov, to.fov, zoom)
    camera.position.set(
      mix(from.position[0], to.position[0], zoom),
      mix(from.position[1], to.position[1], zoom),
      mix(from.position[2], to.position[2], zoom),
    )
    camera.lookAt(
      mix(from.look[0], to.look[0], zoom),
      mix(from.look[1], to.look[1], zoom),
      mix(from.look[2], to.look[2], zoom),
    )
    camera.updateProjectionMatrix()
  })

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={narrow ? 32 : 27}
      near={0.1}
      far={80}
      position={narrow ? [-0.15, 1.05, 5.9] : [-0.05, 0.88, 4.55]}
    />
  )
}

function Settle() {
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    let frame = 0
    let id = 0
    const step = () => {
      invalidate()
      frame += 1
      if (frame < 5) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [invalidate])
  return null
}

function MaterialsFade({ materials }: { materials: Materials }) {
  const frame = useContext(ReelFrameContext)
  useFrame(() => {
    const zoom = frame?.current.zoom ?? 0
    const pieces = smoothstep(0.1, 0.52, zoom)
    const tiles = smoothstep(0.04, 0.4, zoom)
    materials.ivoryFade.opacity = pieces
    materials.ebonyFade.opacity = pieces
    materials.light.opacity = tiles
    materials.dark.opacity = tiles
    materials.contact.opacity = smoothstep(0.4, 0.82, zoom) * 0.34
    materials.ivoryFade.depthWrite = pieces > 0.9
    materials.ebonyFade.depthWrite = pieces > 0.9
  })
  return null
}

function Slab({ material }: { material: Material }) {
  const lip = 0.045
  const height = 0.07
  const y = -height / 2
  const outerW = BOUNDS.maxX - BOUNDS.minX + lip * 2
  const outerD = BOUNDS.maxZ - BOUNDS.minZ + lip * 2
  const thickness = 0.055
  return (
    <group>
      <mesh material={material} position={[BOUNDS.cx, y, BOUNDS.maxZ + lip / 2]}>
        <boxGeometry args={[outerW, height, thickness]} />
      </mesh>
      <mesh material={material} position={[BOUNDS.cx, y, BOUNDS.minZ - lip / 2]}>
        <boxGeometry args={[outerW, height, thickness]} />
      </mesh>
      <mesh material={material} position={[BOUNDS.minX - lip / 2, y, BOUNDS.cz]}>
        <boxGeometry args={[thickness, height, outerD]} />
      </mesh>
      <mesh material={material} position={[BOUNDS.maxX + lip / 2, y, BOUNDS.cz]}>
        <boxGeometry args={[thickness, height, outerD]} />
      </mesh>
    </group>
  )
}

function squareIsDark(square: string) {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  return (file + rank) % 2 === 0
}

function SquareMark({ square, material }: { square: string; material: Material }) {
  const [x, y, z] = squareToWorld(square)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y + 0.004, z]} material={material}>
      <planeGeometry args={[TILE * 0.9, TILE * 0.9]} />
    </mesh>
  )
}

function SquareEdge({ square, material }: { square: string; material: Material }) {
  const [x, y, z] = squareToWorld(square)
  const size = TILE - 0.04
  const thickness = 0.034
  const half = size / 2 - thickness / 2
  return (
    <group position={[x, y + 0.01, z]}>
      <mesh material={material} position={[0, 0, half]}>
        <boxGeometry args={[size, 0.012, thickness]} />
      </mesh>
      <mesh material={material} position={[0, 0, -half]}>
        <boxGeometry args={[size, 0.012, thickness]} />
      </mesh>
      <mesh material={material} position={[half, 0, 0]}>
        <boxGeometry args={[thickness, 0.012, size]} />
      </mesh>
      <mesh material={material} position={[-half, 0, 0]}>
        <boxGeometry args={[thickness, 0.012, size]} />
      </mesh>
    </group>
  )
}

function Board({
  materials,
  marks,
}: {
  materials: Materials
  marks: [string, string] | null
}) {
  const frame = useContext(ReelFrameContext)
  const ref = useRef<Group>(null)
  const tile = useMemo(() => new BoxGeometry(TILE, 0.022, TILE), [])

  useFrame(() => {
    if (ref.current) ref.current.visible = (frame?.current.zoom ?? 0) > 0.025
  })

  return (
    <group ref={ref} visible={false}>
      <Slab material={materials.slab} />
      {SQUARES.map((square) => (
        <mesh
          key={square.square}
          geometry={tile}
          material={square.dark ? materials.dark : materials.light}
          position={[square.x, -0.011, square.z]}
          receiveShadow
        />
      ))}
      {marks
        ? [marks[0], marks[1]]
            .filter((square, index, list) => list.indexOf(square) === index)
            .map((square) => {
              const dark = squareIsDark(square)
              return (
                <group key={square}>
                  <SquareMark square={square} material={dark ? materials.mark : materials.markInk} />
                  <SquareEdge square={square} material={dark ? materials.edge : materials.edgeInk} />
                </group>
              )
            })
        : null}
    </group>
  )
}

function ReelDriver({
  games,
  watching,
  paused,
  reduced,
  gameIndex,
  ply,
  frame,
  onView,
}: {
  games: ReplayGame[]
  watching: boolean
  paused: boolean
  reduced: boolean
  gameIndex: number
  ply: number
  frame: FrameRef
  onView: (view: StageView) => void
}) {
  const invalidate = useThree((state) => state.invalidate)
  const clock = useRef({
    zoomT: 0,
    mode: 'portrait' as 'portrait' | 'table',
  })
  const gamesRef = useRef(games)
  const watchingRef = useRef(watching)
  const pausedRef = useRef(paused)
  const reducedRef = useRef(reduced)
  const onViewRef = useRef(onView)

  useLayoutEffect(() => {
    gamesRef.current = games
    watchingRef.current = watching
    pausedRef.current = paused
    reducedRef.current = reduced
    onViewRef.current = onView
  }, [games, onView, paused, reduced, watching])

  useLayoutEffect(() => {
    const game = games[gameIndex]
    if (watching && game) {
      clock.current.mode = 'table'
      const pose = positionAt(game, ply)
      frame.current.slides = pose.slides
      frame.current.slideT = reduced || ply === 0 ? 1 : 0
      onView({ pieces: pose.pieces, marks: pose.marks })
    }
    invalidate()
  }, [frame, gameIndex, games, invalidate, onView, ply, reduced, watching])

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 0.05)
    const state = clock.current
    const playing = watchingRef.current && gamesRef.current.length > 0
    const target = playing ? 1 : 0
    if (!pausedRef.current && Math.abs(state.zoomT - target) > 0.0001) {
      const step = reducedRef.current ? 1 : dt / 0.9
      state.zoomT =
        state.zoomT < target ? Math.min(target, state.zoomT + step) : Math.max(target, state.zoomT - step)
    }
    if (playing && frame.current.slideT < 1) {
      const step = reducedRef.current ? 1 : dt / 0.28
      frame.current.slideT = Math.min(1, frame.current.slideT + step)
    }
    frame.current.zoom = reducedRef.current ? state.zoomT : ease(state.zoomT)
    if (!playing && state.zoomT <= 0.001 && state.mode !== 'portrait') {
      state.mode = 'portrait'
      frame.current.slides = []
      frame.current.slideT = 1
      onViewRef.current({ pieces: [PORTRAIT_QUEEN], marks: null })
    }
    const zooming = !pausedRef.current && Math.abs(state.zoomT - target) > 0.001
    const sliding = playing && frame.current.slideT < 1
    if (zooming || sliding) invalidate()
  }, -1)

  return null
}

function StageScene({
  games,
  watching,
  paused,
  reduced,
  gameIndex,
  ply,
  view,
  frame,
  materials,
  fade,
  onView,
}: {
  games: ReplayGame[]
  watching: boolean
  paused: boolean
  reduced: boolean
  gameIndex: number
  ply: number
  view: StageView
  frame: FrameRef
  materials: Materials
  fade: { value: number }
  onView: (view: StageView) => void
}) {
  return (
    <>
      <color attach="background" args={[ROOM]} />
      <hemisphereLight args={['#f7f3ea', '#4a4e56', 0.62]} />
      <KeyLight />
      <directionalLight position={[-2.4, 2.2, 4.2]} intensity={1.35} color="#f7f1e4" />
      <CoolFill />
      <Ground fade={fade} />
      <Board materials={materials} marks={view.marks} />
      <Suspense fallback={null}>
        <StauntonSet
          pieces={view.pieces}
          ivory={materials.ivory}
          ebony={materials.ebony}
          ivoryFade={materials.ivoryFade}
          ebonyFade={materials.ebonyFade}
          contact={materials.contact}
        />
      </Suspense>
      <CameraRig />
      <MaterialsFade materials={materials} />
      <ReelDriver
        games={games}
        watching={watching}
        paused={paused}
        reduced={reduced}
        gameIndex={gameIndex}
        ply={ply}
        frame={frame}
        onView={onView}
      />
      <Settle />
    </>
  )
}

class StageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

export function ChessStage({
  pgn,
  watching,
  paused,
  reduced,
  gameIndex,
  ply,
}: {
  pgn: string
  watching: boolean
  paused: boolean
  reduced: boolean
  gameIndex: number
  ply: number
}) {
  const games = useMemo(() => parsePgnReel(pgn), [pgn])
  const materials = useMaterials()
  const fade = useMemo(() => ({ value: 1 }), [])
  const frame = useRef<ReelFrame>({ zoom: 0, slideT: 1, slides: [] })
  const [view, setView] = useState<StageView>({ pieces: [PORTRAIT_QUEEN], marks: null })

  return (
    <StageErrorBoundary>
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color(ROOM), 1)
          gl.toneMappingExposure = 1.12
          gl.domElement.setAttribute('aria-hidden', 'true')
        }}
        style={{ width: '100%', height: '100%', display: 'block', background: ROOM }}
      >
        <ReelFrameContext.Provider value={frame}>
          <StageScene
            games={games}
            watching={watching}
            paused={paused}
            reduced={reduced}
            gameIndex={gameIndex}
            ply={ply}
            view={view}
            frame={frame}
            materials={materials}
            fade={fade}
            onView={setView}
          />
        </ReelFrameContext.Provider>
      </Canvas>
    </StageErrorBoundary>
  )
}
