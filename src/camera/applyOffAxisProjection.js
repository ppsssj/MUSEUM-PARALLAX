import * as THREE from "three";

/**
 * Off-axis projection (virtual window / head parallax)
 * nx, ny: -1..1 (head position relative to calibrated center)
 */
export function applyOffAxisProjection(camera, nx, ny, {
  strength = 0.32,     // recommended 0.20 ~ 0.45
  near = 0.1,
  far = 2000,
} = {}) {
  const aspect = camera.aspect || 1;
  const fov = THREE.MathUtils.degToRad(camera.fov || 45);

  const top = near * Math.tan(fov / 2);
  const bottom = -top;
  const right = top * aspect;
  const left = -right;

  const dx = nx * strength * right;
  const dy = ny * strength * top;

  const l = left + dx;
  const r = right + dx;
  const b = bottom + dy;
  const t = top + dy;

  camera.projectionMatrix.makePerspective(l, r, t, b, near, far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
