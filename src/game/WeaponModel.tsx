import type { WeaponType } from './store'

interface WeaponModelProps {
    type: WeaponType
}

export const WeaponModel = ({ type }: WeaponModelProps) => {
    if (type === 'Pistol') {
        return (
            <group scale={1.5}>
                {/* Barrel */}
                <mesh castShadow position={[0, 0, -0.1]}>
                    <boxGeometry args={[0.04, 0.06, 0.2]} />
                    <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
                </mesh>
                {/* Body */}
                <mesh castShadow position={[0, -0.02, 0.05]}>
                    <boxGeometry args={[0.05, 0.1, 0.12]} />
                    <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Grip */}
                <mesh position={[0, -0.1, 0.08]} castShadow>
                    <boxGeometry args={[0.04, 0.1, 0.06]} />
                    <meshStandardMaterial color="#3d3d3d" />
                </mesh>
            </group>
        )
    }
    if (type === 'SMG') {
        return (
            <group scale={1.3}>
                {/* Barrel */}
                <mesh castShadow position={[0, 0, -0.2]}>
                    <boxGeometry args={[0.05, 0.05, 0.35]} />
                    <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
                </mesh>
                {/* Body */}
                <mesh castShadow position={[0, 0, 0.05]}>
                    <boxGeometry args={[0.06, 0.08, 0.15]} />
                    <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Magazine */}
                <mesh position={[0, -0.12, 0]} castShadow>
                    <boxGeometry args={[0.04, 0.15, 0.06]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                {/* Stock */}
                <mesh position={[0, 0, 0.18]} castShadow>
                    <boxGeometry args={[0.04, 0.06, 0.1]} />
                    <meshStandardMaterial color="#3d3d3d" />
                </mesh>
            </group>
        )
    }
    // Rifle
    return (
        <group scale={1.2}>
            {/* Barrel */}
            <mesh castShadow position={[0, 0, -0.35]}>
                <boxGeometry args={[0.04, 0.04, 0.4]} />
                <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Body */}
            <mesh castShadow position={[0, 0, 0]}>
                <boxGeometry args={[0.06, 0.1, 0.25]} />
                <meshStandardMaterial color="#4a4036" />
            </mesh>
            {/* Magazine */}
            <mesh position={[0, -0.12, -0.05]} castShadow>
                <boxGeometry args={[0.04, 0.15, 0.08]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {/* Stock */}
            <mesh position={[0, 0, 0.2]} castShadow>
                <boxGeometry args={[0.05, 0.08, 0.15]} />
                <meshStandardMaterial color="#5a4a3a" />
            </mesh>
            {/* Scope */}
            <mesh position={[0, 0.07, 0]} castShadow>
                <boxGeometry args={[0.03, 0.04, 0.1]} />
                <meshStandardMaterial color="#111" />
            </mesh>
        </group>
    )
}
