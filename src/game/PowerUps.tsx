import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { useStore } from './store'
import type { PowerUpType } from './store'

// Colors for each power-up type
const POWERUP_COLORS: Record<PowerUpType, string> = {
  raygun: '#9932CC',  // Purple
  shield: '#00BFFF',  // Blue
  speed: '#32CD32',   // Green
  slowmo: '#FFD700',  // Gold
  noreload: '#FF4500' // Orange-Red
}

const POWERUP_EMISSIVE: Record<PowerUpType, string> = {
  raygun: '#6B238E',
  shield: '#0080FF',
  speed: '#228B22',
  slowmo: '#DAA520',
  noreload: '#CC3700'
}

// Individual power-up pickup
const PowerUpPickup = ({ id, type, position }: { id: string, type: PowerUpType, position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const collectPowerUp = useStore(state => state.collectPowerUp)
  
  useFrame((_, delta) => {
    if (!meshRef.current) return
    
    // Don't process if game is over
    if (useStore.getState().isGameOver) return
    
    // Rotate and bob
    meshRef.current.rotation.y += delta * 2
    meshRef.current.position.y = position[1] + Math.sin(Date.now() * 0.003) * 0.3
    
    // Check if player is close enough to collect
    const dist = camera.position.distanceTo(new THREE.Vector3(position[0], position[1], position[2]))
    if (dist < 2) {
      collectPowerUp(id)
    }
  })
  
  return (
    <group position={position}>
      {/* Glowing orb */}
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color={POWERUP_COLORS[type]} 
          emissive={POWERUP_EMISSIVE[type]}
          emissiveIntensity={2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Point light for glow effect */}
      <pointLight 
        color={POWERUP_COLORS[type]} 
        intensity={3} 
        distance={8}
      />
      
      {/* Floating ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.05, 8, 32]} />
        <meshStandardMaterial 
          color={POWERUP_COLORS[type]}
          emissive={POWERUP_EMISSIVE[type]}
          emissiveIntensity={1}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}

// Health pickup (heart shape)
const HealthPickup = ({ id, amount, position }: { id: string, amount: 20 | 30, position: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const collectHealthPickup = useStore(state => state.collectHealthPickup)
  
  useFrame((_, delta) => {
    if (!groupRef.current) return
    
    // Don't process if game is over
    if (useStore.getState().isGameOver) return
    
    // Rotate and bob
    groupRef.current.rotation.y += delta * 1.5
    groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.004) * 0.2
    
    // Check if player is close enough to collect
    const dist = camera.position.distanceTo(new THREE.Vector3(position[0], position[1], position[2]))
    if (dist < 2) {
      collectHealthPickup(id)
    }
  })
  
  return (
    <group ref={groupRef} position={position}>
      {/* Heart shape made from two spheres and a cone */}
      <group scale={0.6}>
        {/* Left lobe */}
        <mesh position={[-0.25, 0.2, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial 
            color="#FF1744" 
            emissive="#AA0000"
            emissiveIntensity={1}
          />
        </mesh>
        {/* Right lobe */}
        <mesh position={[0.25, 0.2, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial 
            color="#FF1744" 
            emissive="#AA0000"
            emissiveIntensity={1}
          />
        </mesh>
        {/* Bottom point */}
        <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.45, 0.6, 16]} />
          <meshStandardMaterial 
            color="#FF1744" 
            emissive="#AA0000"
            emissiveIntensity={1}
          />
        </mesh>
      </group>
      
      {/* Amount text */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.4}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        +{amount}
      </Text>
      
      {/* Glow */}
      <pointLight 
        color="#FF1744" 
        intensity={2} 
        distance={6}
      />
    </group>
  )
}

export const PowerUps = () => {
  const powerUps = useStore(state => state.powerUps)
  const healthPickups = useStore(state => state.healthPickups)
  const health = useStore(state => state.health)
  const spawnPowerUp = useStore(state => state.spawnPowerUp)
  const spawnHealthPickup = useStore(state => state.spawnHealthPickup)
  const cleanExpiredPowerUps = useStore(state => state.cleanExpiredPowerUps)
  const spawnTimerRef = useRef(0)
  const healthSpawnTimerRef = useRef(0)
  
  // Spawn power-ups and health pickups periodically
  useFrame((_, delta) => {
    // Don't process if game is over
    if (useStore.getState().isGameOver) return
    
    spawnTimerRef.current += delta
    healthSpawnTimerRef.current += delta
    
    // Spawn power-ups (max 2 on the field at once, every 20-30 seconds)
    if (spawnTimerRef.current > 20 + Math.random() * 10 && powerUps.length < 2) {
      spawnPowerUp()
      spawnTimerRef.current = 0
    }
    
    // Only spawn health pickup if health is below 50 and none on field (every 15-25 seconds)
    if (healthSpawnTimerRef.current > 15 + Math.random() * 10 && healthPickups.length === 0 && health < 50) {
      spawnHealthPickup()
      healthSpawnTimerRef.current = 0
    }
    
    // Clean expired active power-ups periodically
    cleanExpiredPowerUps()
  })
  
  // Spawn first power-up after 15 seconds (if none exist)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (useStore.getState().powerUps.length === 0) {
        spawnPowerUp()
      }
    }, 15000)
    return () => clearTimeout(timer)
  }, [spawnPowerUp])
  
  // Spawn first health pickup after 10 seconds (if none exist)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (useStore.getState().healthPickups.length === 0) {
        spawnHealthPickup()
      }
    }, 10000)
    return () => clearTimeout(timer)
  }, [spawnHealthPickup])
  
  return (
    <>
      {powerUps.map(powerUp => (
        <PowerUpPickup 
          key={powerUp.id} 
          id={powerUp.id}
          type={powerUp.type} 
          position={powerUp.position} 
        />
      ))}
      {healthPickups.map(pickup => (
        <HealthPickup
          key={pickup.id}
          id={pickup.id}
          amount={pickup.amount}
          position={pickup.position}
        />
      ))}
    </>
  )
}
