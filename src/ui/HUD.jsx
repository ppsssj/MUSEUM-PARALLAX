import React from "react";

export default function HUD({
  trackingEnabled,
  trackingStatus,
  onToggleTracking,
  onCalibrate,
  strength,
  onStrength,
  smoothing,
  onSmoothing,
  focusIndex,
  total,
  onPrev,
  onNext,
  selectedArtwork,
  onCloseArtwork,
}) {
  const dotClass = trackingEnabled && trackingStatus === "ready" ? "dot on" : trackingEnabled ? "dot on" : "dot off";

  return (
    <div className="hud">
      <div className="topBar">
        <div className="brand">
          <div className="brandDot" />
          <div className="brandTitle">
            <b>Museum Window</b>
            <span>head-tracked parallax study</span>
          </div>
        </div>

        <div className="controls">
          <div className="pill" title={trackingStatus}>
            <span className={dotClass} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {trackingEnabled ? "Tracking" : "Tracking Off"}
            </span>
          </div>

          <button className="btn btnPrimary" onClick={onCalibrate}>
            캘리브레이션
          </button>

          <button
            className={`btn ${trackingEnabled ? "btnDanger" : "btnPrimary"}`}
            onClick={onToggleTracking}
          >
            {trackingEnabled ? "트래킹 끄기" : "트래킹 켜기"}
          </button>

          <button className="btn" onClick={onPrev} disabled={focusIndex <= 0}>
            이전
          </button>
          <button className="btn" onClick={onNext} disabled={focusIndex >= total - 1}>
            다음
          </button>

          <div className="sliderRow">
            <label>시차</label>
            <input
              type="range"
              min="0.12"
              max="0.55"
              step="0.01"
              value={strength}
              onChange={(e) => onStrength(parseFloat(e.target.value))}
            />
          </div>

          <div className="sliderRow">
            <label>스무딩</label>
            <input
              type="range"
              min="0.08"
              max="0.35"
              step="0.01"
              value={smoothing}
              onChange={(e) => onSmoothing(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="bottomHint">
        <b>감상 방법</b><br />
        고개를 아주 조금만 움직여 시차를 확인하세요. 휠 스크롤 또는 상단의 <b>이전/다음</b>으로 작품 포커스를 이동할 수 있습니다.
        트래킹이 꺼져 있거나 권한이 거부되면, 마우스 이동이 시차 입력으로 대체됩니다.
      </div>

      {selectedArtwork && (
        <div className="sidePanel">
          <div className="sideHeader">
            <div>
              <h3>{selectedArtwork.title}</h3>
              <p>{selectedArtwork.note}</p>
            </div>
            <button className="btn" onClick={onCloseArtwork}>닫기</button>
          </div>

          <div className="kv">
            <div>Artist</div><b>{selectedArtwork.artist}</b>
            <div>Year</div><b>{selectedArtwork.year}</b>
            <div>Interaction</div><b>Head parallax + subtle orbit</b>
          </div>

          <div className="notice">
            본 데모는 외부 이미지 없이도 감성을 유지하도록, 내부에서 생성한 캔버스 텍스처(추상 레이어)로 작품을 구성했습니다.
            실제 작품 이미지를 사용하려면 2.5D 레이어 분리(전경/중경/배경) 후 텍스처만 교체하면 됩니다.
          </div>
        </div>
      )}
    </div>
  );
}
