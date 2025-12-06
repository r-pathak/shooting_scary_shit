import * as THREE from 'three'
import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier'
import { Vector3 } from 'three'
import { useStore, WEAPONS, burningEnemies } from './store'
import { enemyPositionMap } from './Enemies'

// Flamethrower constants
const FLAME_RANGE = 15
const FLAME_CONE_ANGLE = 0.8 // radians (~32 degrees) - wider spray
const FLAME_DOT_DAMAGE = 10 // damage per tick
const FLAME_DOT_TICKS = 8 // number of DOT ticks
const FLAME_DOT_INTERVAL = 300 // ms between ticks

const BASE_SPEED = 6
const JUMP_FORCE = 1


export const Player = () => {
  const body = useRef<RapierRigidBody>(null)
  const { camera } = useThree()
  const moveConfig = useRef({ forward: false, backward: false, left: false, right: false, jump: false })
  
  const lastShootRef = useRef(0)
  const [showMuzzleFlash, setShowMuzzleFlash] = useState(false)
  const [showFlame, setShowFlame] = useState(false)
  const weaponKickRef = useRef(0)
  const weaponBobRef = useRef(0)
  
  // Flame particle system
  const [flameParticles, setFlameParticles] = useState<Array<{
    id: number
    x: number
    y: number
    z: number
    vx: number
    vy: number
    vz: number
    life: number
    size: number
    color: string
  }>>([])
  const particleIdRef = useRef(0)
  
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
      
      // Check for flamethrower power-up
      const hasFlamethrower = useStore.getState().hasPowerUp('flamethrower')
      
      if (hasFlamethrower) {
          // Flamethrower: continuous fire, no ammo consumption, faster rate
          if (Date.now() - lastShootRef.current < 50) return // Very fast fire rate for particles
          
          lastShootRef.current = Date.now()
          performFlamethrowerAttack()
          
          // Spawn flame particles - wider spray pattern
          const newParticles: typeof flameParticles = []
          for (let i = 0; i < 8; i++) {
            const spread = 0.45 // Much wider spread
            const speed = 0.6 + Math.random() * 0.5
            newParticles.push({
              id: particleIdRef.current++,
              x: (Math.random() - 0.5) * 0.08,
              y: (Math.random() - 0.5) * 0.08,
              z: -0.35,
              vx: (Math.random() - 0.5) * spread,
              vy: (Math.random() - 0.5) * spread * 0.6 + 0.03, // More vertical spread too
              vz: -speed,
              life: 1.0,
              size: 0.04 + Math.random() * 0.05,
              color: ['#FFFF00', '#FFDD00', '#FFAA00', '#FF6600', '#FF3300', '#FF0000'][Math.floor(Math.random() * 6)]
            })
          }
          setFlameParticles(prev => [...prev.slice(-80), ...newParticles]) // Keep max 88 particles
          
          // Visual feedback - continuous flame
          setShowFlame(true)
          weaponKickRef.current = 0.05
      } else {
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
          const scale = enemy.type === 'tank' ? 1.15 : (enemy.type === 'runner' ? 0.85 : 1)
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
                  
          // Hit radius based on enemy type - tanks are 1.15x scale so slightly bigger hitbox
          const hitRadius = enemy.type === 'tank' ? 1.0 : (enemy.type === 'runner' ? 0.5 : 0.7)
          
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
          // Ray gun does massive damage: 150 for walkers (2-shot), 300 for others (1-shot)
          const hasRaygun = useStore.getState().hasPowerUp('raygun')
          let damage: number
          
          if (hasRaygun) {
              // Find enemy type for ray gun damage calculation
              const enemy = enemies.find(e => e.id === closestHit.id)
              damage = enemy?.type === 'walker' ? 150 : 300
          } else {
              damage = closestHit.isHeadshot ? stats.damage * 2.5 : stats.damage
          }
                  
          useStore.getState().damageEnemy(closestHit.id, damage)
                  
          if (closestHit.isHeadshot && !hasRaygun) {
                      console.log('HEADSHOT!')
          }
      }
  }

  // Flamethrower attack - cone-based damage with DOT
  const performFlamethrowerAttack = () => {
      const rayOrigin = camera.position.clone()
      const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      
      const enemies = useStore.getState().enemies
      
      for (const enemy of enemies) {
          if (enemy.health <= 0) continue
          
          const currentPos = enemyPositionMap.get(enemy.id)
          if (!currentPos) continue
          
          const scale = enemy.type === 'tank' ? 1.15 : (enemy.type === 'runner' ? 0.85 : 1)
          const bodyHeight = 1.0 * scale
          const enemyPos = new THREE.Vector3(currentPos[0], currentPos[1] + bodyHeight, currentPos[2])
          
          const toEnemy = enemyPos.clone().sub(rayOrigin)
          const distance = toEnemy.length()
          
          // Check if within flame range
          if (distance > FLAME_RANGE) continue
          
          // Check if within cone angle
          toEnemy.normalize()
          const angle = Math.acos(toEnemy.dot(rayDir))
          
          if (angle <= FLAME_CONE_ANGLE) {
              // Direct flame damage (small amount)
              useStore.getState().damageEnemy(enemy.id, 5)
              
              // Apply/refresh burning DOT
              burningEnemies.set(enemy.id, {
                  id: enemy.id,
                  damagePerTick: FLAME_DOT_DAMAGE,
                  ticksRemaining: FLAME_DOT_TICKS,
                  lastTickTime: Date.now()
              })
          }
      }
  }

  // Process burning DOT effects
  const processBurningEnemies = () => {
      const now = Date.now()
      
      for (const [enemyId, burning] of burningEnemies.entries()) {
          // Check if enemy still exists and is alive
          const enemy = useStore.getState().enemies.find(e => e.id === enemyId)
          if (!enemy || enemy.health <= 0) {
              burningEnemies.delete(enemyId)
              continue
          }
          
          // Check if it's time for next tick
          if (now - burning.lastTickTime >= FLAME_DOT_INTERVAL) {
              useStore.getState().damageEnemy(enemyId, burning.damagePerTick)
              burning.ticksRemaining--
              burning.lastTickTime = now
              
              if (burning.ticksRemaining <= 0) {
                  burningEnemies.delete(enemyId)
              }
          }
      }
  }

  // Main game loop
  useFrame((_state, delta) => {
      // Stop everything if game is over
      if (useStore.getState().isGameOver) {
          if (body.current) {
              const vel = body.current.linvel()
              body.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
          }
          return
      }
      
      // Don't allow actions until game has started
      if (!useStore.getState().gameStarted) {
          if (body.current) {
              const vel = body.current.linvel()
              body.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
          }
          return
      }
      
      // Process burning enemies DOT
      processBurningEnemies()
      
      // Handle shooting
      if (isMouseDown.current) {
          attemptShoot()
      } else {
          // Stop flame effect when not shooting
          setShowFlame(false)
      }
      
      // Update flame particles
      if (flameParticles.length > 0) {
        setFlameParticles(prev => prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * delta * 60,
            y: p.y + p.vy * delta * 60,
            z: p.z + p.vz * delta * 60,
            vy: p.vy + 0.002, // slight upward drift
            life: p.life - delta * 2.5,
            size: p.size * (1 + delta * 2) // grow as they travel
          }))
          .filter(p => p.life > 0)
        )
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
      // Speed boost increases movement speed by 30%
      const hasSpeedBoost = useStore.getState().hasPowerUp('speed')
      const currentSpeed = hasSpeedBoost ? BASE_SPEED * 1.3 : BASE_SPEED
      direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(currentSpeed).applyEuler(camera.rotation)
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
  const activePowerUps = useStore(state => state.activePowerUps)
  const hasRaygun = activePowerUps.some(p => p.type === 'raygun' && p.expiresAt > Date.now())
  const hasFlamethrower = activePowerUps.some(p => p.type === 'flamethrower' && p.expiresAt > Date.now())

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
            {/* Flamethrower - shown when flamethrower power-up is active */}
            {hasFlamethrower && (
                <group scale={1.6}>
                    {/* Main tank body */}
                    <mesh position={[0, -0.02, 0.05]}>
                        <cylinderGeometry args={[0.04, 0.04, 0.2, 16]} />
                        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
                    </mesh>
                    {/* Fuel tank (orange) */}
                    <mesh position={[0.06, -0.04, 0.08]}>
                        <cylinderGeometry args={[0.025, 0.025, 0.15, 12]} />
                        <meshStandardMaterial color="#FF6600" metalness={0.5} roughness={0.4} />
                    </mesh>
                    {/* Nozzle */}
                    <mesh position={[0, 0.01, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.015, 0.025, 0.16, 12]} />
                        <meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} />
                    </mesh>
                    {/* Pilot light */}
                    <mesh position={[0, 0.01, -0.28]}>
                        <sphereGeometry args={[0.012, 8, 8]} />
                        <meshStandardMaterial color="#FF4400" emissive="#FF4400" emissiveIntensity={2} />
                    </mesh>
                    {/* Grip */}
                    <mesh position={[0, -0.1, 0.02]}>
                        <boxGeometry args={[0.03, 0.08, 0.04]} />
                        <meshStandardMaterial color="#333" roughness={0.7} />
                    </mesh>
                    {/* Trigger */}
                    <mesh position={[0, -0.07, -0.04]}>
                        <boxGeometry args={[0.015, 0.025, 0.02]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>
                    {/* Flame particles when firing */}
                    {flameParticles.map(particle => (
                        <mesh 
                            key={particle.id} 
                            position={[particle.x, particle.y + 0.01, particle.z]}
                        >
                            <sphereGeometry args={[particle.size * particle.life, 6, 6]} />
                            <meshBasicMaterial 
                                color={particle.color} 
                                transparent 
                                opacity={particle.life * 0.9}
                            />
                        </mesh>
                    ))}
                    {/* Core flame glow at nozzle */}
                    {showFlame && (
                        <group position={[0, 0.01, -0.30]}>
                            <mesh>
                                <sphereGeometry args={[0.025, 8, 8]} />
                                <meshBasicMaterial color="#FFFFFF" />
                            </mesh>
                            <mesh>
                                <sphereGeometry args={[0.04, 8, 8]} />
                                <meshBasicMaterial color="#FFFF00" transparent opacity={0.8} />
                            </mesh>
                            <pointLight color="#FF6600" intensity={8} distance={20} />
                        </group>
                    )}
                </group>
            )}
            {/* Ray Gun - shown when raygun power-up is active (but not if flamethrower) */}
            {hasRaygun && !hasFlamethrower && (
                <group scale={1.8}>
                    {/* Main body - purple futuristic design */}
                    <mesh position={[0, 0, -0.1]}>
                        <boxGeometry args={[0.05, 0.06, 0.25]} />
                        <meshStandardMaterial color="#9932CC" metalness={0.8} roughness={0.2} emissive="#6B238E" emissiveIntensity={0.5} />
                    </mesh>
                    {/* Energy core - glowing center */}
                    <mesh position={[0, 0.02, 0.02]}>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshStandardMaterial color="#FF00FF" emissive="#FF00FF" emissiveIntensity={2} />
                    </mesh>
                    {/* Barrel - front section */}
                    <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.015, 0.025, 0.12, 16]} />
                        <meshStandardMaterial color="#7B68EE" metalness={0.9} roughness={0.1} />
                    </mesh>
                    {/* Energy rings around barrel */}
                    <mesh position={[0, 0, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.03, 0.005, 8, 16]} />
                        <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={1} />
                    </mesh>
                    <mesh position={[0, 0, -0.30]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.025, 0.005, 8, 16]} />
                        <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={1} />
                    </mesh>
                    {/* Grip */}
                    <mesh position={[0, -0.08, 0.04]}>
                        <boxGeometry args={[0.035, 0.1, 0.05]} />
                        <meshStandardMaterial color="#4B0082" roughness={0.6} />
                    </mesh>
                    {/* Trigger */}
                    <mesh position={[0, -0.04, -0.02]}>
                        <boxGeometry args={[0.015, 0.03, 0.02]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>
                    {/* Muzzle flash - purple energy */}
                    {showMuzzleFlash && (
                        <mesh position={[0, 0, -0.38]}>
                            <sphereGeometry args={[0.05, 8, 8]} />
                            <meshBasicMaterial color="#FF00FF" />
                        </mesh>
                    )}
                </group>
            )}
            {!hasRaygun && !hasFlamethrower && currentWeapon === 'Pistol' && (
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
            {!hasRaygun && !hasFlamethrower && currentWeapon === 'SMG' && (
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
            {!hasRaygun && !hasFlamethrower && currentWeapon === 'Rifle' && (
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
