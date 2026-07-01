import { useState } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 가상 카메라 피드 (RGB / 열화상)
   - AI 바운딩 박스: state.detections를 픽셀단위(%) 실시간 오버레이
   - 디헤이징: 탁도 보정 필터로 시인성 확보
   실제 연동 시 WebRTC <video>로 교체. */
export default function VideoFeed({ compact = false, thermal: thermalProp, showChips = true }) {
  const { state, toggleDehaze } = useTelemetry()
  const [thermalState, setThermalState] = useState(false)
  // thermalProp이 주어지면 제어(외부), 아니면 내부 상태 사용
  const controlled = thermalProp !== undefined
  const thermal = controlled ? thermalProp : thermalState
  const dehaze = state.dehaze

  // 디헤이징 파이프라인: 탁도 비례 보정 (탁도↑ → 보정 강도↑)
  const clarity = Math.min(1, Math.max(0, (state.turbidity - 15) / 45))
  const sceneFilter = dehaze
    ? `contrast(${1 + clarity * 0.35}) brightness(${1 + clarity * 0.14}) saturate(${1 + clarity * 0.4})`
    : 'none'

  return (
    <div className={`videofeed ${thermal ? 'videofeed--thermal' : ''}`}>
      {/* 가상 수중 장면 */}
      <div className="videofeed__scene" style={{ filter: sceneFilter }}>
        <div className="videofeed__caustics" />
        {!dehaze && <div className="videofeed__haze" style={{ opacity: 0.25 + clarity * 0.4 }} />}
        <div className="videofeed__particle p1" />
        <div className="videofeed__particle p2" />
        <div className="videofeed__particle p3" />
      </div>

      {/* AI 바운딩 박스 오버레이 (탐지 결과) */}
      <div className="videofeed__dets">
        {state.detections.map((d) => (
          <div
            key={d.id}
            className="videofeed__bbox"
            style={{
              left: `${d.x * 100}%`,
              top: `${d.y * 100}%`,
              width: `${d.w * 100}%`,
              height: `${d.h * 100}%`,
            }}
          >
            <span className="videofeed__bbox-tag num">
              {d.label} {d.conf.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* HUD 오버레이 (제어 배경에선 숨김 — 상단 바와 겹침 방지) */}
      {showChips && (
        <div className="videofeed__hud">
          <span className="videofeed__rec">
            <b className="dot" /> LIVE
          </span>
          <span className="videofeed__count num">
            <i className="ti ti-viewfinder" /> {state.detections.length}
          </span>
          <span className="num videofeed__depth">
            <i className="ti ti-arrow-down" /> {state.depth.toFixed(1)}m
          </span>
        </div>
      )}

      {/* 하단 컨트롤: 디헤이징 · 카메라 모드 (제어 배경에선 숨김) */}
      {showChips && (
        <div className="videofeed__ctl">
          <button
            className={`videofeed__chip ${dehaze ? 'is-on' : ''}`}
            onClick={toggleDehaze}
            title="수중 디헤이징"
          >
            <i className="ti ti-wand" />
            디헤이징 {dehaze ? 'ON' : 'OFF'}
          </button>
          <button className="videofeed__chip" onClick={() => setThermalState((v) => !v)}>
            <i className={`ti ${thermal ? 'ti-flame' : 'ti-camera'}`} />
            {thermal ? '열화상' : 'RGB'}
          </button>
        </div>
      )}

      {!compact && (
        <div className="videofeed__meta num">
          <span><i className="ti ti-temperature" /> {state.waterTemp.toFixed(1)}℃</span>
          <span><i className="ti ti-droplet" /> {Math.round(state.turbidity)} NTU</span>
        </div>
      )}
    </div>
  )
}
