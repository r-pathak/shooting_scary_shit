import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { PointerLockControls, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { World } from './game/World'
import { Player } from './game/Player'
import { Enemies } from './game/Enemies'
import { UI } from './game/UI'
import { AssetLoader } from './game/AssetLoader'
import { useStore } from './game/store'

function LoadingScreen() {
  const loadingProgress = useStore(state => state.loadingProgress)
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>🧟 LOADING...</h1>
      <div style={{
        width: '400px',
        height: '30px',
        background: '#333',
        borderRadius: '15px',
        overflow: 'hidden',
        border: '2px solid #fff'
      }}>
        <div style={{
          width: `${loadingProgress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #ff0000, #ff6600)',
          transition: 'width 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {loadingProgress > 10 && `${Math.round(loadingProgress)}%`}
        </div>
      </div>
      <p style={{ marginTop: '20px', fontSize: '18px', color: '#aaa' }}>
        Loading assets...
      </p>
    </div>
  )
}

function App() {
  const isLoading = useStore(state => state.isLoading)
  
  return (
    <>
      {isLoading && <LoadingScreen />}
      <Canvas 
        shadows 
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        performance={{ min: 0.5 }}
        gl={{ 
          antialias: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
      >
        <AssetLoader />
        
        {/* Skybox */}
        <Suspense fallback={<color attach="background" args={['#87ceeb']} />}>
          <Environment files="/skybox.hdr" background />
        </Suspense>
        
        {/* Outdoor lighting - optimized shadow settings */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.5} 
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={50}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.0001}
        />
        
        {!isLoading && (
          <Suspense fallback={null}>
            <Physics 
              gravity={[0, -9.81, 0]}
              timeStep="vary"
            >
              <Player />
              <World />
              <Enemies />
            </Physics>
          </Suspense>
        )}
        
        {!isLoading && <PointerLockControls />}
      </Canvas>
      {!isLoading && <UI />}
    </>
  )
}

export default App

