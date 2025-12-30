import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Head parallax state manager:
 * - baseline calibration
 * - EMA smoothing
 * - clamping
 */
export function useHeadTracker() {
  const baselineRef = useRef({ cx: 0.5, cy: 0.5, has: false });
  const smoothRef = useRef({ nx: 0, ny: 0 });

  const [meta, setMeta] = useState({
    ok: false,
    message: "Tracking idle",
    raw: { cx: 0.5, cy: 0.5, box: 0 },
    nx: 0,
    ny: 0,
  });

  const calibrate = useCallback(() => {
    baselineRef.current.has = false; // next update becomes baseline
    setMeta((m) => ({ ...m, message: "Calibrating… look straight at the screen" }));
  }, []);

  const setBaseline = useCallback((cx, cy) => {
    baselineRef.current = { cx, cy, has: true };
  }, []);

  const updateFromFaceCenter = useCallback((cx, cy, box, {
    alpha = 0.18, // smoothing
    max = 1.0,    // clamp raw head offsets
  } = {}) => {
    if (!baselineRef.current.has) {
      setBaseline(cx, cy);
    }

    const base = baselineRef.current;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rawNx = clamp((cx - base.cx) * 2, -max, max);
    const rawNy = clamp((base.cy - cy) * 2, -max, max);

    const s = smoothRef.current;
    s.nx = s.nx + (rawNx - s.nx) * alpha;
    s.ny = s.ny + (rawNy - s.ny) * alpha;

    setMeta({
      ok: true,
      message: "Tracking active",
      raw: { cx, cy, box },
      nx: s.nx,
      ny: s.ny,
    });
  }, [setBaseline]);

  const hardSet = useCallback((nx, ny, msg = "Fallback active") => {
    const s = smoothRef.current;
    s.nx = nx; s.ny = ny;
    setMeta((m) => ({
      ...m,
      ok: false,
      message: msg,
      nx,
      ny,
    }));
  }, []);

  const head = useMemo(() => ({ nx: meta.nx, ny: meta.ny }), [meta.nx, meta.ny]);

  return { head, meta, calibrate, updateFromFaceCenter, hardSet };
}
