import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Suspense, useMemo } from 'react'
import { useTexture, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Ground - SOLID FLOOR
const Ground = () => {
  const grassTexture = useTexture('/grass_texture.jpeg', undefined, (error) => {
    console.warn('Failed to load grass texture:', error)
  })
  
  if (grassTexture) {
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
    grassTexture.repeat.set(20, 20)
  }
  
  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]} colliders={false}>
      <CuboidCollider args={[50, 0.5, 50]} />
      <mesh receiveShadow>
        <boxGeometry args={[100, 1, 100]} />
        <meshStandardMaterial map={grassTexture || undefined} color={grassTexture ? undefined : "#4a7c59"} />
      </mesh>
    </RigidBody>
  )
}

// Tree wall around perimeter
const TreeWall = () => {
  const { scene } = useGLTF('/tree_pine.glb', undefined, (error) => {
    console.warn('Failed to load tree model:', error)
  })
  
  const treePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    const edgeDistance = 48
    const spacing = 8
    
    // North edge
    for (let x = -edgeDistance; x <= edgeDistance; x += spacing) {
      positions.push([x, 0, -edgeDistance])
    }
    // South edge
    for (let x = -edgeDistance; x <= edgeDistance; x += spacing) {
      positions.push([x, 0, edgeDistance])
    }
    // East edge (skip corners)
    for (let z = -edgeDistance + spacing; z < edgeDistance; z += spacing) {
      positions.push([edgeDistance, 0, z])
    }
    // West edge (skip corners)
    for (let z = -edgeDistance + spacing; z < edgeDistance; z += spacing) {
      positions.push([-edgeDistance, 0, z])
    }
    
    return positions
  }, [])
  
  return (
    <>
      {treePositions.map((pos, i) => (
        <group key={i} position={pos}>
          <primitive object={scene.clone()} scale={0.1 + Math.random() * 0.05} rotation={[0, Math.random() * Math.PI * 2, 0]} />
        </group>
      ))}
    </>
  )
}

// Invisible walls to enclose the space
const Walls = () => {
  return (
    <>
      {/* North wall */}
      <RigidBody type="fixed" position={[0, 5, -50]} colliders={false}>
        <CuboidCollider args={[50, 10, 1]} />
      </RigidBody>
      
      {/* South wall */}
      <RigidBody type="fixed" position={[0, 5, 50]} colliders={false}>
        <CuboidCollider args={[50, 10, 1]} />
      </RigidBody>
      
      {/* East wall */}
      <RigidBody type="fixed" position={[50, 5, 0]} colliders={false}>
        <CuboidCollider args={[1, 10, 50]} />
      </RigidBody>
      
      {/* West wall */}
      <RigidBody type="fixed" position={[-50, 5, 0]} colliders={false}>
        <CuboidCollider args={[1, 10, 50]} />
      </RigidBody>
    </>
  )
}

export const World = () => {
  return (
    <group>
      <Suspense fallback={null}>
        <Ground />
        <TreeWall />
        <Walls />
      </Suspense>
    </group>
  )
}
