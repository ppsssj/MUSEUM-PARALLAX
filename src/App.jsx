import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import OffAxisCameraRig from "./camera/OffAxisCameraRig";
import GalleryScene, { getArtworkFocusTargets } from "./scene/GalleryScene";
import InspectLight from "./scene/InspectLight.jsx";
import HUD from "./ui/HUD";
import { useHeadTracker } from "./tracking/useHeadTracker";
import { useFaceLandmarker } from "./tracking/useFaceLandmarker";

function dampNumber(x, y, lambda, dt) {
  return THREE.MathUtils.damp(x, y, lambda, dt);
}
function dampVec3(v, target, lambda, dt) {
  v.x = dampNumber(v.x, target.x, lambda, dt);
  v.y = dampNumber(v.y, target.y, lambda, dt);
  v.z = dampNumber(v.z, target.z, lambda, dt);
}

function CameraFocusRig({
  focusIndex = 0,
  selectedArtwork = null,
  enabled = true,
  controlsRef,
  transitionBoost = 0, // 0..1 (temporarily speeds up return to preset)
  inspectLockRef,
  setInspectLocked,
  inspectLocked,
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 1.8, 0));
  const presets = useMemo(() => getArtworkFocusTargets(), []);
  const p =
    presets[Math.max(0, Math.min(presets.length - 1, focusIndex))] ||
    presets[0];

  useFrame((_, dt) => {
    if (!enabled) return;

    // If we already handed off to OrbitControls in inspect mode, don't fight it.
    const locked = inspectLockRef?.current?.locked;
    const inspecting = !!(
      selectedArtwork?.position && selectedArtwork?.rotation
    );
    if (inspecting && locked) return;

    let desiredPos;
    let desiredTarget;

    if (inspecting) {
      const anchor = new THREE.Vector3(...selectedArtwork.position);
      const eul = new THREE.Euler(...selectedArtwork.rotation);

      const forward = new THREE.Vector3(0, 0, 1).applyEuler(eul).normalize();
      const up = new THREE.Vector3(0, 1, 0);

      const w = selectedArtwork?.size?.w ?? 1.05;
      const h = selectedArtwork?.size?.h ?? 1.45;
      const baseDist = 0.72 + 0.16 * Math.max(w, h); // refined inspect distance

      desiredTarget = anchor.clone().add(up.clone().multiplyScalar(0.02));
      desiredPos = anchor
        .clone()
        .add(forward.multiplyScalar(baseDist))
        .add(up.multiplyScalar(0.1));
    } else {
      desiredPos = new THREE.Vector3(...p.pos);
      desiredTarget = new THREE.Vector3(...p.target);
    }

    // Faster (but still smooth) return when closing the inspect view.
    const posLambda = inspecting ? 6.2 : 6.2 + transitionBoost * 5.0;
    const tgtLambda = inspecting ? 8.8 : 8.8 + transitionBoost * 6.0;

    dampVec3(camera.position, desiredPos, posLambda, dt);
    dampVec3(targetRef.current, desiredTarget, tgtLambda, dt);

    // Keep OrbitControls target aligned (even when user is not rotating).
    const controls = controlsRef?.current;
    if (controls?.target) {
      controls.target.copy(targetRef.current);
      if (inspectLocked) controls.update(); // ✅ 잠금 이후에만 update 호출
      else camera.lookAt(targetRef.current);
    } else {
      camera.lookAt(targetRef.current);
    }

    // When inspecting, once we're close enough, hand off to OrbitControls for subtle rotation.
    if (inspecting && inspectLockRef?.current) {
      const dist = camera.position.distanceTo(desiredPos);
      const tdist = targetRef.current.distanceTo(desiredTarget);
      if (dist < 0.03 && tdist < 0.03) {
        inspectLockRef.current.locked = true;
      }
    }
  });

  return null;
}

