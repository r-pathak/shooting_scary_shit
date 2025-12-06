import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier'
import { useRef, useEffect, Suspense, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Billboard, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import type { Enemy as EnemyType } from './store'
import { useStore } from './store'

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

// Zombie model using FBX directly (since FBX has matching skeleton + animations)
const ZombieModel = ({ animState, scale: zombieScale }: { animState: AnimState, scale: number }) => {
    const [model, setModel] = useState<THREE.Group | null>(null)
    const [animations, setAnimations] = useState<THREE.AnimationClip[]>([])
    const groupRef = useRef<THREE.Group>(null)
    
    // Load the idle FBX as our base model (it includes mesh + skeleton)
    useEffect(() => {
        const loader = new FBXLoader()
        const clips: THREE.AnimationClip[] = []
        
        // Load base model from idle animation (includes mesh)
        loader.load('/zombie_idle.fbx', (fbx) => {
            fbx.scale.setScalar(0.01) // FBX is in cm, convert to meters
            setModel(fbx)
            
            if (fbx.animations.length > 0) {
                const clip = fbx.animations[0].clone()
                clip.name = 'idle'
                clips.push(clip)
            }
            
            // Load other animations
            loader.load('/zombie_attack.fbx', (attackFbx) => {
                if (attackFbx.animations.length > 0) {
                    const clip = attackFbx.animations[0].clone()
                    clip.name = 'attack'
                    clips.push(clip)
                }
                
                loader.load('/zombie_die.fbx', (dieFbx) => {
                    if (dieFbx.animations.length > 0) {
                        const clip = dieFbx.animations[0].clone()
                        clip.name = 'die'
                        clips.push(clip)
                    }
                    
                    // Load walk animation
                    loader.load('/zombie_walk.fbx', (walkFbx) => {
                        if (walkFbx.animations.length > 0) {
                            const clip = walkFbx.animations[0].clone()
                            clip.name = 'walk'
                            clips.push(clip)
                        }
                        setAnimations([...clips])
                    }, undefined, () => {
                        // If walk animation doesn't exist, use idle as fallback
                        const walkClip = clips.find(c => c.name === 'idle')?.clone()
                        if (walkClip) {
                            walkClip.name = 'walk'
                            clips.push(walkClip)
                        }
                        setAnimations([...clips])
                    })
                })
            })
        })
    }, [])
    
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
    
    if (!clone) return <GeometricZombie color="#3a5a37" />
    
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
  
  const speed = type === 'runner' ? 4 : (type === 'tank' ? 1.5 : 2.5)
  const scale = type === 'tank' ? 1.4 : (type === 'runner' ? 0.85 : 1)
  const maxHealth = type === 'tank' ? 300 : (type === 'runner' ? 50 : 100)

  useEffect(() => {
    if (body.current) {
        // @ts-ignore
        body.current.userData = { type: 'enemy', id: id }
    }
  }, [id])

  useFrame(() => {
    if (!body.current) return
    const pos = body.current.translation()
    const enemyPos = new THREE.Vector3(pos.x, pos.y, pos.z)
    
    const distToPlayer = enemyPos.distanceTo(playerPosition)
    
    if (distToPlayer <= 2) {
        setAnimState('attack')
        const vel = body.current.linvel()
        body.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
    } else {
        setAnimState('walk')
        const direction = new THREE.Vector3()
        direction.subVectors(playerPosition, enemyPos).normalize().multiplyScalar(speed)
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

  useFrame((_, delta) => {
      const score = useStore.getState().score
      const enemyCount = useStore.getState().enemies.length
      
      const baseInterval = 2.5
      const speedBonus = Math.min(score / 1000, 1.5)
      const spawnInterval = Math.max(1.0, baseInterval - speedBonus)
      const maxEnemies = Math.min(25, 10 + Math.floor(score / 500))
      
      spawnTimerRef.current += delta
      if (spawnTimerRef.current >= spawnInterval && enemyCount < maxEnemies) {
          spawnEnemy()
          spawnTimerRef.current = 0
      }
  })
  
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
