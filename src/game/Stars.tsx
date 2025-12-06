import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

export const Stars = () => {
  // Generate random star positions
  const starPositions = useMemo(() => {
    const positions: number[] = []
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const radius = 150
      
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = Math.abs(radius * Math.cos(phi)) // Only positive Y (above horizon)
      const z = radius * Math.sin(phi) * Math.sin(theta)
      
      if (y > 20) { // Only stars above horizon
        positions.push(x, y, z)
      }
    }
    return new Float32Array(positions)
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    return geo
  }, [starPositions])

  return (
    <group>
      {/* Background stars */}
      <points geometry={geometry}>
        <pointsMaterial
          size={0.5}
          color="#ffffff"
          transparent
          opacity={0.3}
          sizeAttenuation={true}
        />
      </points>

      {/* Text in the sky */}
      <group position={[0, 80, -100]}>
        <Text
          position={[0, 0, 0]}
          fontSize={4}
          color="#ffdd00"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.4}
        >
          SHOOTING SCARY SHIT - THE GAME
        </Text>
        <Text
          position={[0, -6, 0]}
          fontSize={2}
          color="#ffdd00"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.4}
        >
          made by rohan lol
        </Text>
      </group>
    </group>
  )
}

