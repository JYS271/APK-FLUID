import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import { patrolPath, heatmapPoints, obstacles, homeBase } from '../data/mapData.js'

/* ============================================================
   ARK-FLUID 가상 텔레메트리 시뮬레이션 엔진
   ------------------------------------------------------------
   설계 철학: "엣지 컴퓨팅" — 로봇 온보드에서 연산(OA, 객체탐지,
   경로계획)을 처리했다고 가정하고, 이 리듀서가 그 결과값을 산출한다.
   앱(컴포넌트)은 결과 시각화에만 집중한다.

   실제 로봇 연동 시: TICK 리듀서를 WebSocket/MQTT 구독으로 교체하면
   컴포넌트 계층은 그대로 재사용 가능.
   ============================================================ */

const TICK_MS = 600
const SENSOR_RANGE = 20 // LiDAR/소나 감지 반경(정규화)
const BATTERY_DRAIN_PER_S = 1 / (10 * 60) // 배터리 소모 고정: 10분당 1%

const initialState = {
  // 연결/통신
  connection: 'online', // online | weak | lost
  latency: 92, // ms
  signal: 88, // %
  ts: 0, // 공통 타임스탬프(epoch ms) — pos·env 동기화 증빙

  // 동력
  battery: 78.4, // %
  charging: false,

  // 수거함(네트 모듈)
  netLoad: 41.2, // %
  netCapacityKg: 60,

  // 운동 상태
  speed: 1.2, // knot
  heading: 68, // deg (0=N)
  pos: { x: 34, y: 58 }, // 지도 정규화 좌표 0~100
  depth: 1.8, // m

  // 추진(듀얼: 좌/우 날개 differential thrust)
  thrusterL: 0,
  thrusterR: 0,

  // 환경
  waterTemp: 21.4, // ℃
  turbidity: 32, // NTU
  current: { speed: 0.6, dir: 210 }, // 조류: knot / deg

  // AI 자율항법
  mode: 'patrol', // patrol(auto) | manual | hold | estop
  returning: false, // 수거함 배출 위해 기지 자동 복귀 중
  avoiding: false, // OA 회피 기동 중
  nearObstacle: null, // { x, y, r, dist } 감지된 최근접 장애물
  assist: false, // 조작 어시스트(정밀 정렬)
  assistTarget: null, // { x, y } 정렬 목표
  assistErr: 0, // 정렬 오차(deg)
  assistAligned: false, // 정렬 완료

  // 객체 탐지(온보드 추론 결과) — 카메라 프레임 정규화 0~1
  dehaze: true, // 디헤이징 파이프라인 on/off
  detections: [],

  // 운용
  missionTime: 0, // s
  collectedToday: 128, // 개
  pathIndex: 0, // 순찰 경로 진행 인덱스(부동)

  // UI
  toast: null,
  estopEngaged: false,
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// 두 각도 사이 최소 회전량
function angleLerp(a, b, t) {
  const d = ((b - a + 540) % 360) - 180
  return (a + d * t + 360) % 360
}

// 헤딩 기준 목표 상대 방위(-180~180)
function relBearing(pos, heading, target) {
  const dx = target.x - pos.x
  const dy = target.y - pos.y
  const abs = (Math.atan2(dx, -dy) * 180) / Math.PI
  return ((abs - heading + 540) % 360) - 180
}

/* 장애물 회피(OA): 소나/LiDAR 데이터 → 곡선형 우회 기동
   전방(±75°) 근접 장애물을 향한 반대 방향으로 조향각 산출 */
function computeAvoidance(pos, heading) {
  let avoiding = false
  let steer = 0
  let nearest = null
  let best = Infinity
  for (const o of obstacles) {
    const dx = o.x - pos.x
    const dy = o.y - pos.y
    const dist = Math.hypot(dx, dy) - o.r
    if (dist > SENSOR_RANGE) continue
    if (dist < best) {
      best = dist
      nearest = { x: o.x, y: o.y, r: o.r, dist: Math.max(0, dist) }
    }
    const bearing = relBearing(pos, heading, o)
    if (Math.abs(bearing) < 75 && dist < 12) {
      avoiding = true
      const urgency = clamp(1 - dist / 12, 0, 1)
      // 장애물 반대편으로 곡선 우회 (가까울수록 크게)
      steer += (bearing >= 0 ? -1 : 1) * (24 + urgency * 40)
    }
  }
  return { avoiding, steer: clamp(steer, -72, 72), nearest }
}

// 전방에서 가장 가까운 표적(히트맵) — 어시스트 정렬용
function nearestTargetAhead(pos, heading) {
  let best = null
  let bestScore = Infinity
  for (const p of heatmapPoints) {
    const dx = p.x - pos.x
    const dy = p.y - pos.y
    const dist = Math.hypot(dx, dy)
    if (dist > 30) continue
    const bearing = relBearing(pos, heading, p)
    if (Math.abs(bearing) > 80) continue
    const score = dist + Math.abs(bearing) * 0.3
    if (score < bestScore) {
      bestScore = score
      best = { point: { x: p.x, y: p.y }, dist, bearing }
    }
  }
  return best
}

/* 수중 객체 탐지 시뮬레이션(온보드 추론 결과)
   탁도↑ → 신뢰도↓. 카메라 프레임 정규화 좌표(0~1) 반환. */
function computeDetections(t, turbidity, dehaze) {
  // 디헤이징 적용 시 탁도 영향 완화
  const effTurb = dehaze ? turbidity * 0.55 : turbidity
  const vis = clamp(1 - (effTurb - 18) / 60, 0.35, 1)
  // kind: 형태 렌더용 (bottle=페트병 / can=캔 / glass=유리병 / cup=종이컵)
  const defs = [
    { id: 'd1', label: '페트병', kind: 'bottle', bx: 0.09, by: 0.1, w: 0.26, h: 0.28, fx: 0.03, fy: 0.025, base: 0.95 },
    { id: 'd2', label: '캔', kind: 'can', bx: 0.56, by: 0.12, w: 0.26, h: 0.28, fx: 0.03, fy: 0.03, base: 0.91 },
    { id: 'd3', label: '유리병', kind: 'glass', bx: 0.09, by: 0.52, w: 0.26, h: 0.3, fx: 0.03, fy: 0.02, base: 0.88 },
    { id: 'd4', label: '종이컵', kind: 'cup', bx: 0.56, by: 0.52, w: 0.26, h: 0.28, fx: 0.03, fy: 0.025, base: 0.83 },
  ]
  return defs
    .map((d, i) => ({
      id: d.id,
      label: d.label,
      kind: d.kind,
      x: clamp(d.bx + Math.sin(t * 0.5 + i) * d.fx, 0.02, 0.78),
      y: clamp(d.by + Math.cos(t * 0.4 + i) * d.fy, 0.04, 0.7),
      w: d.w,
      h: d.h,
      conf: +clamp(d.base * vis + Math.sin(t * 1.3 + i) * 0.03, 0.3, 0.99).toFixed(2),
    }))
    .filter((d) => d.conf > 0.45)
}

function reducer(state, action) {
  switch (action.type) {
    case 'TICK': {
      const dt = TICK_MS / 1000
      const now = action.now || state.ts

      // --- 통신두절 / E-STOP Fail-safe ---
      if (state.mode === 'estop' || state.connection === 'lost') {
        const s = { ...state }
        s.speed = Math.max(0, state.speed - 1.4 * dt) // 관성 정지
        s.thrusterL = 0
        s.thrusterR = 0
        s.avoiding = false
        s.missionTime = state.missionTime + dt
        s.ts = now
        s.battery = clamp(state.battery - BATTERY_DRAIN_PER_S * dt, 0, 100)
        if (state.connection === 'lost') {
          s.latency = clamp(state.latency + 60 * dt + 8, 0, 999)
          s.signal = clamp(state.signal - 10 * dt, 0, 100)
        }
        return s
      }

      const s = { ...state }
      s.missionTime = state.missionTime + dt
      s.ts = now
      const t = s.missionTime

      // --- 지연/신호 ---
      const wobble = Math.sin(t * 0.7) * 22 + Math.sin(t * 0.23) * 14
      if (state.mode === 'manual') {
        // 수동: WebRTC 저지연 경로 (<100ms 목표)
        s.latency = clamp(64 + Math.sin(t * 1.1) * 22, 38, 108)
      } else {
        s.latency = clamp(84 + wobble, 40, 340)
      }
      s.signal = clamp(90 - Math.abs(wobble) * 0.4, 45, 100)
      s.connection = s.latency > 300 ? 'weak' : 'online'

      // --- 추진 & 이동 (모드별 목표 방위) ---
      let targetHeading = state.heading
      let thrust = 0
      let moveSign = 1 // +1 전진 / -1 후진

      if (state.mode === 'manual') {
        const l = state.thrusterL
        const r = state.thrusterR
        thrust = (l + r) / 2
        const turn = (r - l) * 42 * dt
        targetHeading = (state.heading + turn + 360) % 360
        s.speed = clamp(Math.abs(thrust) * 3.4, 0, 3.4)
        moveSign = thrust < 0 ? -1 : 1 // 스로틀 후진 시 뒤로 이동
      } else if (state.mode === 'hold') {
        s.speed = Math.max(0, state.speed - 1.2 * dt)
        thrust = 0
      } else if (state.returning) {
        // 기지 자동 복귀(배출) — homeBase로 직진
        targetHeading = (relBearing(state.pos, 0, homeBase) + 360) % 360
        thrust = 0.72
        s.speed = clamp(1.5 + Math.sin(t * 0.5) * 0.2, 0.6, 1.9)
      } else {
        // patrol(auto): 순찰 경로 자동 추종
        const nextIdx = (state.pathIndex + dt * 0.28) % patrolPath.length
        s.pathIndex = nextIdx
        const wp = patrolPath[Math.floor(nextIdx) % patrolPath.length]
        targetHeading = (relBearing({ x: state.pos.x, y: state.pos.y }, 0, wp) + 360) % 360
        thrust = 0.6
        s.speed = clamp(1.05 + Math.sin(t * 0.5) * 0.25, 0.6, 1.8)
      }

      // --- 조작 어시스트: 정밀 정렬 (수동 + assist) ---
      if (state.mode === 'manual' && state.assist) {
        const tgt = nearestTargetAhead(s.pos, s.heading)
        if (tgt) {
          s.assistTarget = tgt.point
          s.assistErr = +tgt.bearing.toFixed(1)
          s.assistAligned = Math.abs(tgt.bearing) < 10 && tgt.dist < 22
          // 정렬 보정: heading을 목표 쪽으로 소폭 당김
          targetHeading = (targetHeading + clamp(tgt.bearing, -18, 18) * 0.4 + 360) % 360
        } else {
          s.assistTarget = null
          s.assistAligned = false
          s.assistErr = 0
        }
      } else {
        s.assistTarget = null
        s.assistAligned = false
        s.assistErr = 0
      }

      // --- 장애물 회피(OA): 곡선형 우회 기동 ---
      const oa = computeAvoidance(s.pos, s.heading)
      s.avoiding = oa.avoiding
      s.nearObstacle = oa.nearest
      if (oa.avoiding && state.mode !== 'hold') {
        targetHeading = (targetHeading + oa.steer + 360) % 360
        thrust = Math.min(thrust, 0.45) // 감속
        s.speed = Math.min(s.speed, 1.1)
      }

      // 방위 부드럽게 회전 (회피 중엔 더 민첩하게)
      s.heading = angleLerp(state.heading, targetHeading, oa.avoiding ? 0.32 : 0.18)

      // 위치 업데이트 (속도 → 정규화 좌표) + 조류 드리프트
      const rad = (s.heading * Math.PI) / 180
      const step = s.speed * dt * 0.9 * moveSign // 부호: 후진 시 뒤로
      const cRad = (state.current.dir * Math.PI) / 180
      const drift = state.current.speed * dt * 0.12
      let nx = state.pos.x + Math.sin(rad) * step + Math.sin(cRad) * drift
      let ny = state.pos.y - Math.cos(rad) * step - Math.cos(cRad) * drift
      if (nx < 6 || nx > 94) s.heading = (360 - s.heading) % 360
      if (ny < 8 || ny > 92) s.heading = (180 - s.heading + 360) % 360
      s.pos = { x: clamp(nx, 6, 94), y: clamp(ny, 8, 92) }

      // --- 배터리 소모 (10분당 1% 고정) ---
      s.battery = clamp(state.battery - BATTERY_DRAIN_PER_S * dt, 0, 100)
      if (s.battery <= 0) s.mode = 'hold'

      // --- 배터리 30% 미만 → 기지 자동 복귀 알람 (최초 1회) ---
      if (state.battery > 30 && s.battery <= 30 && !state.returning) {
        s.returning = true
        s.toast = { id: t, kind: 'warning', text: '배터리 30% 미만 — 배터리 부족으로 기지 복귀' }
      }

      // --- 수거함 적재 (복귀 중엔 수거 중단) ---
      if (s.speed > 0.3 && s.netLoad < 100 && !state.returning) {
        const gain = (0.16 + s.speed * 0.05) * dt
        s.netLoad = clamp(state.netLoad + gain, 0, 100)
        if (Math.floor(s.netLoad) > Math.floor(state.netLoad)) {
          s.collectedToday = state.collectedToday + Math.round(1 + s.speed)
        }
      }

      // --- 수거함 50kg → 가득 차기 전 기지 자동 복귀 알람 (최초 1회) ---
      if (!state.returning && (s.netLoad / 100) * s.netCapacityKg >= 50) {
        s.returning = true
        s.toast = { id: t, kind: 'warning', text: '수거함 50kg — 가득 차기 전 기지로 자동 복귀' }
      }

      // --- 기지 도킹 시 자동 배출 ---
      if (s.returning) {
        const dHome = Math.hypot(s.pos.x - homeBase.x, s.pos.y - homeBase.y)
        if (dHome < 3) {
          s.netLoad = 0
          s.returning = false
          s.toast = { id: t, kind: 'success', text: '기지 도킹 · 수거함 자동 배출 완료' }
        }
      }

      // --- 환경값(동일 타임스탬프 s.ts로 동기화) ---
      s.waterTemp = 21.4 + Math.sin(t * 0.12) * 0.6
      s.turbidity = clamp(32 + Math.sin(t * 0.4) * 9, 12, 60)
      s.depth = clamp(1.8 + Math.sin(t * 0.33) * 0.5, 0.8, 3.2)
      s.current = {
        speed: +(0.55 + Math.sin(t * 0.18) * 0.3).toFixed(2),
        dir: Math.round((205 + Math.sin(t * 0.09) * 35 + 360) % 360),
      }

      // --- 객체 탐지(온보드 추론) ---
      s.detections = computeDetections(t, s.turbidity, s.dehaze)

      // --- 임계 경고 ---
      if (state.netLoad < 90 && s.netLoad >= 90) {
        s.toast = { id: t, kind: 'warning', text: '수거함 90% — 회수 지점으로 복귀를 권장합니다' }
      }

      return s
    }

    case 'SET_THRUSTER':
      return { ...state, thrusterL: action.l, thrusterR: action.r }

    case 'SET_MODE': {
      if (state.mode === 'estop' && action.mode !== 'estop') {
        return { ...state, mode: action.mode, estopEngaged: false }
      }
      return { ...state, mode: action.mode }
    }

    case 'SET_AUTONOMY': {
      // auto → patrol(자율항법), manual → 수동
      const mode = action.value === 'auto' ? 'patrol' : 'manual'
      return {
        ...state,
        mode,
        thrusterL: 0,
        thrusterR: 0,
        toast: {
          id: state.missionTime,
          kind: 'info',
          text: mode === 'patrol' ? '자동 주행(AI 자율항법) 전환' : '수동 조종 전환 · WebRTC 저지연',
        },
      }
    }

    case 'TOGGLE_ASSIST':
      return {
        ...state,
        assist: !state.assist,
        toast: {
          id: state.missionTime,
          kind: 'info',
          text: !state.assist ? '조작 어시스트 ON — 정밀 정렬 보조' : '조작 어시스트 OFF',
        },
      }

    case 'TOGGLE_DEHAZE':
      return { ...state, dehaze: !state.dehaze }

    case 'ESTOP':
      return {
        ...state,
        mode: 'estop',
        estopEngaged: true,
        thrusterL: 0,
        thrusterR: 0,
        avoiding: false,
        toast: { id: Math.floor(state.missionTime * 100), kind: 'danger', text: '긴급 정지 발동 — 모든 추진 정지' },
      }

    case 'RESET_ESTOP':
      return { ...state, mode: 'hold', estopEngaged: false, toast: { id: state.missionTime, kind: 'success', text: '긴급 정지 해제 — 대기 모드' } }

    case 'RETURN_HOME':
      return { ...state, mode: 'patrol', returning: true, toast: { id: state.missionTime, kind: 'success', text: '기지 복귀 경로로 전환' } }

    case 'DUMP_NET':
      return { ...state, netLoad: 0, returning: false, toast: { id: state.missionTime, kind: 'success', text: '수거함 배출 완료' } }

    case 'SET_CONNECTION':
      return { ...state, connection: action.value }

    case 'TOAST':
      return { ...state, toast: { id: (state.toast?.id || 0) + 1, kind: action.kind || 'info', text: action.text } }

    case 'CLEAR_TOAST':
      return { ...state, toast: null }

    default:
      return state
  }
}

const TelemetryContext = createContext(null)

export function TelemetryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  // 600ms 심장박동 (now 타임스탬프 주입 → 동기화 증빙)
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), TICK_MS)
    return () => clearInterval(id)
  }, [])

  const setThruster = useCallback((l, r) => dispatch({ type: 'SET_THRUSTER', l, r }), [])
  const setMode = useCallback((mode) => dispatch({ type: 'SET_MODE', mode }), [])
  const setAutonomy = useCallback((value) => dispatch({ type: 'SET_AUTONOMY', value }), [])
  const toggleAssist = useCallback(() => {
    dispatch({ type: 'TOGGLE_ASSIST' })
    if (navigator.vibrate) navigator.vibrate(10)
  }, [])
  const toggleDehaze = useCallback(() => dispatch({ type: 'TOGGLE_DEHAZE' }), [])
  const estop = useCallback(() => {
    dispatch({ type: 'ESTOP' })
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160])
  }, [])
  const resetEstop = useCallback(() => dispatch({ type: 'RESET_ESTOP' }), [])
  const returnHome = useCallback(() => dispatch({ type: 'RETURN_HOME' }), [])
  const dumpNet = useCallback(() => dispatch({ type: 'DUMP_NET' }), [])
  const toast = useCallback((text, kind) => dispatch({ type: 'TOAST', text, kind }), [])
  const clearToast = useCallback(() => dispatch({ type: 'CLEAR_TOAST' }), [])
  const setConnection = useCallback((value) => dispatch({ type: 'SET_CONNECTION', value }), [])

  const value = {
    state,
    stateRef,
    gps: state.pos,
    heatmap: heatmapPoints,
    path: patrolPath,
    obstacles,
    setThruster,
    setMode,
    setAutonomy,
    toggleAssist,
    toggleDehaze,
    estop,
    resetEstop,
    returnHome,
    dumpNet,
    toast,
    clearToast,
    setConnection,
  }

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext)
  if (!ctx) throw new Error('useTelemetry must be used within TelemetryProvider')
  return ctx
}
