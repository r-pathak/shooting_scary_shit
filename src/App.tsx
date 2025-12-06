import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { PointerLockControls, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { World } from './game/World'
import { Player } from './game/Player'
import { Enemies } from './game/Enemies'
import { UI } from './game/UI'

function App() {
  return (
    <>
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 1000 }}>
        {/* Skybox */}
        <Suspense fallback={<color attach="background" args={['#87ceeb']} />}>
          <Environment files="/skybox.hdr" background />
        </Suspense>
        
        {/* Outdoor lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.5} 
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Player />
            <World />
            <Enemies />
          </Physics>
        </Suspense>
        
        <PointerLockControls />
      </Canvas>
      <UI />
    </>
  )
}

export default App
