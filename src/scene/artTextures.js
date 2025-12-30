import * as THREE from "three";

/**
 * Creates a simple high-quality-looking procedural artwork texture using Canvas2D.
 * No external image assets required.
 */
export function makeArtworkTextures(seed = 1, w = 1024, h = 1536) {
  const rng = mulberry32(seed);

  const bg = makeLayer(w, h, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, pick(rng, ["#0b132b", "#0b0f14", "#0b1220", "#0a0a0f"]));
    grad.addColorStop(0.55, pick(rng, ["#121a2e", "#151622", "#1a1a22", "#141a20"]));
    grad.addColorStop(1, pick(rng, ["#0a0f1a", "#0a0c10", "#0b0c10", "#0a0b12"]));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // soft grain
    ctx.globalAlpha = 0.10;
    for (let i = 0; i < 2400; i++) {
      const x = rng() * w, y = rng() * h;
      const a = 0.08 + rng() * 0.12;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  });

  const mid = makeLayer(w, h, (ctx) => {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.9;

    // large shapes
    for (let i = 0; i < 7; i++) {
      const x = w * (0.08 + rng() * 0.84);
      const y = h * (0.10 + rng() * 0.82);
      const r = Math.min(w, h) * (0.08 + rng() * 0.22);

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const c1 = pick(rng, ["#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#fb7185", "#fbbf24"]);
      const c2 = pick(rng, ["#0b0c10", "#0b132b", "#0a0c10", "#0b0f14"]);
      g.addColorStop(0, hexToRgba(c1, 0.22 + rng() * 0.30));
      g.addColorStop(1, hexToRgba(c2, 0));

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r * (0.9 + rng() * 0.6), r * (0.6 + rng() * 0.8), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  });

  const fg = makeLayer(w, h, (ctx) => {
    // delicate lines
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.24)";

    for (let i = 0; i < 12; i++) {
      const y0 = h * (0.08 + rng() * 0.84);
      ctx.beginPath();
      ctx.moveTo(w * (0.06 + rng() * 0.08), y0);
      const cp1x = w * (0.25 + rng() * 0.2);
      const cp1y = y0 + h * (-0.08 + rng() * 0.16);
      const cp2x = w * (0.55 + rng() * 0.2);
      const cp2y = y0 + h * (-0.10 + rng() * 0.20);
      const x2 = w * (0.88 + rng() * 0.08);
      const y2 = y0 + h * (-0.05 + rng() * 0.10);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
      ctx.stroke();
    }

    // small stamps
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 18; i++) {
      const x = w * (0.10 + rng() * 0.80);
      const y = h * (0.12 + rng() * 0.76);
      const s = 6 + rng() * 18;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + rng() * 0.18})`;
      ctx.fillRect(x, y, s, s);
    }

    ctx.globalAlpha = 1;
  });

  return {
    bg: canvasToTexture(bg),
    mid: canvasToTexture(mid),
    fg: canvasToTexture(fg),
  };
}

function makeLayer(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  paint(ctx);
  return c;
}

function canvasToTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function hexToRgba(hex, a) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0,2), 16);
  const g = parseInt(m.slice(2,4), 16);
  const b = parseInt(m.slice(4,6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
