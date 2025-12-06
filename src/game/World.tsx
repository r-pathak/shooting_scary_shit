import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Suspense } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Ground - SOLID FLOOR
const Ground = () => {
  const grassTexture = useTexture('/grass_texture.jpeg')
  
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
  grassTexture.repeat.set(10, 10)
  
  return (
    <RigidBody type="fixed" position={[0, 0, 0]} colliders={false}>
      <CuboidCollider args={[25, 1.5, 25]} position={[0, -0.5, 0]} />
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[50, 1, 50]} />
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
      <RigidBody type="fixed" position={[0, 5, -25]} colliders={false}>
        <CuboidCollider args={[25, 10, 1]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[50, 20, 2]} />
          <meshStandardMaterial map={dirtTexture} />
        </mesh>
      </RigidBody>
      
      {/* South wall */}
      <RigidBody type="fixed" position={[0, 5, 25]} colliders={false}>
        <CuboidCollider args={[25, 10, 1]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[50, 20, 2]} />
          <meshStandardMaterial map={dirtTexture} />
        </mesh>
      </RigidBody>
      
      {/* East wall */}
      <RigidBody type="fixed" position={[25, 5, 0]} colliders={false}>
        <CuboidCollider args={[1, 10, 25]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[2, 20, 50]} />
          <meshStandardMaterial map={dirtTexture} />
        </mesh>
      </RigidBody>
      
      {/* West wall */}
      <RigidBody type="fixed" position={[-25, 5, 0]} colliders={false}>
        <CuboidCollider args={[1, 10, 25]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[2, 20, 50]} />
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
