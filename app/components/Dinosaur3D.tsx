"use client"

import { Suspense, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

function GlowMaterial({ color, intensity = 1.5 }: { color: string; intensity?: number }) {
    return (
        <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={intensity}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.9}
        />
    )
}

function TRex() {
    const groupRef = useRef<THREE.Group>(null)

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.3
            // Gentle breathing bob
            groupRef.current.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05
        }
    })

    const primary = "#10b981"    // bright emerald
    const secondary = "#34d399"  // lighter emerald
    const accent = "#06b6d4"     // cyan
    const hot = "#f0abfc"        // pink for eyes
    const toothColor = "#ffffff"

    return (
        <group ref={groupRef} position={[0, -0.5, 0]}>
            {/* Body */}
            <mesh position={[0, 0.8, 0]}>
                <boxGeometry args={[1.2, 1.4, 1.6]} />
                <GlowMaterial color={primary} intensity={0.8} />
            </mesh>

            {/* Belly */}
            <mesh position={[0, 0.5, 0.3]}>
                <boxGeometry args={[1.0, 0.9, 0.8]} />
                <GlowMaterial color={secondary} intensity={1.0} />
            </mesh>

            {/* Neck */}
            <mesh position={[0, 1.8, 0.4]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[0.7, 0.8, 0.7]} />
                <GlowMaterial color={primary} intensity={0.8} />
            </mesh>

            {/* Head */}
            <mesh position={[0, 2.3, 0.8]} rotation={[0.15, 0, 0]}>
                <boxGeometry args={[0.9, 0.7, 1.2]} />
                <GlowMaterial color={primary} intensity={0.8} />
            </mesh>

            {/* Snout */}
            <mesh position={[0, 2.2, 1.5]}>
                <boxGeometry args={[0.7, 0.5, 0.7]} />
                <GlowMaterial color={primary} intensity={0.8} />
            </mesh>

            {/* Lower Jaw */}
            <mesh position={[0, 1.95, 1.2]} rotation={[-0.1, 0, 0]}>
                <boxGeometry args={[0.65, 0.25, 1.0]} />
                <GlowMaterial color={secondary} intensity={1.0} />
            </mesh>

            {/* Left Eye */}
            <mesh position={[0.4, 2.45, 1.1]}>
                <sphereGeometry args={[0.14, 16, 16]} />
                <meshStandardMaterial color={hot} emissive={hot} emissiveIntensity={3} />
            </mesh>

            {/* Right Eye */}
            <mesh position={[-0.4, 2.45, 1.1]}>
                <sphereGeometry args={[0.14, 16, 16]} />
                <meshStandardMaterial color={hot} emissive={hot} emissiveIntensity={3} />
            </mesh>

            {/* Teeth - Upper */}
            {[0.2, 0, -0.2].map((x, i) => (
                <mesh key={`ut${i}`} position={[x, 2.0, 1.85]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.05, 0.15, 4]} />
                    <meshStandardMaterial color={toothColor} emissive={toothColor} emissiveIntensity={0.5} />
                </mesh>
            ))}

            {/* Teeth - Lower */}
            {[0.15, -0.15].map((x, i) => (
                <mesh key={`lt${i}`} position={[x, 1.95, 1.75]}>
                    <coneGeometry args={[0.04, 0.12, 4]} />
                    <meshStandardMaterial color={toothColor} emissive={toothColor} emissiveIntensity={0.5} />
                </mesh>
            ))}

            {/* Left Arm (tiny!) */}
            <mesh position={[0.55, 1.1, 0.6]} rotation={[0.5, 0, 0.3]}>
                <boxGeometry args={[0.2, 0.5, 0.2]} />
                <GlowMaterial color={accent} intensity={1.2} />
            </mesh>

            {/* Right Arm (tiny!) */}
            <mesh position={[-0.55, 1.1, 0.6]} rotation={[0.5, 0, -0.3]}>
                <boxGeometry args={[0.2, 0.5, 0.2]} />
                <GlowMaterial color={accent} intensity={1.2} />
            </mesh>

            {/* Left Thigh */}
            <mesh position={[0.45, -0.1, 0.1]}>
                <boxGeometry args={[0.5, 0.9, 0.6]} />
                <GlowMaterial color={primary} intensity={0.8} />
            </mesh>

            {/* Right Thigh */}
            <mesh position={[-0.45, -0.1, 0.1]}>
                <boxGeometry args={[0.5, 0.9, 0.6]} />
                <GlowMaterial color={primary} intensity={0.8} />
            </mesh>

            {/* Left Shin */}
            <mesh position={[0.45, -0.8, 0.2]}>
                <boxGeometry args={[0.35, 0.7, 0.4]} />
                <GlowMaterial color={secondary} intensity={1.0} />
            </mesh>

            {/* Right Shin */}
            <mesh position={[-0.45, -0.8, 0.2]}>
                <boxGeometry args={[0.35, 0.7, 0.4]} />
                <GlowMaterial color={secondary} intensity={1.0} />
            </mesh>

            {/* Left Foot */}
            <mesh position={[0.45, -1.2, 0.4]}>
                <boxGeometry args={[0.45, 0.2, 0.7]} />
                <GlowMaterial color={accent} intensity={1.2} />
            </mesh>

            {/* Right Foot */}
            <mesh position={[-0.45, -1.2, 0.4]}>
                <boxGeometry args={[0.45, 0.2, 0.7]} />
                <GlowMaterial color={accent} intensity={1.2} />
            </mesh>

            {/* Tail segment 1 */}
            <mesh position={[0, 0.9, -1.0]} rotation={[-0.15, 0, 0]}>
                <boxGeometry args={[0.8, 0.9, 1.0]} />
                <GlowMaterial color={primary} intensity={0.8} />
            </mesh>

            {/* Tail segment 2 */}
            <mesh position={[0, 1.0, -1.8]} rotation={[-0.25, 0, 0]}>
                <boxGeometry args={[0.5, 0.6, 0.9]} />
                <GlowMaterial color={secondary} intensity={1.0} />
            </mesh>

            {/* Tail segment 3 (tip) */}
            <mesh position={[0, 1.15, -2.5]} rotation={[-0.35, 0, 0]}>
                <boxGeometry args={[0.3, 0.35, 0.8]} />
                <GlowMaterial color={accent} intensity={1.5} />
            </mesh>

            {/* Back ridges - bright cyan spikes */}
            {[
                { pos: [0, 1.65, -0.1] as [number, number, number], size: [0.15, 0.3, 0.3] as [number, number, number] },
                { pos: [0, 1.55, -0.5] as [number, number, number], size: [0.12, 0.25, 0.25] as [number, number, number] },
                { pos: [0, 1.5, -0.85] as [number, number, number], size: [0.1, 0.2, 0.2] as [number, number, number] },
                { pos: [0, 1.45, -1.2] as [number, number, number], size: [0.08, 0.15, 0.15] as [number, number, number] },
            ].map((ridge, i) => (
                <mesh key={`ridge${i}`} position={ridge.pos}>
                    <boxGeometry args={ridge.size} />
                    <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.5} />
                </mesh>
            ))}
        </group>
    )
}

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
    )
}

export default function Dinosaur3D() {
    return (
        <div className="w-full h-[200px] sm:h-[260px]">
            <Suspense fallback={<LoadingSpinner />}>
                <Canvas
                    camera={{ position: [4, 2, 5], fov: 45 }}
                    style={{ background: "transparent" }}
                >
                    <ambientLight intensity={0.6} color="#d1fae5" />
                    <pointLight position={[5, 5, 5]} intensity={2} color="#10b981" />
                    <pointLight position={[-5, 3, -5]} intensity={1.2} color="#06b6d4" />
                    <pointLight position={[0, -3, 5]} intensity={0.8} color="#a78bfa" />
                    <pointLight position={[0, 5, 0]} intensity={0.6} color="#ffffff" />
                    <TRex />
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        minPolarAngle={Math.PI / 4}
                        maxPolarAngle={Math.PI / 1.8}
                    />
                </Canvas>
            </Suspense>
        </div>
    )
}
