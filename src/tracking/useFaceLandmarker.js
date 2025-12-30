import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/**
 * Lightweight FaceLandmarker wrapper:
 * - handles webcam
 * - runs VIDEO mode inference
 * - returns landmarks for the first face
 *
 * Notes:
 * - Uses a remote model by default. You can host it locally if you prefer.
 */
const DEFAULT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const DEFAULT_WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";

export function useFaceLandmarker({ enabled, modelUrl = DEFAULT_MODEL_URL } = {}) {
  const [state, setState] = useState({
    status: enabled ? "starting" : "off", // off | starting | ready | denied | error
    detail: "",
  });

  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function start() {
      try {
        setState({ status: "starting", detail: "Requesting camera…" });

        const v = videoRef.current;
        if (!v) throw new Error("Video element not ready.");

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelled) return;

        v.srcObject = stream;
        await v.play();

        setState({ status: "starting", detail: "Loading vision tasks…" });

        const fileset = await FilesetResolver.forVisionTasks(DEFAULT_WASM_PATH);
        if (cancelled) return;

        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });

        if (cancelled) return;

        landmarkerRef.current = landmarker;
        setState({ status: "ready", detail: "Tracking ready" });
      } catch (err) {
        const msg = err?.message || String(err);
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
          setState({ status: "denied", detail: "Camera permission denied" });
        } else {
          setState({ status: "error", detail: msg });
        }
      }
    }

    async function stop() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch { /* ignore */ }
      }
      landmarkerRef.current = null;

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      lastVideoTimeRef.current = -1;
    }

    if (enabled) start();
    else {
      setState({ status: "off", detail: "" });
      stop();
    }

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, modelUrl]);

  function startLoop(onLandmarks) {
    const v = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!v || !landmarker) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      // Prevent duplicate frames
      if (v.currentTime === lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = v.currentTime;

      const now = performance.now();
      const res = landmarker.detectForVideo(v, now);

      const face = res?.faceLandmarks?.[0];
      if (face && Array.isArray(face)) {
        onLandmarks(face);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  return { videoRef, landmarkerState: state, startLoop, stopLoop };
}
