import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { PointerLockControls } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { World } from './game/World'
import { Player } from './game/Player'
import { Enemies } from './game/Enemies'
import { UI } from './game/UI'
import { AssetLoader } from './game/AssetLoader'
import { ZombieModelProvider } from './game/ZombieModelLoader'
import { Stars } from './game/Stars'
import { PowerUps } from './game/PowerUps'
import { useStore } from './game/store'

// Powerful flashlight that follows camera
const Flashlight = () => {
  const { camera } = useThree()
  const lightRef = useRef<THREE.SpotLight>(null)
  
  useFrame(() => {
    if (lightRef.current) {
      // Position light at camera position
      lightRef.current.position.copy(camera.position)
      // Point light in camera direction
      const direction = new THREE.Vector3(0, 0, -1)
      direction.applyQuaternion(camera.quaternion)
      lightRef.current.target.position.copy(camera.position).add(direction)
      lightRef.current.target.updateMatrixWorld()
    }
  })
  
  return (
    <spotLight
      ref={lightRef}
      intensity={8}
      angle={1.2}
      penumbra={0.4}
      distance={200}
      decay={1}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-far={200}
      shadow-bias={-0.0001}
      color="#fff8e1"
    />
  )
}

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
      {/* Game Title */}
      <h1 style={{ 
        fontSize: '56px', 
        marginBottom: '10px',
        color: '#FFD700',
        textShadow: '0 0 20px #FFD700, 0 0 40px #FF6600',
        letterSpacing: '4px'
      }}>
        SHOOTING SCARY BASTARDS
      </h1>
      <a 
        href="https://www.linkedin.com/in/rohan--pathak/?skipRedirect=true"
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          fontSize: '20px', 
          marginBottom: '40px',
          color: '#aaa',
          fontStyle: 'italic',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#FFD700'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
      >
        by rohan pathak
      </a>
      
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
      <p style={{ marginTop: '20px', fontSize: '18px', color: '#666' }}>
        Loading assets...
      </p>
    </div>
  )
}

function App() {
  const isLoading = useStore(state => state.isLoading)
  const isGameOver = useStore(state => state.isGameOver)
  
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
        frameloop={isGameOver ? 'demand' : 'always'}
      >
        <AssetLoader />
        
        {/* Night time background */}
        <color attach="background" args={['#000011']} />
        
        {/* Stars in the sky */}
        {!isLoading && !isGameOver && <Stars />}
        
        {/* Night time lighting - slightly brighter ambient */}
        <ambientLight intensity={0.2} />
        
        {/* Flashlight attached to camera */}
        {!isLoading && !isGameOver && <Flashlight />}
        
        {!isLoading && !isGameOver && (
          <Suspense fallback={null}>
            <ZombieModelProvider>
              <Physics 
                gravity={[0, -9.81, 0]}
                timeStep="vary"
              >
                <Player />
                <World />
                <Enemies />
                <PowerUps />
              </Physics>
            </ZombieModelProvider>
          </Suspense>
        )}
        
        {!isLoading && !isGameOver && <PointerLockControls />}
      </Canvas>
      {!isLoading && <UI />}
    </>
  )
}

export default App

