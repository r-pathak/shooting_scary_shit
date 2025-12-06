import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier'
import { useRef, useEffect, Suspense, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Billboard, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import type { Enemy as EnemyType } from './store'
import { useStore } from './store'
import { useZombieModel } from './ZombieModelLoader'

// Global map to track enemy rigid bodies by handle
export const enemyBodyMap = new Map<number, string>()

// Global map to track current enemy positions
export const enemyPositionMap = new Map<string, [number, number, number]>()

// Health bar component that always faces camera
const HealthBar = ({ health, maxHealth, yOffset }: { health: number, maxHealth: number, yOffset: number }) => {
    const healthPercent = Math.max(0, health / maxHealth)
    const barWidth = 0.8
    
    return (
        <Billboard position={[0, yOffset, 0]} follow={true}>
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[barWidth + 0.08, 0.12]} />
                <meshBasicMaterial color="#222" />
            </mesh>
            <mesh position={[(healthPercent - 1) * barWidth / 2, 0, 0]}>
                <planeGeometry args={[barWidth * healthPercent, 0.08]} />
                <meshBasicMaterial color={healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'} />
            </mesh>
        </Billboard>
    )
}

type AnimState = 'walk' | 'attack' | 'die' | 'idle'

// Zombie model using preloaded shared model
const ZombieModel = ({ animState, scale: zombieScale }: { animState: AnimState, scale: number }) => {
    const { model, animations, isLoading } = useZombieModel()
    const groupRef = useRef<THREE.Group>(null)
    
    // Clone for each instance
    const clone = useMemo(() => {
        if (!model) return null
        return SkeletonUtils.clone(model)
    }, [model])
    
    const { actions } = useAnimations(animations, clone || undefined)
    
    // Play animation based on state
    useEffect(() => {
        if (!clone || Object.keys(actions).length === 0) return
        
        // Fade out all
        Object.values(actions).forEach(action => {
            if (action?.isRunning()) {
                action.fadeOut(0.2)
            }
        })
        
        // Play the right animation
        const action = actions[animState]
        if (action) {
            action.reset().fadeIn(0.2).play()
            
            if (animState === 'die') {
                action.setLoop(THREE.LoopOnce, 1)
                action.clampWhenFinished = true
            }
        } else if (actions['idle']) {
            actions['idle']?.reset().fadeIn(0.2).play()
        }
    }, [animState, actions, clone])
    
    if (!clone || isLoading) {
        return <GeometricZombie color="#3a5a37" />
    }
    
    return (
        <group ref={groupRef} scale={zombieScale}>
            <primitive object={clone} />
        </group>
    )
}

// Fallback geometric zombie
const GeometricZombie = ({ color }: { color: string }) => (
    <group>
        <mesh castShadow position={[0, 0.9, 0]}>
            <capsuleGeometry args={[0.25, 0.6, 4, 8]} />
            <meshStandardMaterial color={color} />
        </mesh>
        <mesh castShadow position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.07, 1.55, 0.15]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color="#ff0000" />
        </mesh>
        <mesh position={[-0.07, 1.55, 0.15]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color="#ff0000" />
        </mesh>
    </group>
)

const Zombie = ({ id, position, health, playerPosition, type }: EnemyType & { playerPosition: THREE.Vector3 }) => {
  const body = useRef<RapierRigidBody>(null)
  const group = useRef<THREE.Group>(null)
  const [animState, setAnimState] = useState<AnimState>('walk')
  
  // Player speed is 6, zombies are slower. Tanks are very slow
  const speed = type === 'runner' ? 3 : (type === 'tank' ? 0.6 : 2)
  const scale = type === 'tank' ? 1.15 : (type === 'runner' ? 0.85 : 1)
  const maxHealth = type === 'tank' ? 300 : (type === 'runner' ? 50 : 100)

  useEffect(() => {
    // Small delay to ensure physics body is initialized
    const timer = setTimeout(() => {
      if (body.current) {
        // Register this enemy's handle in the global map
        // @ts-ignore - accessing raw rapier handle
        const handle = body.current.handle
        enemyBodyMap.set(handle, id)
      }
    }, 100)
    return () => {
      clearTimeout(timer)
      if (body.current) {
        // @ts-ignore
        enemyBodyMap.delete(body.current.handle)
      }
      enemyPositionMap.delete(id)
    }
  }, [id])

  const frameCounterRef = useRef(0)
  
  // Check if health is 0 or below and play die animation
  useEffect(() => {
    if (health <= 0) {
      setAnimState('die')
      // Remove from maps so they can't be hit again
      if (body.current) {
        enemyBodyMap.delete(body.current.handle)
      }
      enemyPositionMap.delete(id)
    }
  }, [health, id])
  
  useFrame(() => {
    if (!body.current) return
    
    // Always update position in the global map for hit detection
    const pos = body.current.translation()
    enemyPositionMap.set(id, [pos.x, pos.y, pos.z])
    
    // Don't move if dead or game is over
    const isGameOver = useStore.getState().isGameOver
    if (health <= 0 || isGameOver) {
      const vel = body.current.linvel()
      body.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
      return
    }
    
    // Optimize: Only update every 2 frames (30fps instead of 60fps for AI)
    frameCounterRef.current++
    if (frameCounterRef.current % 2 !== 0) return
    
    const enemyPos = new THREE.Vector3(pos.x, pos.y, pos.z)
    
    const distToPlayer = enemyPos.distanceTo(playerPosition)
    
    // Distance culling: Don't update enemies far away
    if (distToPlayer > 100) return
    
    // Attack radius of 1.5 units - deal damage when in range
    if (distToPlayer <= 1.5) {
        setAnimState('attack')
        const vel = body.current.linvel()
        body.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
        
        // Deal damage periodically when in attack range (every ~1 second)
        if (frameCounterRef.current % 60 === 0) {
            useStore.getState().decreaseHealth(10)
        }
    } else {
        setAnimState('walk')
        const direction = new THREE.Vector3()
        // Slow-mo power-up reduces enemy speed to 25%
        const hasSlowMo = useStore.getState().hasPowerUp('slowmo')
        const effectiveSpeed = hasSlowMo ? speed * 0.25 : speed
        direction.subVectors(playerPosition, enemyPos).normalize().multiplyScalar(effectiveSpeed)
        const vel = body.current.linvel()
        body.current.setLinvel({ x: direction.x, y: vel.y, z: direction.z }, true)
    }
    
    // Rotate to face player
    const direction = new THREE.Vector3()
    direction.subVectors(playerPosition, enemyPos)
    const targetAngle = Math.atan2(direction.x, direction.z)
    
    if (group.current) {
        const currentRotation = group.current.rotation.y
        let diff = targetAngle - currentRotation
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        group.current.rotation.y += diff * 0.1
    }
  })

  return (
    <RigidBody 
        ref={body} 
        position={position} 
        lockRotations 
        type="dynamic" 
        colliders={false}
        userData={{ type: 'enemy', id: id }}
    >
      <CapsuleCollider args={[0.5 * scale, 0.25 * scale]} position={[0, 0.9 * scale, 0]} />
      
      <group ref={group} scale={scale}>
          <Suspense fallback={<GeometricZombie color="#3a5a37" />}>
              <ZombieModel animState={animState} scale={scale} />
          </Suspense>
          <HealthBar health={health} maxHealth={maxHealth} yOffset={2.2} />
      </group>
    </RigidBody>
  )
}

export const Enemies = () => {
  const enemies = useStore(state => state.enemies)
  const spawnEnemy = useStore(state => state.spawnEnemy)
  const playerPosition = useRef(new THREE.Vector3())
  const spawnTimerRef = useRef(0)
  const updateCounterRef = useRef(0)

  // Optimize spawn logic - only check every few frames
  useFrame((_, delta) => {
      // Don't spawn if game is over
      if (useStore.getState().isGameOver) return
      
      updateCounterRef.current++
      // Only update spawn logic every 10 frames (roughly 6 times per second at 60fps)
      if (updateCounterRef.current % 10 === 0) {
          const score = useStore.getState().score
          const enemyCount = useStore.getState().enemies.length
          
          const baseInterval = 3.0
          const speedBonus = Math.min(score / 1000, 1.8)
          const spawnInterval = Math.max(1.2, baseInterval - speedBonus)
          const maxEnemies = Math.min(20, 10 + Math.floor(score / 500))
          
          spawnTimerRef.current += delta * 10 // Multiply by 10 since we're checking less frequently
          if (spawnTimerRef.current >= spawnInterval && enemyCount < maxEnemies) {
              spawnEnemy()
              spawnTimerRef.current = 0
          }
      }
  })
  
  // Update player position every frame (needed for enemy AI)
  useFrame(({ camera }) => {
     playerPosition.current.copy(camera.position)
     playerPosition.current.y = 0
  })

  return (
    <>
      {enemies.map(enemy => (
        <Zombie 
            key={enemy.id} 
            {...enemy} 
            playerPosition={playerPosition.current} 
        />
      ))}
    </>
  )
}
