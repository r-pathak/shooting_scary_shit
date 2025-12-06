import * as THREE from 'three'
import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier'
import { Vector3 } from 'three'
import { useStore, WEAPONS } from './store'
import { enemyPositionMap } from './Enemies'

const SPEED = 5
const JUMP_FORCE = 1

export const Player = () => {
  const body = useRef<RapierRigidBody>(null)
  const { camera } = useThree()
  const moveConfig = useRef({ forward: false, backward: false, left: false, right: false, jump: false })
  
  const lastShootRef = useRef(0)
  const [showMuzzleFlash, setShowMuzzleFlash] = useState(false)
  const weaponKickRef = useRef(0)
  const weaponBobRef = useRef(0)
  
  // Weapon group ref for real-time updates
  const weaponGroupRef = useRef<THREE.Group>(null)

  const isMouseDown = useRef(false)
  const isReloadingRef = useRef(false)
  const isGroundedRef = useRef(true)
  const groundCheckTimer = useRef(0)

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': moveConfig.current.forward = true; break;
        case 'KeyS': moveConfig.current.backward = true; break;
        case 'KeyA': moveConfig.current.left = true; break;
        case 'KeyD': moveConfig.current.right = true; break;
        case 'Space': 
          e.preventDefault()
          moveConfig.current.jump = true
          break;
        case 'Digit1': useStore.getState().setWeapon('Pistol'); break;
        case 'Digit2': useStore.getState().setWeapon('SMG'); break;
        case 'Digit3': useStore.getState().setWeapon('Rifle'); break;
        case 'KeyR': handleReload(); break;
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': moveConfig.current.forward = false; break;
        case 'KeyS': moveConfig.current.backward = false; break;
        case 'KeyA': moveConfig.current.left = false; break;
        case 'KeyD': moveConfig.current.right = false; break;
        case 'Space': moveConfig.current.jump = false; break;
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Mouse controls
  useEffect(() => {
      const down = () => { isMouseDown.current = true }
      const up = () => { isMouseDown.current = false }
      document.addEventListener('mousedown', down)
      document.addEventListener('mouseup', up)
      return () => {
          document.removeEventListener('mousedown', down)
          document.removeEventListener('mouseup', up)
      }
  }, [])

  const handleReload = () => {
      if (isReloadingRef.current) return
      const stats = WEAPONS[useStore.getState().currentWeapon]
      isReloadingRef.current = true
      useStore.getState().setReloading(true)

      setTimeout(() => {
          useStore.getState().reload()
          isReloadingRef.current = false
      }, stats.reloadTime)
  }

  const attemptShoot = () => {
      if (isReloadingRef.current) return
      const stats = WEAPONS[useStore.getState().currentWeapon]
      if (Date.now() - lastShootRef.current < stats.fireRate) return 
      
      const didShoot = useStore.getState().shootAmmo()
      if (didShoot) {
          lastShootRef.current = Date.now()
          performRaycast()
          
          // Visual feedback
          setShowMuzzleFlash(true)
          weaponKickRef.current = 0.15
          setTimeout(() => setShowMuzzleFlash(false), 60)
      } else {
          handleReload()
      }
  }

  const performRaycast = () => {
      const stats = WEAPONS[useStore.getState().currentWeapon]
      const rayOrigin = camera.position.clone()
      const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      
      // Get all enemies and check if ray hits any of them
      const enemies = useStore.getState().enemies
      let closestHit: { id: string, distance: number, isHeadshot: boolean } | null = null
      
      for (const enemy of enemies) {
          if (enemy.health <= 0) continue // Skip dead enemies
          
          // Get current position from the position map
          const currentPos = enemyPositionMap.get(enemy.id)
          if (!currentPos) continue
          
          // Enemy position is at their feet, offset to body center based on type
          const scale = enemy.type === 'tank' ? 1.4 : (enemy.type === 'runner' ? 0.85 : 1)
          const bodyHeight = 1.0 * scale // Center of body
          const enemyPos = new THREE.Vector3(currentPos[0], currentPos[1] + bodyHeight, currentPos[2])
          
          // Vector from ray origin to enemy
          const toEnemy = enemyPos.clone().sub(rayOrigin)
          
          // Project enemy position onto ray direction
          const projectionLength = toEnemy.dot(rayDir)
          
          // Skip if enemy is behind us
          if (projectionLength < 0) continue
          
          // Find closest point on ray to enemy
          const closestPoint = rayOrigin.clone().add(rayDir.clone().multiplyScalar(projectionLength))
          
          // Distance from ray to enemy center
          const distanceToRay = closestPoint.distanceTo(enemyPos)
          
          // Hit radius based on enemy type - tanks are 1.4x scale so bigger hitbox
          const hitRadius = enemy.type === 'tank' ? 1.5 : (enemy.type === 'runner' ? 0.5 : 0.7)
          
          // Check if ray passes close enough to enemy
          if (distanceToRay < hitRadius && projectionLength < 100) {
              // Check if this is the closest hit
              if (!closestHit || projectionLength < closestHit.distance) {
                  // Check for headshot (hit point is above enemy center)
                  const hitHeight = closestPoint.y - enemyPos.y
                  const isHeadshot = hitHeight > 0.5
                  
                  closestHit = {
                      id: enemy.id,
                      distance: projectionLength,
                      isHeadshot
                  }
              }
          }
      }
      
      // Apply damage to closest hit enemy
      if (closestHit) {
          const damage = closestHit.isHeadshot ? stats.damage * 2.5 : stats.damage
          useStore.getState().damageEnemy(closestHit.id, damage)
          
          if (closestHit.isHeadshot) {
              console.log('HEADSHOT!')
          }
      }
  }

  // Main game loop
  useFrame((_state, delta) => {
      // Handle shooting
      if (isMouseDown.current) {
          attemptShoot()
      }
      
      // Weapon kick recovery
      weaponKickRef.current = THREE.MathUtils.lerp(weaponKickRef.current, 0, delta * 10)
      
      // Check if moving for weapon bob
      const isMoving = moveConfig.current.forward || moveConfig.current.backward || 
                       moveConfig.current.left || moveConfig.current.right
      if (isMoving) {
          weaponBobRef.current += delta * 10
      }
      
      if (!body.current) return
      const pos = body.current.translation()
      camera.position.set(pos.x, pos.y + 1.0, pos.z)
      
      // Update weapon position to follow camera
      if (weaponGroupRef.current) {
          // Base offset from camera (right, down, forward)
          const baseOffset = new THREE.Vector3(0.35, -0.25, -0.6)
          
          // Add bob when walking
          if (isMoving) {
              baseOffset.x += Math.sin(weaponBobRef.current) * 0.02
              baseOffset.y += Math.abs(Math.cos(weaponBobRef.current * 2)) * 0.015
          }
          
          // Add kick when shooting
          baseOffset.z += weaponKickRef.current
          
          // Transform to world space
          const worldOffset = baseOffset.clone().applyQuaternion(camera.quaternion)
          weaponGroupRef.current.position.copy(camera.position).add(worldOffset)
          weaponGroupRef.current.quaternion.copy(camera.quaternion)
      }
      
      const { forward, backward, left, right, jump } = moveConfig.current
      const frontVector = new Vector3(0, 0, (backward ? 1 : 0) - (forward ? 1 : 0))
      const sideVector = new Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, 0)
      const direction = new Vector3()
      direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(SPEED).applyEuler(camera.rotation)
      const vel = body.current.linvel()
      body.current.setLinvel({ x: direction.x, y: vel.y, z: direction.z }, true)
      
      // Ground check - if vertical velocity is very low for a bit, we're grounded
      if (Math.abs(vel.y) < 0.5) {
          groundCheckTimer.current += delta
          if (groundCheckTimer.current > 0.1) {
              isGroundedRef.current = true
          }
      } else {
          groundCheckTimer.current = 0
          isGroundedRef.current = false
      }
      
      // Only allow jump when grounded
      if (jump && isGroundedRef.current) {
         body.current.applyImpulse({ x: 0, y: JUMP_FORCE * 5, z: 0 }, true)
         isGroundedRef.current = false
         groundCheckTimer.current = 0
      }
  })

  const currentWeapon = useStore(state => state.currentWeapon)

  return (
    <>
        <RigidBody 
            ref={body} 
            colliders={false} 
            mass={1} 
            type="dynamic" 
            position={[0, 1.4, 0]} 
            enabledRotations={[false, false, false]}
            onCollisionEnter={({ other }) => {
                // @ts-ignore
                if (other.rigidBodyObject?.userData?.type === 'enemy') {
                    useStore.getState().decreaseHealth(10)
                }
            }}
        >
          <CapsuleCollider args={[0.4, 0.5]} position={[0, 0.5, 0]} />
        </RigidBody>
        
        {/* FPS Weapon - updated every frame in useFrame */}
        <group ref={weaponGroupRef}>
            {currentWeapon === 'Pistol' && (
                <group scale={2}>
                    {/* Slide */}
                    <mesh position={[0, 0.02, -0.08]}>
                        <boxGeometry args={[0.04, 0.06, 0.18]} />
                        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
                    </mesh>
                    {/* Frame */}
                    <mesh position={[0, -0.02, 0]}>
                        <boxGeometry args={[0.035, 0.04, 0.12]} />
                        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
                    </mesh>
                    {/* Grip */}
                    <mesh position={[0, -0.08, 0.04]}>
                        <boxGeometry args={[0.035, 0.1, 0.055]} />
                        <meshStandardMaterial color="#3d3d3d" roughness={0.6} />
                    </mesh>
                    {/* Trigger guard */}
                    <mesh position={[0, -0.04, -0.01]}>
                        <boxGeometry args={[0.02, 0.03, 0.04]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>
                    {/* Muzzle flash */}
                    {showMuzzleFlash && (
                        <mesh position={[0, 0.02, -0.22]}>
                            <sphereGeometry args={[0.03, 8, 8]} />
                            <meshBasicMaterial color="#ffaa00" />
                        </mesh>
                    )}
                </group>
            )}
            {currentWeapon === 'SMG' && (
                <group scale={1.8}>
                    {/* Barrel */}
                    <mesh position={[0, 0, -0.18]}>
                        <boxGeometry args={[0.04, 0.04, 0.28]} />
                        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
                    </mesh>
                    {/* Receiver */}
                    <mesh position={[0, 0, 0.02]}>
                        <boxGeometry args={[0.055, 0.07, 0.16]} />
                        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
                    </mesh>
                    {/* Magazine */}
                    <mesh position={[0, -0.1, 0]}>
                        <boxGeometry args={[0.035, 0.14, 0.05]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    {/* Stock */}
                    <mesh position={[0, 0, 0.14]}>
                        <boxGeometry args={[0.035, 0.055, 0.08]} />
                        <meshStandardMaterial color="#3d3d3d" />
                    </mesh>
                    {/* Grip */}
                    <mesh position={[0, -0.06, 0.08]}>
                        <boxGeometry args={[0.03, 0.07, 0.04]} />
                        <meshStandardMaterial color="#3d3d3d" roughness={0.6} />
                    </mesh>
                    {/* Muzzle flash */}
                    {showMuzzleFlash && (
                        <mesh position={[0, 0, -0.35]}>
                            <sphereGeometry args={[0.04, 8, 8]} />
                            <meshBasicMaterial color="#ffaa00" />
                        </mesh>
                    )}
                </group>
            )}
            {currentWeapon === 'Rifle' && (
                <group scale={1.5}>
                    {/* Barrel */}
                    <mesh position={[0, 0, -0.32]}>
                        <boxGeometry args={[0.035, 0.035, 0.4]} />
                        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
                    </mesh>
                    {/* Receiver */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.055, 0.08, 0.24]} />
                        <meshStandardMaterial color="#4a4036" />
                    </mesh>
                    {/* Magazine */}
                    <mesh position={[0, -0.11, -0.02]}>
                        <boxGeometry args={[0.035, 0.14, 0.07]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    {/* Stock */}
                    <mesh position={[0, -0.01, 0.18]}>
                        <boxGeometry args={[0.04, 0.07, 0.14]} />
                        <meshStandardMaterial color="#5a4a3a" />
                    </mesh>
                    {/* Scope */}
                    <mesh position={[0, 0.06, 0]}>
                        <boxGeometry args={[0.025, 0.035, 0.1]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    {/* Grip */}
                    <mesh position={[0, -0.06, 0.1]}>
                        <boxGeometry args={[0.03, 0.06, 0.04]} />
                        <meshStandardMaterial color="#3d3d3d" roughness={0.6} />
                    </mesh>
                    {/* Muzzle flash */}
                    {showMuzzleFlash && (
                        <mesh position={[0, 0, -0.55]}>
                            <sphereGeometry args={[0.05, 8, 8]} />
                            <meshBasicMaterial color="#ffaa00" />
                        </mesh>
                    )}
                </group>
            )}
        </group>
    </>
  )
}
