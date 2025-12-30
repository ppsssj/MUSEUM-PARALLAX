import { useEffect, useMemo } from "react";
import Room from "./Room";
import ArtworkFrame from "./ArtworkFrame";

export default function GalleryScene({
  selectedId,
  onSelect,
  focusIndex,
  onFocusIndexChange,
  enableControls = true,
  isInspecting = false,
}) {
  const artworks = useMemo(
    () => [
      // ✅ A1: Pic2/Pic3/Pic4 레이어(2.5D)
      {
        id: "a1",
        title: "River Parallax Study",
        artist: "Layered Study",
        year: "2025",
        note: "Pic2(배경) / Pic3(인물/플랫폼) / Pic4(보트/전경) 레이어로 구성된 2.5D 테스트 작품입니다.",
        layerUrls: {
          bg: "/art/Pic2.png",
          mid: "/art/Pic3.png",
          fg: "/art/Pic4.png",
        },
        // Pic2가 가로형이므로 프레임도 가로형 비율 추천
        size: { w: 1.65, h: 1.05 },
        pos: [-4.2, 2.8, -4.2],
        rot: [0, 0.30, 0],
      },

      // ✅ A2: Pic1 단일 이미지
      {
        id: "a2",
        title: "Pic1 Study",
        artist: "Reference",
        year: "2025",
        note: "단일 이미지(Pic1) 적용 테스트 작품입니다.",
        imageUrl: "/art/Pic1.jpg",
        size: { w: 1.55, h: 1.16 }, // Pic1이 가로 비율이면 이 값 유지/조정
        pos: [0.0, 2.8, -4.45],
        rot: [0, 0.0, 0],
      },

      // ✅ A3: 기존 절차적(Seed) 유지
      {
        id: "a3",
        title: "Soft Geometry",
        artist: "Procedural",
        year: "2025",
        note: "기본 절차적 텍스처 작품(Seed)입니다.",
        seed: 33,
        pos: [4.2, 2.8, -4.2],
        rot: [0, -0.30, 0],
      },

      // ✅ A4: 기존 절차적(Seed) 유지
      {
        id: "a4",
        title: "Near Silence",
        artist: "Procedural",
        year: "2025",
        note: "기본 절차적 텍스처 작품(Seed)입니다.",
        seed: 44,
        pos: [-6.8, 2.8, -1.2],
        rot: [0, 0.85, 0],
        size: { w: 0.95, h: 1.32 },
      },
    ],
    []
  );

  // Scroll wheel -> focus change (subtle navigation)
  useEffect(() => {
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) < 6) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(artworks.length - 1, (focusIndex ?? 0) + dir));
      if (next !== focusIndex) onFocusIndexChange?.(next);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [artworks.length, focusIndex, onFocusIndexChange]);

  return (
    <>
      <Room />

      {/* Lighting: clean + gallery-like */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[6, 8, 6]}
        intensity={1.35}
        say
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight position={[-4, 5.5, -2]} intensity={1.7} angle={0.35} penumbra={0.6} />
      <spotLight position={[4, 5.5, -2]} intensity={1.55} angle={0.35} penumbra={0.6} />
      <spotLight position={[0, 5.2, -4]} intensity={1.25} angle={0.35} penumbra={0.7} />

      {/* Artworks */}
      {artworks.map((a) => (
        <ArtworkFrame
          key={a.id}
          id={a.id}
          title={a.title}
          artist={a.artist}
          year={a.year}
          note={a.note}
          seed={a.seed}
          imageUrl={a.imageUrl}       // ✅ Pic1
          layerUrls={a.layerUrls}     // ✅ Pic2/3/4
          position={a.pos}
          rotation={a.rot}
          size={a.size}
          selected={selectedId === a.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function getArtworkFocusTargets() {
  return [
    { pos: [-3.8, 1.65, 4.8], target: [-3.7, 2.4, -3.0] },
    { pos: [0.0, 1.65, 5.2], target: [0.0, 2.45, -3.9] },
    { pos: [3.8, 1.65, 4.8], target: [3.7, 2.4, -3.0] },
    { pos: [-1.8, 1.65, 6.2], target: [-5.6, 2.35, -1.4] },
  ];
}
