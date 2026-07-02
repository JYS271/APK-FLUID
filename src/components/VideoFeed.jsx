import { useState } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 쓰레기 종류별 실루엣 (첨부 이미지 기반: 페트병/비닐봉지/폐어망/스티로폼)
   fill/stroke는 CSS 변수 → 열화상 모드에서 열 신호로 테마 전환 */
function DebrisShape({ kind }) {
  const common = {
    fill: 'var(--dfill)',
    stroke: 'var(--dstroke)',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
  }
  if (kind === 'bottle') {
    return (
      <svg className="debris__svg" viewBox="0 0 44 78" preserveAspectRatio="xMidYMid meet">
        <rect x="17" y="2" width="10" height="6" rx="1.6" {...common} />
        <path
          d="M17.5 8 h9 v3.4 q0 1.8 1.4 3.2 q3.8 3.8 3.8 9.6 v39 q0 8.6-9.7 8.6 t-9.7-8.6 v-39 q0-5.8 3.8-9.6 q1.4-1.4 1.4-3.2 z"
          {...common}
        />
        <path d="M12.5 50 h19 M12.5 57 h19" fill="none" stroke="var(--daccent)" strokeWidth="1.3" />
      </svg>
    )
  }
  if (kind === 'bag') {
    return (
      <svg className="debris__svg" viewBox="0 0 56 60" preserveAspectRatio="xMidYMid meet">
        <path d="M18 15 q1.5-9 10-9 M38 15 q-1.5-9-10-9" fill="none" stroke="var(--dstroke)" strokeWidth="1.6" />
        <path
          d="M11 15 q-3.5 3-1.5 7 q1 2.5 3 3.6 q-2.6 15 3 27.5 q3.2 7 12.5 7 t12.5-7 q5.6-12.5 3-27.5 q2-1.1 3-3.6 q2-4-1.5-7 q-14 5.5-28 0 z"
          {...common}
        />
        <path d="M21 24 q3.5 12 1.5 22 M35 24 q-3.5 12-1.5 22" fill="none" stroke="var(--daccent)" strokeWidth="1.2" />
      </svg>
    )
  }
  if (kind === 'net') {
    const lines = []
    for (let i = -7; i <= 13; i++) {
      const o = i * 7
      lines.push(<line key={`a${i}`} x1={o} y1="0" x2={o + 52} y2="52" />)
      lines.push(<line key={`b${i}`} x1={o} y1="52" x2={o + 52} y2="0" />)
    }
    return (
      <svg className="debris__svg" viewBox="0 0 52 52" preserveAspectRatio="xMidYMid meet">
        <defs>
          <clipPath id="netclip">
            <ellipse cx="26" cy="26" rx="23" ry="21" />
          </clipPath>
        </defs>
        <g clipPath="url(#netclip)" stroke="var(--dstroke)" strokeWidth="1.3" fill="none" opacity="0.95">
          {lines}
        </g>
        <ellipse cx="26" cy="26" rx="23" ry="21" fill="none" stroke="var(--dstroke)" strokeWidth="2.2" />
      </svg>
    )
  }
  // foam (스티로폼)
  return (
    <svg className="debris__svg" viewBox="0 0 54 50" preserveAspectRatio="xMidYMid meet">
      <path
        d="M11 32 q-5-11 6-14 q1.5-9 12-8.5 q6.5-5.5 15 0 q11-0.5 8.5 11 q6 6.5-2.5 12.5 q0.5 9-12.5 9 q-8.5 4.5-17-1 q-12.5 1-9.5-10.5 z"
        {...common}
      />
      <g fill="var(--daccent)">
        <circle cx="20" cy="23" r="2.6" />
        <circle cx="31" cy="20" r="2.1" />
        <circle cx="27" cy="31" r="2.8" />
        <circle cx="38" cy="29" r="2.2" />
        <circle cx="17" cy="33" r="1.9" />
      </g>
    </svg>
  )
}

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
