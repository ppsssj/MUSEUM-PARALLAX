import { useMemo } from "react";
import * as THREE from "three";

export default function Room() {
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#0e1117",
    roughness: 0.95,
    metalness: 0.05,
  }), []);

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#0b0c10",
    roughness: 0.85,
    metalness: 0.12,
  }), []);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 3, -5]} receiveShadow>
        <planeGeometry args={[18, 6]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Left wall */}
      <mesh position={[-9, 3, 0]} rotation={[0, Math.PI/2, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Right wall */}
      <mesh position={[9, 3, 0]} rotation={[0, -Math.PI/2, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* subtle ceiling */}
      <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 6, 0]} receiveShadow>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial color="#0a0b10" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
