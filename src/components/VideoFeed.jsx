import { useState } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 쓰레기 종류별 실루엣 (첨부 이미지 기반: 담뱃갑/캔/스마트폰/약병)
   fill/stroke는 CSS 변수 → 열화상 모드에서 열 신호로 테마 전환 */
function DebrisShape({ kind }) {
  const common = {
    fill: 'var(--dfill)',
    stroke: 'var(--dstroke)',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
  }
  if (kind === 'cigpack') {
    // 담뱃갑 (구겨진 사각 팩)
    return (
      <svg className="debris__svg" viewBox="0 0 46 54" preserveAspectRatio="xMidYMid meet">
        <path
          d="M9 13 L35 7 Q38 6 38.3 10 L40 44 Q40.2 48 37 49 L12 53 Q8 53 7.8 49 L6.7 17 Q6.6 14 9 13 Z"
          {...common}
        />
        <path d="M9 13 L35 7 L36 15 L9.6 21 Z" fill="var(--daccent)" stroke="var(--dstroke)" strokeWidth="1.2" />
        <ellipse cx="23" cy="35" rx="7" ry="7.5" fill="none" stroke="var(--daccent)" strokeWidth="1.8" />
      </svg>
    )
  }
  if (kind === 'can') {
    // 알루미늄 캔
    return (
      <svg className="debris__svg" viewBox="0 0 40 64" preserveAspectRatio="xMidYMid meet">
        <path d="M8 9 v46 q0 4 12 4 t12-4 v-46 z" {...common} />
        <ellipse cx="20" cy="9" rx="12" ry="4" {...common} />
        <ellipse cx="20" cy="9" rx="8.6" ry="2.6" fill="none" stroke="var(--daccent)" strokeWidth="1.3" />
        <circle cx="23.5" cy="9" r="1.6" fill="var(--daccent)" />
        <path d="M8 18 h24 M8 47 h24" fill="none" stroke="var(--daccent)" strokeWidth="1.2" />
      </svg>
    )
  }
  if (kind === 'phone') {
    // 스마트폰 (깨진 화면)
    return (
      <svg className="debris__svg" viewBox="0 0 40 74" preserveAspectRatio="xMidYMid meet">
        <rect x="6" y="4" width="28" height="66" rx="5.5" {...common} />
        <rect x="9.5" y="10" width="21" height="50" rx="2" fill="var(--daccent)" stroke="var(--dstroke)" strokeWidth="1.2" />
        <rect x="16" y="6.6" width="8" height="1.8" rx="0.9" fill="var(--dstroke)" />
        <circle cx="20" cy="65" r="2.6" fill="none" stroke="var(--dstroke)" strokeWidth="1.4" />
        <path d="M20 24 L14 36 L23 42 L16 55 M20 24 L27 33 L21 41" fill="none" stroke="var(--dstroke)" strokeWidth="1" />
      </svg>
    )
  }
  // pill (약병)
  return (
    <svg className="debris__svg" viewBox="0 0 36 62" preserveAspectRatio="xMidYMid meet">
      <rect x="9" y="3" width="18" height="8" rx="1.8" {...common} />
      <path d="M8 11 h20 q1 0 1 3 v40 q0 3-2 3 H9 q-2 0-2-3 v-40 q0-3 1-3 z" {...common} />
      <rect x="10.5" y="24" width="15" height="22" rx="1.5" fill="var(--daccent)" stroke="var(--dstroke)" strokeWidth="1" />
      <path d="M13 30 h10 M13 35 h10 M13 40 h6" fill="none" stroke="var(--dstroke)" strokeWidth="1" />
    </svg>
  )
}

/* 가상 카메라 피드 (RGB / 열화상)
   - AI 바운딩 박스: state.detections를 픽셀단위(%) 실시간 오버레이
   - 디헤이징: 탁도 보정 필터로 시인성 확보
   실제 연동 시 WebRTC <video>로 교체. */
export default function VideoFeed({ compact = false, thermal: thermalProp, showChips = true, zoom = 1 }) {
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

      {/* AI 바운딩 박스 오버레이 (탐지 결과) — 배율에 따라 축소/확대 */}
      <div className="videofeed__dets" style={{ transform: `scale(${zoom})` }}>
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
            {/* 실제 쓰레기 객체 — 종류별 실루엣으로 박스 안에 표시 */}
            <span className="videofeed__obj">
              <DebrisShape kind={d.kind} />
            </span>
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
