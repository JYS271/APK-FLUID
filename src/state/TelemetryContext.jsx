import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import { patrolPath, heatmapPoints } from '../data/mapData.js'

/* ============================================================
   ARK-FLUID 가상 텔레메트리 시뮬레이션 엔진
   ------------------------------------------------------------
   실제 로봇 연동 시: TICK 리듀서(목업 계산)를 WebSocket/MQTT
   구독으로 교체하면 컴포넌트 계층은 그대로 재사용 가능.
   ============================================================ */

const TICK_MS = 600

const initialState = {
  // 연결/통신
  connection: 'online', // online | weak | lost
  latency: 92, // ms
  signal: 88, // %

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

  // 운용
  mode: 'patrol', // patrol | manual | hold | estop
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
  let d = ((b - a + 540) % 360) - 180
  return (a + d * t + 360) % 360
}

function reducer(state, action) {
  switch (action.type) {
    case 'TICK': {
      const dt = TICK_MS / 1000

      // --- 통신두절 / E-STOP Fail-safe ---
      if (state.mode === 'estop' || state.connection === 'lost') {
        const s = { ...state }
        s.speed = Math.max(0, state.speed - 1.4 * dt) // 관성 정지
        s.thrusterL = 0
        s.thrusterR = 0
        s.missionTime = state.missionTime + dt
        // 배터리는 대기 소모만
        s.battery = clamp(state.battery - 0.02 * dt, 0, 100)
        // 통신두절이면 지연 급증
        if (state.connection === 'lost') {
          s.latency = clamp(state.latency + 60 * dt + 8, 0, 999)
          s.signal = clamp(state.signal - 10 * dt, 0, 100)
        }
        return s
      }

      const s = { ...state }
      s.missionTime = state.missionTime + dt

      // --- 지연/신호 자연 변동 (랜덤 없이 sine 기반 결정론) ---
      const t = s.missionTime
      const wobble = Math.sin(t * 0.7) * 22 + Math.sin(t * 0.23) * 14
      s.latency = clamp(84 + wobble, 40, 340)
      s.signal = clamp(90 - Math.abs(wobble) * 0.4, 45, 100)
      s.connection = s.latency > 300 ? 'weak' : 'online'

      // --- 추진 & 이동 ---
      let targetHeading = state.heading
      let thrust = 0

      if (state.mode === 'manual') {
        // 듀얼 조이스틱 differential thrust
        const l = state.thrusterL
        const r = state.thrusterR
        thrust = (l + r) / 2
        const turn = (r - l) * 42 * dt // 좌우 차이 → 선회
        targetHeading = (state.heading + turn + 360) % 360
        s.speed = clamp(Math.abs(thrust) * 3.4, 0, 3.4)
      } else if (state.mode === 'hold') {
        s.speed = Math.max(0, state.speed - 1.2 * dt)
        thrust = 0
      } else {
        // patrol: 순찰 경로 자동 추종
        const nextIdx = (state.pathIndex + dt * 0.28) % patrolPath.length
        s.pathIndex = nextIdx
        const wp = patrolPath[Math.floor(nextIdx) % patrolPath.length]
        const dx = wp.x - state.pos.x
        const dy = wp.y - state.pos.y
        targetHeading = (Math.atan2(dx, -dy) * 180) / Math.PI
        targetHeading = (targetHeading + 360) % 360
        thrust = 0.6
        s.speed = clamp(1.05 + Math.sin(t * 0.5) * 0.25, 0.6, 1.8)
      }

      // 방위 부드럽게 회전
      s.heading = angleLerp(state.heading, targetHeading, 0.18)

      // 위치 업데이트 (속도 → 정규화 좌표 이동)
      const rad = (s.heading * Math.PI) / 180
      const step = s.speed * dt * 0.9
      let nx = state.pos.x + Math.sin(rad) * step
      let ny = state.pos.y - Math.cos(rad) * step
      // 맵 경계 반사
      if (nx < 6 || nx > 94) s.heading = (360 - s.heading) % 360
      if (ny < 8 || ny > 92) s.heading = (180 - s.heading + 360) % 360
      s.pos = { x: clamp(nx, 6, 94), y: clamp(ny, 8, 92) }

      // --- 배터리 소모 (속도/추진 비례) ---
      const drain = (0.05 + Math.abs(thrust) * 0.14 + s.speed * 0.02) * dt
      s.battery = clamp(state.battery - drain, 0, 100)
      if (s.battery <= 0) {
        s.mode = 'hold'
      }

      // --- 수거함 적재 (이동 중일 때 서서히 참) ---
      if (s.speed > 0.3 && s.netLoad < 100) {
        const gain = (0.16 + s.speed * 0.05) * dt
        s.netLoad = clamp(state.netLoad + gain, 0, 100)
        // 개수 카운트 (적재율 증가에 비례)
        if (Math.floor(s.netLoad) > Math.floor(state.netLoad)) {
          s.collectedToday = state.collectedToday + Math.round(1 + s.speed)
        }
      }

      // --- 환경값 미세 변동 ---
      s.waterTemp = 21.4 + Math.sin(t * 0.12) * 0.6
      s.turbidity = clamp(32 + Math.sin(t * 0.4) * 9, 12, 60)
      s.depth = clamp(1.8 + Math.sin(t * 0.33) * 0.5, 0.8, 3.2)

      // --- 수거함 임계 경고 ---
      if (state.netLoad < 90 && s.netLoad >= 90) {
        s.toast = { id: t, kind: 'warning', text: '수거함 90% — 회수 지점으로 복귀를 권장합니다' }
      }

      return s
    }

    case 'SET_THRUSTER':
      return { ...state, thrusterL: action.l, thrusterR: action.r }

    case 'SET_MODE': {
      if (state.mode === 'estop' && action.mode !== 'estop') {
        // E-STOP 해제
        return { ...state, mode: action.mode, estopEngaged: false }
      }
      return { ...state, mode: action.mode }
    }

    case 'ESTOP':
      return {
        ...state,
        mode: 'estop',
        estopEngaged: true,
        thrusterL: 0,
        thrusterR: 0,
        toast: { id: Math.floor(state.missionTime * 100), kind: 'danger', text: '긴급 정지 발동 — 모든 추진 정지' },
      }

    case 'RESET_ESTOP':
      return { ...state, mode: 'hold', estopEngaged: false, toast: { id: state.missionTime, kind: 'success', text: '긴급 정지 해제 — 대기 모드' } }

    case 'RETURN_HOME':
      return { ...state, mode: 'patrol', toast: { id: state.missionTime, kind: 'success', text: '기지 복귀 경로로 전환' } }

    case 'DUMP_NET':
      return { ...state, netLoad: 0, toast: { id: state.missionTime, kind: 'success', text: '수거함 배출 완료' } }

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

  // 600ms 심장박동
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK' }), TICK_MS)
    return () => clearInterval(id)
  }, [])

  const setThruster = useCallback((l, r) => dispatch({ type: 'SET_THRUSTER', l, r }), [])
  const setMode = useCallback((mode) => dispatch({ type: 'SET_MODE', mode }), [])
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
    setThruster,
    setMode,
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
