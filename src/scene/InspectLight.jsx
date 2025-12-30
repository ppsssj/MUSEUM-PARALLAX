import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * A subtle spotlight that fades in while inspecting an artwork.
 * It follows the camera slightly to feel like a gallery track light.
 */
export default function InspectLight({ selectedArtwork }) {
  const lightRef = useRef();
  const targetRef = useRef();

  const { camera } = useThree();
  const tmp = useMemo(() => ({
    anchor: new THREE.Vector3(),
    eul: new THREE.Euler(),
    up: new THREE.Vector3(0, 1, 0),
    forward: new THREE.Vector3(),
    camPos: new THREE.Vector3(),
  }), []);

  useFrame((_, dt) => {
    const light = lightRef.current;
    const t = targetRef.current;
    if (!light || !t) return;

    const isOn = !!(selectedArtwork?.position && selectedArtwork?.rotation);

    // Fade intensity smoothly
    const targetIntensity = isOn ? 2.35 : 0.0;
    light.intensity = THREE.MathUtils.damp(light.intensity, targetIntensity, 6.5, dt);

    if (!isOn) return;

    tmp.anchor.set(...selectedArtwork.position);
    tmp.eul.set(...selectedArtwork.rotation);
    tmp.forward.set(0, 0, 1).applyEuler(tmp.eul).normalize();

    // Put the light slightly above and offset from camera for a refined "track light" feel
    tmp.camPos.copy(camera.position);
    const lightPos = tmp.camPos.clone()
      .add(tmp.up.clone().multiplyScalar(0.65))
      .add(tmp.forward.clone().multiplyScalar(-0.25));

    light.position.copy(lightPos);

    // Target: slightly above the artwork center
    t.position.copy(tmp.anchor.clone().add(tmp.up.clone().multiplyScalar(0.08)));
    light.target = t;
    light.target.updateMatrixWorld();
  });

  return (
    <>
      <spotLight
        ref={lightRef}
        position={[0, 3.5, 2]}
        intensity={0}
        angle={0.32}
        penumbra={0.85}
        distance={8}
        decay={2}
        color={"#ffffff"}
      />
      <object3D ref={targetRef} />
    </>
  );
}
