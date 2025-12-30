import { useMemo, useState } from "react";
import * as THREE from "three";
import { RoundedBox, useTexture } from "@react-three/drei";
import { makeArtworkTextures } from "./artTextures";

// 1x1 transparent PNG (fallback for useTexture hook)
const FALLBACK_TEX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/Urp7xkAAAAASUVORK5CYII=";

export default function ArtworkFrame({
  id,
  title,
  artist,
  year,
  note,

  position = [0, 1.5, 0],
  rotation = [0, 0, 0],

  onSelect,
  selected = false,

  // 기존(절차적 텍스처) 유지
  seed = 1,

  // ✅ 단일 이미지(JPEG/PNG)
  imageUrl,

  // ✅ 2.5D 레이어(보통 PNG, fg/mid는 알파 가능)
  layerUrls, // { bg?: string, mid?: string, fg?: string }

  size = { w: 1.05, h: 1.45 },
}) {
  const [hovered, setHovered] = useState(false);

  const hasLayerUrls = !!(layerUrls?.bg || layerUrls?.mid || layerUrls?.fg);
  const useProcedural = !imageUrl && !hasLayerUrls;

  // ✅ useTexture는 hook이므로 조건부 호출 금지: 항상 3장을 로딩
  const [texBg, texMid, texFg] = useTexture([
    (hasLayerUrls ? layerUrls?.bg : null) || FALLBACK_TEX,
    (hasLayerUrls ? layerUrls?.mid : imageUrl) || FALLBACK_TEX,
    (hasLayerUrls ? layerUrls?.fg : null) || FALLBACK_TEX,
  ]);

  const procedural = useMemo(
    () => (useProcedural ? makeArtworkTextures(seed) : null),
    [useProcedural, seed]
  );

  // 텍스처 공통 세팅
  useMemo(() => {
    const setup = (t) => {
      if (!t) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    };
    setup(texBg);
    setup(texMid);
    setup(texFg);
  }, [texBg, texMid, texFg]);

  const frameOuter = { w: size.w + 0.10, h: size.h + 0.10, d: 0.08 };

  // ✅ 프레임이 작품을 가리는 문제 해결:
  // 프레임(통짜 박스)을 살짝 뒤로 밀고, 작품/유리를 프레임 앞면보다 살짝 앞으로 배치.
  const frameZ = -0.045;                       // 프레임 중심 z
  const frameFrontZ = frameZ + frameOuter.d / 2; // 프레임 앞면 z (대략 -0.005)

  const zBg = frameFrontZ + 0.002;  // 작품은 프레임 앞면보다 앞(카메라 쪽)
  const zMid = frameFrontZ + 0.004;
  const zFg = frameFrontZ + 0.006;
  const zGlass = frameFrontZ + 0.012;

  const matBack = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0b0c10",
        roughness: 0.95,
        metalness: 0.0,
      }),
    []
  );

  const matGlass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.16,
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.82,
        thickness: 0.08,
        ior: 1.45,
        reflectivity: 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      }),
    []
  );

  const matBg = useMemo(() => {
    const map = useProcedural ? procedural?.bg : texBg;
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.9,
      metalness: 0.0,
      transparent: false,
    });
  }, [useProcedural, procedural, texBg]);

  const matMid = useMemo(() => {
    const map = useProcedural ? procedural?.mid : texMid;
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.85,
      metalness: 0.0,
      // 단일 JPEG는 알파 없음 → 투명 false가 안정적
      transparent: hasLayerUrls ? true : false,
      opacity: hasLayerUrls ? 0.95 : 1.0,
    });
  }, [useProcedural, procedural, texMid, hasLayerUrls]);

  const matFg = useMemo(() => {
    const map = useProcedural ? procedural?.fg : texFg;
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.75,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
    });
  }, [useProcedural, procedural, texFg]);

  const glowStrength = selected ? 0.28 : hovered ? 0.18 : 0.0;

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.({ id, title, artist, year, note, position, rotation, size });
      }}
    >
      {/* Outer frame (통짜 박스) - 뒤로 이동 */}
      <RoundedBox
        position={[0, 0, frameZ]}
        args={[frameOuter.w, frameOuter.h, frameOuter.d]}
        radius={0.03}
        smoothness={6}
      >
        <meshStandardMaterial
          color={"#0f1116"}
          roughness={0.35}
          metalness={0.55}
          emissive={"#9ff2d3"}
          emissiveIntensity={glowStrength}
        />
      </RoundedBox>

      {/* Inner matte/backing (프레임 뒤쪽) */}
      <mesh position={[0, 0, frameZ - 0.03]}>
        <planeGeometry args={[size.w + 0.02, size.h + 0.02]} />
        <primitive object={matBack} attach="material" />
      </mesh>

      {/* Artwork */}
      {useProcedural && (
        <>
          <mesh position={[0, 0, zBg]}>
            <planeGeometry args={[size.w, size.h]} />
            <primitive object={matBg} attach="material" />
          </mesh>
          <mesh position={[0, 0, zMid]}>
            <planeGeometry args={[size.w, size.h]} />
            <primitive object={matMid} attach="material" />
          </mesh>
          <mesh position={[0, 0, zFg]}>
            <planeGeometry args={[size.w, size.h]} />
            <primitive object={matFg} attach="material" />
          </mesh>
        </>
      )}

      {!useProcedural && hasLayerUrls && (
        <>
          <mesh position={[0, 0, zBg]}>
            <planeGeometry args={[size.w, size.h]} />
            <primitive object={matBg} attach="material" />
          </mesh>
          <mesh position={[0, 0, zMid]}>
            <planeGeometry args={[size.w, size.h]} />
            <primitive object={matMid} attach="material" />
          </mesh>
          <mesh position={[0, 0, zFg]}>
            <planeGeometry args={[size.w, size.h]} />
            <primitive object={matFg} attach="material" />
          </mesh>
        </>
      )}

      {!useProcedural && !hasLayerUrls && (
        <>
          {/* 단일 imageUrl(JPEG) */}
          <mesh position={[0, 0, zMid]}>
            <planeGeometry args={[size.w, size.h]} />
            <primitive object={matMid} attach="material" />
          </mesh>
        </>
      )}

      {/* Glass (작품보다 앞) */}
      <mesh position={[0, 0, zGlass]}>
        <planeGeometry args={[size.w + 0.01, size.h + 0.01]} />
        <primitive object={matGlass} attach="material" />
      </mesh>
    </group>
  );
}
