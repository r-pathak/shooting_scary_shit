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

// Helper to fix material transparency issues on cloned models
const fixMaterials = (object: THREE.Object3D) => {
    object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((mat: THREE.Material) => {
                // Force fix on ANY material type
                mat.transparent = false
                mat.depthWrite = true
                mat.depthTest = true
                mat.side = THREE.FrontSide
                mat.needsUpdate = true
                
                // Additional properties for materials that have them
                if ('opacity' in mat) (mat as any).opacity = 1
                if ('alphaTest' in mat) (mat as any).alphaTest = 0
            })
        }
    })
}

// Zombie model using preloaded shared model
const ZombieModel = ({ animState, scale: zombieScale }: { animState: AnimState, scale: number }) => {
    const { model, animations, isLoading } = useZombieModel()
    const groupRef = useRef<THREE.Group>(null)
    
    // Clone for each instance and fix materials
    const clone = useMemo(() => {
        if (!model) return null
        const cloned = SkeletonUtils.clone(model)
        fixMaterials(cloned)
        return cloned
    }, [model])
    
    const { actions } = useAnimations(animations, clone || undefined)
    
    // Randomly pick a death animation once per zombie (stable across re-renders)
    const deathAnim = useMemo(() => {
        return Math.random() < 0.5 ? 'die' : 'die2'
    }, [])
    
    // Play animation based on state
    useEffect(() => {
        if (!clone || Object.keys(actions).length === 0) return
        
        // Fade out all
        Object.values(actions).forEach(action => {
            if (action?.isRunning()) {
                action.fadeOut(0.2)
            }
        })
        
        // For death, use the randomly selected animation
        const animName = animState === 'die' ? deathAnim : animState
        
        // Play the right animation
        const action = actions[animName]
        if (action) {
            action.reset().fadeIn(0.2).play()
            
            if (animState === 'die') {
                action.setLoop(THREE.LoopOnce, 1)
                action.clampWhenFinished = true
            }
        } else if (actions['idle']) {
            actions['idle']?.reset().fadeIn(0.2).play()
        }
    }, [animState, actions, clone, deathAnim])
    
    // Don't render anything until the model is ready - no geometric fallbacks
    if (!clone || isLoading) {
        return null
    }
    
    return (
        <group ref={groupRef} scale={zombieScale}>
            <primitive object={clone} />
        </group>
    )
}

const Zombie = ({ id, position, health, playerPosition, type }: EnemyType & { playerPosition: THREE.Vector3 }) => {
  const body = useRef<RapierRigidBody>(null)
  const group = useRef<THREE.Group>(null)
  const [animState, setAnimState] = useState<AnimState>('walk')
  
  // Player speed is 6, zombies are slower. Tanks are very slow
  const speed = type === 'runner' ? 3 : (type === 'tank' ? 0.6 : 2)
  const scale = type === 'tank' ? 1.15 : (type === 'runner' ? 0.85 : 1)
  const maxHealth = type === 'tank' ? 300 : (type === 'runner' ? 50 : 100)
  
  // Attack timing - only deal damage at the end of attack animation
  const attackStartTimeRef = useRef<number | null>(null)
  const attackDamageDealtRef = useRef(false)
  const ATTACK_DURATION = 0.8 // seconds - how long the attack animation takes before dealing damage
  const ATTACK_COOLDOWN = 1.5 // seconds - time between attacks

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
    
    const now = performance.now() / 1000 // Convert to seconds
    
    // Attack radius of 1.5 units
    if (distToPlayer <= 1.5) {
        // Start attack if not already attacking
        if (attackStartTimeRef.current === null) {
            attackStartTimeRef.current = now
            attackDamageDealtRef.current = false
            setAnimState('attack')
        }
        
        const vel = body.current.linvel()
        body.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
        
        // Deal damage only after attack animation completes, and only once per attack
        const attackElapsed = now - attackStartTimeRef.current
        if (attackElapsed >= ATTACK_DURATION && !attackDamageDealtRef.current) {
            // Only deal damage if still in range when attack finishes
            if (distToPlayer <= 1.8) {
                useStore.getState().decreaseHealth(15)
            }
            attackDamageDealtRef.current = true
        }
        
        // Reset attack after cooldown for next swing
        if (attackElapsed >= ATTACK_COOLDOWN) {
            attackStartTimeRef.current = null
            attackDamageDealtRef.current = false
        }
    } else {
        // Player moved away - reset attack state
        attackStartTimeRef.current = null
        attackDamageDealtRef.current = false
        
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
          <Suspense fallback={null}>
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
