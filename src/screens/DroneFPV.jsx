import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useTelemetry, ENV_MODES } from '../state/TelemetryContext.jsx'

/* ============================================================
   미니 수중 드론 1인칭(FPV) 조종 화면
   ------------------------------------------------------------
   본체는 Auto Mode로 자동 운항하고, 사용자는 미니 수중 드론만 조종한다.
   앱은 가로(landscape) 유지 — 기존 제어화면과 동일하게 스테이지를 90° 회전.
   좌하단 가상 조이스틱(이동) · 우하단 카메라/상승·하강 · 반투명 HUD.
   ============================================================ */

const ENV_MAP = Object.fromEntries(ENV_MODES.map((m) => [m.key, m]))

// 스테이지 rotate(90deg) → 화면좌표 델타를 스테이지 로컬 좌표로 변환
// local.x = screen.y, local.y = -screen.x
function toLocal(sdx, sdy) {
  return { lx: sdy, ly: -sdx }
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// 해저 지형 슬롯 — 타입 고정(마크업 재생성 방지), 위치/크기만 재활용
const FEATURE_TYPES = [
  'sand', 'rock', 'weed', 'rock', 'structure', 'weed',
  'rock', 'obstacle', 'weed', 'rock', 'structure', 'sand', 'rock', 'weed',
]
const DET_LABELS = [
  { label: '페트병', kind: 'bottle' },
  { label: '종이 박스', kind: 'box' },
  { label: '나뭇가지', kind: 'branch' },
  { label: '비닐봉지', kind: 'bag' },
  { label: '캔', kind: 'can' },
  { label: '폐어구', kind: 'net' },
  { label: '스티로폼', kind: 'foam' },
]

function makeDet(i) {
  const d = DET_LABELS[Math.floor(Math.random() * DET_LABELS.length)]
  return {
    id: i,
    label: d.label,
    kind: d.kind,
    x: 18 + Math.random() * 56, // %
    y: 30 + Math.random() * 40, // %
    w: 12 + Math.random() * 12,
    h: 14 + Math.random() * 12,
    conf: +(0.72 + Math.random() * 0.26).toFixed(2),
  }
}

export default function DroneFPV({ onExit }) {
  const { state, stateRef, setDroneMove, toggleDroneLight, setAutonomy, setDroneDeployed } = useTelemetry()
  const env = ENV_MAP[state.environment] || ENV_MODES[0]

  // 진입 시: 본체 자동 운항 + 드론 전개 / 종료 시: 드론 복귀 도킹
  // (멱등 SET_DRONE_DEPLOYED → StrictMode 이중 마운트에도 안전)
  useEffect(() => {
    setAutonomy('auto')
    setDroneDeployed(true)
    return () => {
      setDroneMove(0, 0)
      setDroneDeployed(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- 가로 스테이지 측정(90° 회전 → w/h swap) ---
  const rootRef = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current
      if (el) setDims({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  // 로컬(가로) 캔버스: 폭 = 세로프레임 높이, 높이 = 세로프레임 폭
  const localW = dims.h
  const localH = dims.w

  // --- 제어 입력 refs ---
  const moveRef = useRef({ x: 0, y: 0 }) // 조이스틱: x=좌우, y=전후(위=-1 전진)
  const camRef = useRef({ x: 0, y: 0 }) // 카메라 방향 패드 입력(-1..1)
  const lookRef = useRef({ x: 0, y: 0 }) // 이징된 시야 이동(px)
  const depthDirRef = useRef(0) // 상승 -1 / 하강 +1
  const depthRef = useRef(6.5)
  const distRef = useRef(0)
  const startTempRef = useRef(stateRef.current.waterTemp - (6.5 - 1.5) * 0.3) // 진입 수심 기준 → 변화량 0에서 시작

  // --- 애니메이션 대상 DOM refs ---
  const worldRef = useRef(null)
  const featEls = useRef([])
  const feats = useRef(
    FEATURE_TYPES.map((type, i) => ({
      type,
      x: Math.random() * 100,
      z: (i / FEATURE_TYPES.length) * 1.0,
      size: 0.6 + Math.random() * 0.9,
    }))
  )

  // --- HUD 수치(저빈도 갱신) ---
  const [hud, setHud] = useState({ temp: startTempRef.current, depth: 6.5, dist: 0, delta: 0 })

  // --- AI 탐지 박스(0.48s 주기 드리프트/교체) ---
  const [dets, setDets] = useState(() => [0, 1, 2, 3].map(makeDet))
  useEffect(() => {
    const id = setInterval(() => {
      setDets((prev) =>
        prev.map((d) => {
          if (Math.random() < 0.12) return makeDet(d.id)
          return {
            ...d,
            x: clamp(d.x + (Math.random() - 0.5) * 4, 10, 78),
            y: clamp(d.y + (Math.random() - 0.5) * 3, 24, 74),
            conf: +clamp(d.conf + (Math.random() - 0.5) * 0.05, 0.62, 0.98).toFixed(2),
          }
        })
      )
    }, 480)
    return () => clearInterval(id)
  }, [])

  // --- 메인 애니메이션 루프 ---
  const rafRef = useRef(0)
  const prevRef = useRef(0)
  const hudAccRef = useRef(0)
  useEffect(() => {
    const H = localH || 390
    const horizon = H * 0.34
    const floor = H * 1.02
    const step = (now) => {
      const dt = clamp((now - (prevRef.current || now)) / 1000, 0, 0.05)
      prevRef.current = now

      // 수심(상승/하강)
      depthRef.current = clamp(depthRef.current + depthDirRef.current * 1.5 * dt, 1.5, 13.5)

      const fwd = -moveRef.current.y // 위로 밀면 전진(+)
      const strafe = moveRef.current.x
      const speed = Math.max(0, fwd)
      distRef.current += speed * 2.4 * dt

      // 시야 이징(카메라 패드 + 조이스틱 좌우 약간)
      const maxLook = 58
      const tgtX = camRef.current.x * maxLook + strafe * 20
      const tgtY = camRef.current.y * maxLook
      const k = Math.min(1, dt * 6)
      lookRef.current.x += (tgtX - lookRef.current.x) * k
      lookRef.current.y += (tgtY - lookRef.current.y) * k
      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${lookRef.current.x.toFixed(1)}px, ${lookRef.current.y.toFixed(1)}px)`
      }

      // 해저 지형 컨베이어(원근 투영)
      const conv = 0.14 + speed * 0.5
      for (let i = 0; i < feats.current.length; i++) {
        const f = feats.current[i]
        const el = featEls.current[i]
        if (!el) continue
        f.z += conv * dt
        f.x -= strafe * (10 + f.size * 6) * dt
        if (f.z > 1.1) {
          f.z = -Math.random() * 0.12
          f.x = Math.random() * 100
          f.size = 0.6 + Math.random() * 0.9
        }
        if (f.x < -14) f.x += 128
        else if (f.x > 114) f.x -= 128
        const z = Math.max(0, f.z)
        const scale = (0.2 + z * 1.5) * f.size
        const y = horizon + (floor - horizon) * Math.pow(z, 1.5)
        const op = clamp(z * 2.4, 0, 1) * clamp((1.12 - f.z) * 4, 0, 1)
        el.style.left = f.x.toFixed(2) + '%'
        el.style.transform = `translate(-50%, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`
        el.style.opacity = op.toFixed(2)
        el.style.zIndex = String(Math.round(z * 100))
      }

      // HUD 저빈도 갱신
      hudAccRef.current += dt
      if (hudAccRef.current > 0.14) {
        hudAccRef.current = 0
        const base = stateRef.current.waterTemp
        const temp = base - (depthRef.current - 1.5) * 0.3
        setHud({
          temp,
          depth: depthRef.current,
          dist: distRef.current,
          delta: temp - startTempRef.current,
        })
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localH])

  // 조이스틱 → 드론 이동 상태 + 로컬 파랄랙스
  const onJoy = useCallback(
    (x, y) => {
      moveRef.current = { x, y }
      setDroneMove(x, y)
    },
    [setDroneMove]
  )

  const light = state.drone.light
  const battery = Math.round(state.drone.battery)
  const signal = Math.round(state.signal)
  const distText = hud.dist >= 1000 ? `${(hud.dist / 1000).toFixed(2)}km` : `${Math.round(hud.dist)}m`
  const deltaUp = hud.delta >= 0

  return (
    <div className="dfpv" ref={rootRef}>
      {/* ===== 가로 스테이지(90° 회전) ===== */}
      <div
        className={`dfpv-stage ${light ? 'is-lit' : ''}`}
        style={{ width: `${localW}px`, height: `${localH}px` }}
      >
        {/* 카메라 영상(수중 FPV) */}
        <div className="dfpv-cam">
          <div className="dfpv-water" style={{ '--depthk': clamp((depthRef.current - 1.5) / 12, 0, 1) }} />
          <div className="dfpv-rays" aria-hidden />
          <div className="dfpv-world" ref={worldRef}>
            <div className="dfpv-floor" />
            {feats.current.map((f, i) => (
              <div
                key={i}
                className={`dfpv-feat dfpv-feat--${f.type}`}
                ref={(el) => (featEls.current[i] = el)}
              >
                <FeatureShape type={f.type} />
              </div>
            ))}
          </div>
          {/* 부유물(마린 스노우) */}
          <div className="dfpv-snow" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} style={{ '--i': i }} />
            ))}
          </div>
          {/* 수중 안개(탁도) */}
          <div className="dfpv-haze" style={{ opacity: clamp((state.turbidity - 10) / 90, 0.06, 0.4) }} />
          {/* 탐사등 라이트콘 */}
          {light && <div className="dfpv-lightcone" aria-hidden />}
          {/* 비네트 */}
          <div className="dfpv-vignette" aria-hidden />

          {/* ===== AI 탐지 박스 ===== */}
          <div className="dfpv-ai">
            {dets.map((d) => (
              <div
                key={d.id}
                className={`dfpv-box dfpv-box--${d.kind}`}
                style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, height: `${d.h}%` }}
              >
                <span className="dfpv-box__tag">
                  {d.label} <b className="num">{Math.round(d.conf * 100)}%</b>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== HUD 레이어(반투명) ===== */}
        {/* 좌상단 — 탐사 상태 + 종료 */}
        <div className="dfpv-hud dfpv-tl">
          <button className="dfpv-exit" onClick={onExit} aria-label="드론 모드 종료">
            <i className="ti ti-x" />
          </button>
          <div className="dfpv-status">
            <span className="dfpv-status__live">
              <i className="ti ti-circle-filled" /> 해저 탐사 중
            </span>
            <span className="dfpv-status__env">
              <i className={`ti ${env.icon}`} /> {env.label} · 미니 수중 드론 FPV
            </span>
          </div>
        </div>

        {/* 우상단 — 본체 상태(Auto) · 배터리 · 통신 */}
        <div className="dfpv-hud dfpv-tr">
          <span className="dfpv-chip dfpv-chip--auto">
            <i className="ti ti-robot" /> 본체 AUTO
          </span>
          <span className="dfpv-chip">
            <i className={`ti ${battery > 20 ? 'ti-battery-3' : 'ti-battery-1'}`} />
            <b className="num">{battery}%</b>
          </span>
          <span className="dfpv-chip">
            <i className={`ti ${signal > 60 ? 'ti-antenna-bars-5' : 'ti-antenna-bars-3'}`} />
            <b className="num">{signal}%</b>
          </span>
        </div>

        {/* 상단 중앙 — 실시간 텔레메트리 HUD */}
        <div className="dfpv-hud dfpv-telemetry">
          <Metric icon="ti-temperature" label="수온" value={`${hud.temp.toFixed(1)}℃`} />
          <Metric icon="ti-arrow-bar-to-down" label="수심" value={`${hud.depth.toFixed(1)}m`} />
          <Metric
            icon={deltaUp ? 'ti-trending-up' : 'ti-trending-down'}
            label="수온 변화"
            value={`${deltaUp ? '+' : ''}${hud.delta.toFixed(1)}℃`}
            tone={deltaUp ? 'up' : 'down'}
          />
          <Metric icon="ti-route" label="탐사 거리" value={distText} />
        </div>

        {/* 탐지 개수 배지 */}
        <div className="dfpv-hud dfpv-detcount">
          <i className="ti ti-viewfinder" /> 탐지 <b className="num">{dets.length}</b>건
        </div>

        {/* 크로스헤어 */}
        <div className="dfpv-cross" aria-hidden>
          <i className="ti ti-plus" />
        </div>

        {/* ===== 조종 레이어 ===== */}
        {/* 좌하단 — 이동 조이스틱 */}
        <div className="dfpv-hud dfpv-joy">
          <Joystick onMove={onJoy} />
          <span className="dfpv-ctl-label">이동</span>
        </div>

        {/* 우하단 — 카메라 방향 + 상승/하강 + 탐사등 */}
        <div className="dfpv-hud dfpv-right">
          <CameraPad onLook={(x, y) => (camRef.current = { x, y })} />
          <div className="dfpv-depth">
            <HoldBtn className="dfpv-rbtn" onHold={() => (depthDirRef.current = -1)} onRelease={() => (depthDirRef.current = 0)} label="상승">
              <i className="ti ti-chevron-up" />
            </HoldBtn>
            <HoldBtn className="dfpv-rbtn" onHold={() => (depthDirRef.current = 1)} onRelease={() => (depthDirRef.current = 0)} label="하강">
              <i className="ti ti-chevron-down" />
            </HoldBtn>
          </div>
          <button className={`dfpv-lightbtn ${light ? 'is-on' : ''}`} onClick={toggleDroneLight}>
            <i className="ti ti-bulb" /> 탐사등
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---- HUD 지표 ---- */
function Metric({ icon, label, value, tone }) {
  return (
    <div className={`dfpv-metric ${tone ? `is-${tone}` : ''}`}>
      <i className={`ti ${icon}`} />
      <span className="dfpv-metric__body">
        <em>{label}</em>
        <b className="num">{value}</b>
      </span>
    </div>
  )
}

/* ---- 가상 조이스틱(스테이지 90° 회전 보정) ---- */
function Joystick({ onMove }) {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const activeRef = useRef(false)
  const R = 42

  const setKnob = (lx, ly) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${lx}px, ${ly}px)`
  }
  const handle = (e) => {
    if (!activeRef.current) return
    const r = baseRef.current.getBoundingClientRect()
    const sdx = e.clientX - (r.left + r.width / 2)
    const sdy = e.clientY - (r.top + r.height / 2)
    let { lx, ly } = toLocal(sdx, sdy)
    const mag = Math.hypot(lx, ly)
    if (mag > R) {
      lx = (lx / mag) * R
      ly = (ly / mag) * R
    }
    setKnob(lx, ly)
    onMove(+(lx / R).toFixed(3), +(ly / R).toFixed(3))
  }
  const down = (e) => {
    activeRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    handle(e)
    if (navigator.vibrate) navigator.vibrate(6)
  }
  const up = () => {
    if (!activeRef.current) return
    activeRef.current = false
    setKnob(0, 0)
    onMove(0, 0)
  }
  return (
    <div
      className="dfpv-joybase"
      ref={baseRef}
      onPointerDown={down}
      onPointerMove={handle}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
    >
      <span className="dfpv-joyring" />
      <span className="dfpv-joyknob" ref={knobRef}>
        <i className="ti ti-arrows-move" />
      </span>
    </div>
  )
}

/* ---- 카메라 방향 4-way(누르는 동안 시야 이동) ---- */
function CameraPad({ onLook }) {
  const dirRef = useRef({ x: 0, y: 0 })
  const set = (x, y) => (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    dirRef.current = { x, y }
    onLook(x, y)
    if (navigator.vibrate) navigator.vibrate(4)
  }
  const clear = () => {
    dirRef.current = { x: 0, y: 0 }
    onLook(0, 0)
  }
  const btn = (x, y, icon, cls) => (
    <button
      className={`dfpv-campad__btn ${cls}`}
      onPointerDown={set(x, y)}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      aria-label="카메라 방향"
    >
      <i className={`ti ${icon}`} />
    </button>
  )
  return (
    <div className="dfpv-campad">
      {btn(0, -1, 'ti-chevron-up', 'is-up')}
      {btn(-1, 0, 'ti-chevron-left', 'is-left')}
      {btn(1, 0, 'ti-chevron-right', 'is-right')}
      {btn(0, 1, 'ti-chevron-down', 'is-down')}
      <span className="dfpv-campad__hub">
        <i className="ti ti-camera" />
      </span>
    </div>
  )
}

/* ---- 누르고 있는 동안 유지되는 버튼 ---- */
function HoldBtn({ children, onHold, onRelease, label, className }) {
  const down = (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    onHold()
    if (navigator.vibrate) navigator.vibrate(5)
  }
  return (
    <button
      className={className}
      onPointerDown={down}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      aria-label={label}
    >
      {children}
      <em>{label}</em>
    </button>
  )
}

/* ---- 해저 지형 슬롯 SVG (타입별 시각 구분) ---- */
function FeatureShape({ type }) {
  if (type === 'rock') {
    return (
      <svg viewBox="0 0 100 70">
        <polygon points="8,68 2,44 20,22 44,12 68,18 88,36 96,60 92,68" className="ff-rock" />
        <polygon points="44,12 68,18 60,34 40,32" className="ff-rock-hi" />
      </svg>
    )
  }
  if (type === 'weed') {
    return (
      <svg viewBox="0 0 100 90" className="ff-weed-svg">
        <path d="M30 88 C22 60 40 44 30 16" className="ff-weed" />
        <path d="M50 88 C44 54 60 40 50 6" className="ff-weed" />
        <path d="M70 88 C64 62 80 46 70 20" className="ff-weed" />
        <path d="M40 88 C36 66 50 52 44 30" className="ff-weed ff-weed--thin" />
        <path d="M60 88 C56 66 70 54 64 34" className="ff-weed ff-weed--thin" />
      </svg>
    )
  }
  if (type === 'structure') {
    return (
      <svg viewBox="0 0 100 80">
        <rect x="26" y="18" width="48" height="60" rx="3" className="ff-struct" />
        <rect x="26" y="18" width="48" height="12" className="ff-struct-top" />
        <rect x="36" y="34" width="12" height="12" className="ff-struct-win" />
        <rect x="54" y="34" width="12" height="12" className="ff-struct-win" />
        <rect x="36" y="54" width="30" height="8" className="ff-struct-win" />
      </svg>
    )
  }
  if (type === 'obstacle') {
    return (
      <svg viewBox="0 0 100 80">
        <polygon points="50,8 92,72 8,72" className="ff-obst" />
        <polygon points="50,26 78,66 22,66" className="ff-obst-in" />
        <rect x="46" y="38" width="8" height="16" className="ff-obst-mark" />
        <rect x="46" y="58" width="8" height="6" className="ff-obst-mark" />
      </svg>
    )
  }
  // sand mound(모래)
  return (
    <svg viewBox="0 0 100 44">
      <ellipse cx="50" cy="40" rx="48" ry="16" className="ff-sand" />
      <ellipse cx="38" cy="36" rx="10" ry="3" className="ff-sand-hi" />
      <ellipse cx="64" cy="38" rx="8" ry="2.5" className="ff-sand-hi" />
    </svg>
  )
}