export default function App() {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [strength, setStrength] = useState(0.32);
  const [smoothing, setSmoothing] = useState(0.18);

  const controlsRef = useRef(null);
  const inspectLockRef = useRef({ locked: false });
  const [inspectClamp, setInspectClamp] = useState(null); // { az, pol, dist }
  const [transitionBoost, setTransitionBoost] = useState(0); // 0..1

  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [focusIndex, setFocusIndex] = useState(1);

  const [inspectLocked, setInspectLocked] = useState(false);
  useEffect(() => {
    setInspectLocked(false);
  }, [selectedArtwork]);

  useEffect(() => {
    // Entering inspect: capture current orbit angles and distance to clamp subtle rotation.
    if (selectedArtwork) {
      inspectLockRef.current.locked = false;

      // Wait a tick so CameraFocusRig can start moving toward the artwork.
      const id = requestAnimationFrame(() => {
        const controls = controlsRef.current;
        if (!controls) return;

        const az = controls.getAzimuthalAngle?.() ?? 0;
        const pol = controls.getPolarAngle?.() ?? Math.PI / 2;
        const dist =
          controls.object?.position?.distanceTo(controls.target) ?? 1.6;
        setInspectClamp({ az, pol, dist });
      });

      return () => cancelAnimationFrame(id);
    }

    // Exiting inspect: clear clamp and temporarily boost the return smoothing.
    setInspectClamp(null);
    setTransitionBoost(1);
    const t = setTimeout(() => setTransitionBoost(0), 900);
    return () => clearTimeout(t);
  }, [selectedArtwork]);

  const { head, meta, calibrate, updateFromFaceCenter, hardSet } =
    useHeadTracker();
  const { videoRef, landmarkerState, startLoop, stopLoop } = useFaceLandmarker({
    enabled: trackingEnabled,
  });

  // When tracking is on and model is ready, start inference loop.
  useEffect(() => {
    if (!trackingEnabled) return;

    if (landmarkerState.status !== "ready") return;

    startLoop((landmarks) => {
      // Compute a robust face center from landmarks bounding box.
      let minX = 1,
        maxX = 0,
        minY = 1,
        maxY = 0;
      for (const p of landmarks) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const box = (maxX - minX) * (maxY - minY);

      updateFromFaceCenter(cx, cy, box, { alpha: smoothing, max: 0.95 });
    });

    return () => stopLoop();
  }, [
    trackingEnabled,
    landmarkerState.status,
    startLoop,
    stopLoop,
    smoothing,
    updateFromFaceCenter,
  ]);

  // Mouse fallback: when tracking is off/denied/error, use cursor as parallax source.
  useEffect(() => {
    const shouldFallback =
      !trackingEnabled ||
      landmarkerState.status === "denied" ||
      landmarkerState.status === "error";

    if (!shouldFallback) return;

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (0.5 - e.clientY / window.innerHeight) * 2;
      hardSet(
        nx * 0.45,
        ny * 0.35,
        trackingEnabled
          ? "Camera unavailable — mouse fallback"
          : "Mouse parallax"
      );
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [trackingEnabled, landmarkerState.status, hardSet]);

  const total = 4;

  const onPrev = () => setFocusIndex((i) => Math.max(0, i - 1));
  const onNext = () => setFocusIndex((i) => Math.min(total - 1, i + 1));

  const trackingStatusLabel = (() => {
    if (!trackingEnabled) return "off";
    return landmarkerState.status;
  })();

  return (
    <div className="app">
      <div className="canvasWrap">
        {/* hidden video for webcam inference */}
        <video
          ref={videoRef}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
          playsInline
          muted
        />

        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 1.65, 5.2], fov: 45, near: 0.1, far: 200 }}
        >
          <color attach="background" args={["#0b0c10"]} />
          <fog attach="fog" args={["#0b0c10", 9, 18]} />

          <Suspense fallback={null}>
            <CameraFocusRig
              focusIndex={focusIndex}
              selectedArtwork={selectedArtwork}
              enabled
              controlsRef={controlsRef}
              transitionBoost={transitionBoost}
              inspectLockRef={inspectLockRef}
              setInspectLocked={setInspectLocked}
              inspectLocked={inspectLocked}
            />
            <OffAxisCameraRig
              enabled={trackingEnabled}
              head={head}
              strength={strength}
            />
            <InspectLight selectedArtwork={selectedArtwork} />
            <GalleryScene
              selectedId={selectedArtwork?.id ?? null}
              onSelect={(a) => setSelectedArtwork(a)}
              focusIndex={focusIndex}
              onFocusIndexChange={setFocusIndex}
              enableControls
              isInspecting={!!selectedArtwork}
            />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.1}
            enabled={selectedArtwork ? inspectLocked : true} // ✅ 핵심
            enableRotate={selectedArtwork ? inspectLocked : true}
            enableZoom={!selectedArtwork}
            enablePan={false}
            rotateSpeed={selectedArtwork ? 0.18 : 0.55}
            // ✅ clamp도 잠금 이후에만 적용(줌인 중엔 clamp로 방해하지 않게)
            minDistance={
              selectedArtwork && inspectLocked
                ? Math.max(0.9, (inspectClamp?.dist ?? 1.55) - 0.12)
                : 3.6
            }
            maxDistance={
              selectedArtwork && inspectLocked
                ? (inspectClamp?.dist ?? 1.55) + 0.12
                : 9.5
            }
            minPolarAngle={
              selectedArtwork && inspectLocked
                ? Math.max(0.15, (inspectClamp?.pol ?? Math.PI * 0.45) - 0.1)
                : Math.PI * 0.28
            }
            maxPolarAngle={
              selectedArtwork && inspectLocked
                ? Math.min(
                    Math.PI - 0.15,
                    (inspectClamp?.pol ?? Math.PI * 0.45) + 0.1
                  )
                : Math.PI * 0.62
            }
            minAzimuthAngle={
              selectedArtwork && inspectLocked
                ? (inspectClamp?.az ?? 0) - 0.18
                : -Infinity
            }
            maxAzimuthAngle={
              selectedArtwork && inspectLocked
                ? (inspectClamp?.az ?? 0) + 0.18
                : Infinity
            }
          />
        </Canvas>

        <HUD
          trackingEnabled={trackingEnabled}
          trackingStatus={trackingStatusLabel}
          onToggleTracking={() => setTrackingEnabled((v) => !v)}
          onCalibrate={calibrate}
          strength={strength}
          onStrength={setStrength}
          smoothing={smoothing}
          onSmoothing={setSmoothing}
          focusIndex={focusIndex}
          total={total}
          onPrev={onPrev}
          onNext={onNext}
          selectedArtwork={selectedArtwork}
          onCloseArtwork={() => setSelectedArtwork(null)}
        />
      </div>
    </div>
  );
}
