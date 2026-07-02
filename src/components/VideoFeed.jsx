import { useState, useEffect, useRef } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

const KIND_LABEL = { bottle: '페트병', can: '캔', glass: '유리병', cup: '종이컵' }
// 실루엣 종횡비(viewBox H/W) — 박스가 실루엣을 감싸도록
const KIND_ASPECT = { bottle: 78 / 44, can: 64 / 40, glass: 78 / 34, cup: 50 / 44 }

// 물살을 타고 떠다니는 쓰레기 (각자 박스가 추적)
const DEBRIS_INIT = [
  { kind: 'bottle', bw: 42 },
  { kind: 'can', bw: 36 },
  { kind: 'glass', bw: 32 },
  { kind: 'cup', bw: 40 },
  { kind: 'bottle', bw: 30 },
  { kind: 'can', bw: 34 },
  { kind: 'glass', bw: 38 },
  { kind: 'cup', bw: 32 },
]
// 화면 밖으로 완전히 나간 뒤에만 반대편에서 재진입(순간이동 방지)
const WRAP_LO = -60
const WRAP_HI = 160
const DEBRIS_COUNT = DEBRIS_INIT.length

/* 쓰레기 종류별 — 단색 그림자 실루엣만 (fill=currentColor) */
function DebrisShape({ kind }) {
  if (kind === 'bottle') {
    // 페트병
    return (
      <svg className="debris__svg" viewBox="0 0 44 78" preserveAspectRatio="xMidYMid meet" fill="currentColor">
        <rect x="16" y="2" width="12" height="7" rx="1.6" />
        <path d="M17 9 h10 v3.5 q0 1.8 1.4 3.2 q3.9 3.9 3.9 9.8 v39 q0 8.8-10.3 8.8 t-10.3-8.8 v-39 q0-5.9 3.9-9.8 q1.4-1.4 1.4-3.2 z" />
      </svg>
    )
  }
  if (kind === 'can') {
    // 알루미늄 캔
    return (
      <svg className="debris__svg" viewBox="0 0 40 64" preserveAspectRatio="xMidYMid meet" fill="currentColor">
        <path d="M8 9 v46 q0 4 12 4 t12-4 v-46 z" />
        <ellipse cx="20" cy="9" rx="12" ry="4" />
      </svg>
    )
  }
  if (kind === 'glass') {
    // 유리병
    return (
      <svg className="debris__svg" viewBox="0 0 34 78" preserveAspectRatio="xMidYMid meet" fill="currentColor">
        <rect x="13" y="2" width="8" height="6" rx="1" />
        <path d="M13.5 8 h7 v13 q0 2 1 3 q4.8 4 4.8 12.4 v33 q0 4.3-9.3 4.3 t-9.3-4.3 v-33 q0-8.4 4.8-12.4 q1-1 1-3 z" />
      </svg>
    )
  }
  // cup (종이컵)
  return (
    <svg className="debris__svg" viewBox="0 0 44 50" preserveAspectRatio="xMidYMid meet" fill="currentColor">
      <ellipse cx="22" cy="10" rx="13.5" ry="3.6" />
      <path d="M9 10 L35 10 L31 45 Q22 49 13 45 Z" />
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

/* 떠다니는 쓰레기 + 추적 박스 — 조류(state.current)를 타고 흐르고
   각 박스가 종류를 라벨링하며 개별 추적. rAF로 부드럽게 이동. */
function DebrisField() {
  const { state } = useTelemetry()
  const curRef = useRef(state.current)
  curRef.current = state.current
  const elsRef = useRef([])
  const objsRef = useRef([])
  const tagsRef = useRef([])
  const stRef = useRef(null)
  if (!stRef.current) {
    stRef.current = DEBRIS_INIT.map((d) => ({
      ...d,
      x: rand(8, 92),
      y: rand(10, 90),
      rot: rand(-25, 25),
      rotSpd: rand(-10, 10), // 느린 회전(뒤척임)
      phase: rand(0, Math.PI * 2),
      dirOff: rand(-0.5, 0.5), // 물살 대비 개별 방향차
      spdMul: rand(0.7, 1.3), // 개별 속도차
      confBase: 0.82 + Math.random() * 0.15,
    }))
  }

  useEffect(() => {
    let raf
    let last = null
    const loop = (t) => {
      if (last == null) last = t
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05
      const cur = curRef.current
      const baseAng = (cur.dir * Math.PI) / 180
      const spd = 2.4 + cur.speed * 3 // 물살 세기
      const arr = stRef.current
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i]
        c.phase += dt * 0.7
        // 물살을 타되 개별 방향차 + 완만한 방향 흔들림(자연스러운 배회)
        c.dirOff += rand(-1, 1) * 0.35 * dt
        c.dirOff = Math.max(-0.7, Math.min(0.7, c.dirOff))
        const a = baseAng + c.dirOff
        const sp = spd * c.spdMul
        c.x += (Math.sin(a) * sp + Math.sin(c.phase) * 0.8) * dt
        c.y += (-Math.cos(a) * sp + Math.cos(c.phase * 0.8) * 0.8) * dt
        // 완전히 화면 밖으로 나간 뒤에만 반대편에서 재진입(순간이동 방지)
        if (c.x < WRAP_LO) c.x = WRAP_HI
        else if (c.x > WRAP_HI) c.x = WRAP_LO
        if (c.y < WRAP_LO) c.y = WRAP_HI
        else if (c.y > WRAP_HI) c.y = WRAP_LO
        c.rot += c.rotSpd * dt

        const el = elsRef.current[i]
        if (!el) continue
        el.style.left = c.x + '%'
        el.style.top = c.y + '%'
        const obj = objsRef.current[i]
        if (obj) obj.style.transform = `rotate(${c.rot}deg)`
        const tag = tagsRef.current[i]
        if (tag) tag.textContent = `${KIND_LABEL[c.kind]} ${(c.confBase + Math.sin(c.phase * 1.6) * 0.03).toFixed(2)}`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      {stRef.current.map((c, i) => (
        <div
          key={i}
          ref={(el) => (elsRef.current[i] = el)}
          className="videofeed__track"
          style={{ width: `${c.bw}px`, height: `${c.bw * KIND_ASPECT[c.kind]}px`, transform: 'translate(-50%, -50%)' }}
        >
          <span ref={(el) => (tagsRef.current[i] = el)} className="videofeed__bbox-tag num">
            {KIND_LABEL[c.kind]}
          </span>
          <span ref={(el) => (objsRef.current[i] = el)} className="videofeed__obj">
            <DebrisShape kind={c.kind} />
          </span>
        </div>
      ))}
    </>
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

      {/* 떠다니는 쓰레기 + 추적 박스 — 배율에 따라 축소/확대 */}
      <div className="videofeed__dets" style={{ transform: `scale(${zoom})` }}>
        <DebrisField />
      </div>

      {/* HUD 오버레이 (제어 배경에선 숨김 — 상단 바와 겹침 방지) */}
      {showChips && (
        <div className="videofeed__hud">
          <span className="videofeed__rec">
            <b className="dot" /> LIVE
          </span>
          <span className="videofeed__count num">
            <i className="ti ti-viewfinder" /> {DEBRIS_COUNT}
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
