import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Suspense, useMemo } from 'react'
import { useTexture, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Ground - SOLID FLOOR
const Ground = () => {
  const grassTexture = useTexture('/grass_texture.jpeg')
  
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
  grassTexture.repeat.set(20, 20)
  
  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]} colliders={false}>
      <CuboidCollider args={[50, 0.5, 50]} />
      <mesh receiveShadow>
        <boxGeometry args={[100, 1, 100]} />
        <meshStandardMaterial map={grassTexture} />
      </mesh>
    </RigidBody>
  )
}

// Tree wall around perimeter - optimized with instancing
const TreeWall = () => {
  const { scene } = useGLTF('/tree_pine.glb')
  
  const treeData = useMemo(() => {
    const positions: [number, number, number][] = []
    const scales: number[] = []
    const rotations: number[] = []
    const edgeDistance = 48
    const spacing = 8
    
    // North edge
    for (let x = -edgeDistance; x <= edgeDistance; x += spacing) {
      positions.push([x, 0, -edgeDistance])
      scales.push(0.1 + Math.random() * 0.05)
      rotations.push(Math.random() * Math.PI * 2)
    }
    // South edge
    for (let x = -edgeDistance; x <= edgeDistance; x += spacing) {
      positions.push([x, 0, edgeDistance])
      scales.push(0.1 + Math.random() * 0.05)
      rotations.push(Math.random() * Math.PI * 2)
    }
    // East edge (skip corners)
    for (let z = -edgeDistance + spacing; z < edgeDistance; z += spacing) {
      positions.push([edgeDistance, 0, z])
      scales.push(0.1 + Math.random() * 0.05)
      rotations.push(Math.random() * Math.PI * 2)
    }
    // West edge (skip corners)
    for (let z = -edgeDistance + spacing; z < edgeDistance; z += spacing) {
      positions.push([-edgeDistance, 0, z])
      scales.push(0.1 + Math.random() * 0.05)
      rotations.push(Math.random() * Math.PI * 2)
    }
    
    return { positions, scales, rotations }
  }, [])
  
  // Use React.memo to prevent unnecessary re-renders
  const TreeInstance = useMemo(() => {
    return ({ pos, scale, rotation }: { pos: [number, number, number], scale: number, rotation: number }) => (
      <group position={pos} scale={scale} rotation={[0, rotation, 0]}>
        <primitive object={scene.clone()} />
      </group>
    )
  }, [scene])
  
  return (
    <>
      {treeData.positions.map((pos, i) => (
        <TreeInstance key={i} pos={pos} scale={treeData.scales[i]} rotation={treeData.rotations[i]} />
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
