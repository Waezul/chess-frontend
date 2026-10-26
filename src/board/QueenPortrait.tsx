import { PerspectiveCamera } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  Color,
  MeshStandardMaterial,
  type PerspectiveCamera as PerspectiveCameraImpl,
  type SpotLight,
} from 'three'
import { createQueenProfile } from './queenProfile.ts'

const IVORY = '#f7f4ec'
const ROOM = '#0b0c0d'

function IvoryMaterial() {
  return (
    <meshPhysicalMaterial
      color={IVORY}
      roughness={0.58}
      metalness={0.04}
      clearcoat={0.12}
      clearcoatRoughness={0.62}
    />
  )
}

function Coronet() {
  const pearls = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
    return [Math.cos(angle) * 0.246, Math.sin(angle) * 0.246] as const
  })

  return (
    <group>
      <mesh position={[0, 1.535, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.242, 0.022, 16, 64]} />
        <IvoryMaterial />
      </mesh>
      {pearls.map(([x, z], index) => (
        <mesh key={index} position={[x, 1.575, z]} castShadow>
          <sphereGeometry args={[0.046, 24, 16]} />
          <IvoryMaterial />
        </mesh>
      ))}
      <mesh position={[0, 1.84, 0]} castShadow>
        <sphereGeometry args={[0.078, 32, 24]} />
        <IvoryMaterial />
      </mesh>
    </group>
  )
}

function Queen() {
  const points = useMemo(() => createQueenProfile(), [])

  return (
    <group position={[0.78, 0.002, 0]} rotation={[0, -0.5, 0]}>
      <mesh castShadow>
        <latheGeometry args={[points, 80]} />
        <IvoryMaterial />
      </mesh>
      <Coronet />
    </group>
  )
}

function KeyLight() {
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

  return (
    <spotLight
      ref={light}
      position={[5.6, 8.4, 2.4]}
      angle={0.55}
      penumbra={1}
      decay={2}
      distance={0}
      intensity={210}
      color="#fff4e4"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0004}
      shadow-normalBias={0.035}
    />
  )
}

function CameraRig() {
  const cameraRef = useRef<PerspectiveCameraImpl>(null)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const invalidate = useThree((state) => state.invalidate)
  const narrow = width / Math.max(height, 1) < 0.92

  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera) return
    camera.lookAt(narrow ? 0.16 : 0.22, 0.92, 0)
    invalidate()
  }, [invalidate, narrow])

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={narrow ? 32 : 27}
      near={0.1}
      far={40}
      position={narrow ? [-0.15, 1.1, 5.5] : [-0.05, 1.12, 4.85]}
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

function Ground() {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: '#000000',
      roughness: 1,
      metalness: 0,
      transparent: true,
      depthWrite: false,
    })
    mat.customProgramCacheKey = () => 'room-ground'
    // The ground stays the room color. This only draws the key light's shadow.
    mat.onBeforeCompile = (shader) => {
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
        'gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - groundShadow);',
      )
    }
    return mat
  }, [])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0.35, 0, 0]}
      receiveShadow
      material={material}
    >
      <circleGeometry args={[48, 48]} />
    </mesh>
  )
}

function PortraitScene() {
  return (
    <>
      <color attach="background" args={[ROOM]} />
      <hemisphereLight args={['#f7f4ec', '#090909', 0.14]} />
      <KeyLight />
      <directionalLight position={[-2.4, 2.2, 4.2]} intensity={0.45} color="#f3eee4" />
      <directionalLight position={[-3.6, 3.4, -2.2]} intensity={1.35} color="#d5dee8" />
      <Ground />
      <Queen />
      <CameraRig />
      <Settle />
    </>
  )
}

class PortraitErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
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

export function QueenPortrait() {
  return (
    <PortraitErrorBoundary>
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color(ROOM), 1)
          gl.toneMappingExposure = 1.05
        }}
        style={{ width: '100%', height: '100%', display: 'block', background: ROOM }}
      >
        <PortraitScene />
      </Canvas>
    </PortraitErrorBoundary>
  )
}
