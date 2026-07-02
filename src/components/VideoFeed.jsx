import { useState, useEffect, useRef } from 'react'
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

/* 해양생물 실루엣 — 물고기/해파리/거북이/치어 떼 */
function CreatureSVG({ type }) {
  if (type === 'jelly') {
    return (
      <svg viewBox="0 0 44 54" preserveAspectRatio="xMidYMid meet">
        <path d="M6 21 Q6 5 22 5 Q38 5 38 21 Q38 25 34 25 L10 25 Q6 25 6 21 Z" />
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M12 25 Q10 40 13 52" />
          <path d="M18 25 Q17 42 19 53" />
          <path d="M24 25 Q25 42 23 53" />
          <path d="M30 25 Q32 40 30 52" />
        </g>
      </svg>
    )
  }
  if (type === 'turtle') {
    return (
      <svg viewBox="0 0 54 40" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="24" cy="20" rx="15" ry="11" />
        <ellipse cx="43" cy="20" rx="5.5" ry="4" />
        <ellipse cx="14" cy="7" rx="6" ry="3.4" transform="rotate(-28 14 7)" />
        <ellipse cx="14" cy="33" rx="6" ry="3.4" transform="rotate(28 14 33)" />
        <ellipse cx="33" cy="9" rx="5" ry="3" transform="rotate(30 33 9)" />
        <ellipse cx="33" cy="31" rx="5" ry="3" transform="rotate(-30 33 31)" />
      </svg>
    )
  }
  if (type === 'school') {
    // 치어 떼 (작은 물고기 여러 마리) — 오른쪽을 향함
    const one = 'M16 6 Q11 1 4 5 L0 1 L2 6 L0 11 L4 7 Q11 11 16 6 Z'
    return (
      <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid meet">
        <path d={one} transform="translate(2 4) scale(1)" />
        <path d={one} transform="translate(24 0) scale(1.1)" />
        <path d={one} transform="translate(18 20) scale(0.85)" />
        <path d={one} transform="translate(40 14) scale(1)" />
      </svg>
    )
  }
  // fish (기본) — 오른쪽(머리)을 향함
  return (
    <svg viewBox="0 0 64 34" preserveAspectRatio="xMidYMid meet">
      <path d="M58 17 Q42 3 20 11 Q10 5 4 3 Q9 13 4 31 Q10 29 20 23 Q42 31 58 17 Z" />
    </svg>
  )
}

// 자율 유영 개체 (spd = %/s). swims=true면 진행 방향을 바라봄, false(해파리)는 부유
const CREATURES = [
  { type: 'fish', size: 62, op: 0.22, blur: 0.5, spd: 9 },
  { type: 'school', size: 54, op: 0.16, blur: 1, spd: 11 },
  { type: 'jelly', size: 38, op: 0.18, blur: 0.6, spd: 3 },
  { type: 'fish', size: 48, op: 0.19, blur: 0.7, spd: 8 },
  { type: 'turtle', size: 78, op: 0.2, blur: 0.9, spd: 4.5 },
  { type: 'fish', size: 42, op: 0.14, blur: 1.2, spd: 7 },
  { type: 'school', size: 46, op: 0.13, blur: 1.3, spd: 10 },
  { type: 'fish', size: 34, op: 0.12, blur: 1.5, spd: 6 },
  { type: 'jelly', size: 30, op: 0.14, blur: 1, spd: 2.5 },
  { type: 'fish', size: 40, op: 0.13, blur: 1.1, spd: 8 },
]

const rand = (a, b) => a + Math.random() * (b - a)

function MarineLife() {
  const elsRef = useRef([])
  const stateRef = useRef(null)
  if (!stateRef.current) {
    stateRef.current = CREATURES.map((c) => ({
      ...c,
      x: rand(8, 92),
      y: rand(12, 88),
      heading: rand(0, Math.PI * 2),
      turn: rand(-0.5, 0.5),
      phase: rand(0, Math.PI * 2),
      swims: c.type !== 'jelly',
    }))
  }

  useEffect(() => {
    let raf
    let last = null
    const loop = (t) => {
      if (last == null) last = t
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05 // 탭 비활성 등으로 큰 점프 방지
      const arr = stateRef.current
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i]
        // 자아: 방향을 서서히 무작위로 틀며 배회
        c.turn += rand(-1, 1) * 1.8 * dt
        c.turn = Math.max(-0.9, Math.min(0.9, c.turn))
        c.heading += c.turn * dt * (c.swims ? 1.2 : 0.5)
        const vx = Math.cos(c.heading)
        const vy = Math.sin(c.heading)
        c.x += vx * c.spd * dt
        c.y += vy * c.spd * dt * (c.swims ? 1 : 0.6)
        // 가장자리에서 방향 전환(반사)
        if (c.x < 5 && vx < 0) (c.heading = Math.PI - c.heading), (c.turn *= -0.4)
        if (c.x > 95 && vx > 0) (c.heading = Math.PI - c.heading), (c.turn *= -0.4)
        if (c.y < 8 && vy < 0) (c.heading = -c.heading), (c.turn *= -0.4)
        if (c.y > 92 && vy > 0) (c.heading = -c.heading), (c.turn *= -0.4)
        c.x = Math.max(5, Math.min(95, c.x))
        c.y = Math.max(8, Math.min(92, c.y))

        const el = elsRef.current[i]
        if (!el) continue
        let tf = 'translate(-50%, -50%)'
        if (c.swims) {
          const deg = (c.heading * 180) / Math.PI
          const flipY = Math.cos(c.heading) < 0 ? -1 : 1 // 좌향 시 상하 뒤집어 배가 아래로
          tf += ` rotate(${deg}deg) scale(1, ${flipY})`
        } else {
          c.phase += dt * 2
          tf += ` translateY(${Math.sin(c.phase) * 2.5}px)`
        }
        el.style.left = c.x + '%'
        el.style.top = c.y + '%'
        el.style.transform = tf
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="videofeed__life" aria-hidden="true">
      {stateRef.current.map((c, i) => (
        <div
          key={i}
          ref={(el) => (elsRef.current[i] = el)}
          className="videofeed__creature"
          style={{ width: `${c.size}px`, opacity: c.op, filter: `blur(${c.blur}px)` }}
        >
          <CreatureSVG type={c.type} />
        </div>
      ))}
    </div>
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
        {/* 지나다니는 해양생물 그림자 */}
        <MarineLife />
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
