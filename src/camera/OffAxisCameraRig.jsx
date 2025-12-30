import { useFrame, useThree } from "@react-three/fiber";
import { applyOffAxisProjection } from "./applyOffAxisProjection";

/**
 * Updates only the projection matrix to create a refined "window" parallax effect.
 * Keeps OrbitControls stable (no camera position jitter).
 */
export default function OffAxisCameraRig({ enabled, head, strength = 0.32 }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!enabled) {
      camera.updateProjectionMatrix();
      return;
    }

    const nx = head?.nx ?? 0;
    const ny = head?.ny ?? 0;

    applyOffAxisProjection(camera, nx, ny, { strength, near: camera.near, far: camera.far });
  });

  return null;
}
