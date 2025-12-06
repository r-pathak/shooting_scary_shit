import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Suspense } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Arena size constants (reduced by 20%: 50 -> 40)
const ARENA_SIZE = 40
const ARENA_HALF = ARENA_SIZE / 2

// Ground - SOLID FLOOR
const Ground = () => {
  const grassTexture = useTexture('/grass_texture.jpeg')
  
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
  grassTexture.repeat.set(8, 8)
  
  return (
    <RigidBody type="fixed" position={[0, 0, 0]} colliders={false}>
      <CuboidCollider args={[ARENA_HALF, 1.5, ARENA_HALF]} position={[0, -0.5, 0]} />
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[ARENA_SIZE, 1, ARENA_SIZE]} />
        <meshStandardMaterial map={grassTexture} />
      </mesh>
    </RigidBody>
  )
}

// Dirt walls to enclose the space
const Walls = () => {
  const dirtTexture = useTexture('/dirt_texture.jpg')
  
  dirtTexture.wrapS = dirtTexture.wrapT = THREE.RepeatWrapping
  dirtTexture.repeat.set(3, 3)
  
  return (
    <>
      {/* North wall */}
      <RigidBody type="fixed" position={[0, 5, -ARENA_HALF]} colliders={false}>
        <CuboidCollider args={[ARENA_HALF, 10, 1]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[ARENA_SIZE, 20, 2]} />
          <meshStandardMaterial map={dirtTexture} />
        </mesh>
      </RigidBody>
      
      {/* South wall */}
      <RigidBody type="fixed" position={[0, 5, ARENA_HALF]} colliders={false}>
        <CuboidCollider args={[ARENA_HALF, 10, 1]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[ARENA_SIZE, 20, 2]} />
          <meshStandardMaterial map={dirtTexture} />
        </mesh>
      </RigidBody>
      
      {/* East wall */}
      <RigidBody type="fixed" position={[ARENA_HALF, 5, 0]} colliders={false}>
        <CuboidCollider args={[1, 10, ARENA_HALF]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[2, 20, ARENA_SIZE]} />
          <meshStandardMaterial map={dirtTexture} />
        </mesh>
      </RigidBody>
      
      {/* West wall */}
      <RigidBody type="fixed" position={[-ARENA_HALF, 5, 0]} colliders={false}>
        <CuboidCollider args={[1, 10, ARENA_HALF]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[2, 20, ARENA_SIZE]} />
          <meshStandardMaterial map={dirtTexture} />
        </mesh>
      </RigidBody>
    </>
  )
}

export const World = () => {
  return (
    <group>
      <Suspense fallback={null}>
        <Ground />
        <Walls />
      </Suspense>
    </group>
  )
}
