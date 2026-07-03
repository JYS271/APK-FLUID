import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'
import { latencyLevel } from '../components/StatusBar.jsx'
import MarineMap from '../components/MarineMap.jsx'
import VideoFeed from '../components/VideoFeed.jsx'
import SteeringWheel from '../components/SteeringWheel.jsx'
import Throttle from '../components/Throttle.jsx'

/* 몰입형 HUD 제어 화면 — 딥네이비 레이어
   운전대(선회, 놓으면 중앙 복귀) + 세로 스로틀(추력, 위치 유지) → differential thrust
   E-STOP: 길게 눌러(600ms) 확정 */
export default function Control({ onExit }) {
  const { state, setThruster, setMode, setAutonomy, toggleAssist, estop, resetEstop } = useTelemetry()
  const lat = latencyLevel(state.latency)
  const auto = state.mode === 'patrol'
  const lowLat = state.latency <= 100

  // 스로틀 = 추력(위치 유지), 운전대 = 선회(중앙 복귀)
  const thrustRef = useRef(0)
  const turnRef = useRef(0)

  const applyThrust = useCallback(() => {
    const t = thrustRef.current
    const turn = turnRef.current
    // differential: 선회는 좌우 추력 차이로
    const l = t - turn * 0.7
    const r = t + turn * 0.7
    setThruster(Math.max(-1, Math.min(1, l)), Math.max(-1, Math.min(1, r)))
  }, [setThruster])

  useEffect(() => {
    // 제어 화면 진입 시 수동 모드
    if (state.mode !== 'estop') setMode('manual')
    return () => {
      setThruster(0, 0)
      // 나갈 때 순찰 복귀 (E-STOP 아니면)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onThrottle = useCallback(
    (thrust) => {
      thrustRef.current = thrust
      applyThrust()
    },
    [applyThrust]
  )
  const onSteer = useCallback(
    (turn) => {
      turnRef.current = turn
      applyThrust()
    },
    [applyThrust]
  )

  const estopped = state.mode === 'estop'

  const handleExit = () => {
    setThruster(0, 0)
    if (!estopped) setMode('patrol')
    onExit()
  }

  return (
    <div className={`control ${estopped ? 'control--estop' : ''}`}>
      {/* 배경: 지도 or 영상 스위처 (가로 모드 조종용 콜백 전달) */}
      <ControlBackground
        onSteer={onSteer}
        onThrottle={onThrottle}
        throttleResetKey={estopped ? 'stop' : 'run'}
      />

      {/* 상단 HUD 바 */}
      <div className="control__topbar">
        <button className="control__exit" onClick={handleExit}>
          <i className="ti ti-chevron-left" /> 모니터
        </button>
        <div className="control__hudstats num">
          <span style={{ color: lat.color }} title={lowLat ? 'WebRTC 저지연' : '지연'}>
            <i className="ti ti-activity-heartbeat" /> {Math.round(state.latency)}ms
            {!auto && lowLat && <b className="control__webrtc">RTC</b>}
          </span>
          <span><i className="ti ti-gauge" /> {state.speed.toFixed(1)}kn</span>
          <span><i className="ti ti-compass" /> {Math.round(state.heading)}°</span>
          <span><i className="ti ti-battery-3" /> {Math.round(state.battery)}%</span>
        </div>
      </div>

      {/* Auto/Manual 토글 + 어시스트 */}
      <div className="control__modebar">
        <div className="segToggle" role="tablist">
          <button
            role="tab"
            className={`segToggle__opt ${auto ? 'is-on' : ''}`}
            onClick={() => setAutonomy('auto')}
          >
            <i className="ti ti-robot" /> AUTO
          </button>
          <button
            role="tab"
            className={`segToggle__opt ${!auto ? 'is-on' : ''}`}
            onClick={() => setAutonomy('manual')}
          >
            <i className="ti ti-steering-wheel" /> MANUAL
          </button>
        </div>

        <button
          className={`assistBtn ${state.assist ? 'is-on' : ''} ${auto ? 'is-disabled' : ''}`}
          onClick={() => !auto && toggleAssist()}
          disabled={auto}
          title="정밀 정렬 어시스트"
        >
          <i className="ti ti-focus-2" />
          어시스트{state.assist ? ' ON' : ''}
        </button>
      </div>


      {laggyBanner(state.latency)}

      {/* AI 자율항법 주행 안내 */}
      {auto && (
        <div className="control__autonote">
          <i className="ti ti-robot" /> AI 자율항법 주행 중 — 장애물 자동 회피 · 경로 자동 추종
        </div>
      )}

      {/* 조작 어시스트 정렬 리티클 */}
      {!auto && state.assist && (
        <div className={`assistReticle ${state.assistTarget ? 'has-target' : ''} ${state.assistAligned ? 'is-aligned' : ''}`}>
          <div className="assistReticle__ring">
            <i className="ti ti-plus" />
          </div>
          <span className="assistReticle__label num">
            {state.assistTarget
              ? state.assistAligned
                ? '정렬 완료 · 수거 진입'
                : `정렬 보정 ${Math.abs(Math.round(state.assistErr))}°`
              : '표적 탐색 중…'}
          </span>
        </div>
      )}

      {/* 하단 컨트롤 독 — 운전대(선회) · E-STOP · 스로틀(추력) */}
      <div className={`control__dock ${auto ? 'is-locked' : ''}`}>
        <SteeringWheel label="운전대" onChange={onSteer} />

        <div className="control__center">
          <EStopButton onEngage={estop} engaged={estopped} onReset={resetEstop} />
          <div className="control__load num">
            <i className="ti ti-basket" /> {Math.round(state.netLoad)}%
          </div>
        </div>

        <Throttle label="스로틀" onChange={onThrottle} resetKey={estopped ? 'stop' : 'run'} />
      </div>

      {/* E-STOP 레드 오버레이 */}
      {estopped && (
        <div className="control__estop-overlay">
          <i className="ti ti-hand-stop" />
          <b>긴급 정지</b>
          <p>모든 추진이 정지되었습니다</p>
          <button className="control__estop-reset" onClick={resetEstop}>
            <i className="ti ti-rotate" /> 해제하고 대기
          </button>
        </div>
      )}
    </div>
  )
}

/* 수심 제어 — 상승(수면 위로)/하강(수면 아래로) 눌러서 유지.
   자체 telemetry 구독으로 수심 표시(레이어 리렌더 격리). */
function DepthControls() {
  const { state, setVertical } = useTelemetry()
  const start = (dir) => (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    setVertical(dir)
    if (navigator.vibrate) navigator.vibrate(8)
  }
  const stop = () => setVertical(0)
  const atSurface = state.depth <= 0.15

  return (
    <div className="landdepth">
      <button
        className="landdepth__btn"
        onPointerDown={start(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        disabled={atSurface}
        aria-label="수면 위로 상승"
      >
        <i className="ti ti-chevron-up" />
        상승
      </button>
      <span className="landdepth__val num">
        <i className="ti ti-arrow-bar-to-down" />
        {atSurface ? '수면' : `${state.depth.toFixed(1)}m`}
      </span>
      <button
        className="landdepth__btn"
        onPointerDown={start(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        aria-label="수면 아래로 하강"
      >
        <i className="ti ti-chevron-down" />
        하강
      </button>
    </div>
  )
}

/* 미니 수중 드론 조종 — 전개/복귀 · 방향 패드(눌러서 이동) · 탐사등 */
function DroneControls() {
  const { state, toggleDrone, setDroneMove, toggleDroneLight } = useTelemetry()
  const dep = state.drone.deployed
  const hold = (x, y) => (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    setDroneMove(x, y)
    if (navigator.vibrate) navigator.vibrate(5)
  }
  const release = () => setDroneMove(0, 0)
  const padBtn = (x, y, icon, extra) => (
    <button
      className={`dpad__btn ${extra}`}
      onPointerDown={hold(x, y)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      aria-label="드론 이동"
    >
      <i className={`ti ${icon}`} />
    </button>
  )

  return (
    <div className="dronectl">
      <button className={`dronectl__deploy ${dep ? 'is-on' : ''}`} onClick={toggleDrone}>
        <i className="ti ti-drone" />
        {dep ? '드론 복귀' : '드론 전개'}
      </button>
      {dep && (
        <>
          <div className="dpad">
            {padBtn(0, -1, 'ti-chevron-up', 'dpad__up')}
            {padBtn(-1, 0, 'ti-chevron-left', 'dpad__left')}
            {padBtn(1, 0, 'ti-chevron-right', 'dpad__right')}
            {padBtn(0, 1, 'ti-chevron-down', 'dpad__down')}
            <span className="dpad__hub">
              <i className="ti ti-drone" />
            </span>
          </div>
          <button className={`dronectl__light ${state.drone.light ? 'is-on' : ''}`} onClick={toggleDroneLight}>
            <i className="ti ti-bulb" />
            탐사등
          </button>
        </>
      )}
    </div>
  )
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.5

// 드래그 팬 이동 한계(px) — scale(1.2) 헤드룸 안에서 이동
const PAN_MAX_X = 42
const PAN_MAX_Y = 78
const clampPan = (v, m) => Math.max(-m, Math.min(m, v))

function ControlBackground({ onSteer, onThrottle, throttleResetKey }) {
  const [mode, setMode] = useState('map') // map | video
  const [zoom, setZoom] = useState(0.5)
  const [thermal, setThermal] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const panStart = useRef(null)
  // 가로(landscape) 전체 3D 지형 보기
  const [landscape, setLandscape] = useState(false)
  const landRef = useRef(null)
  const [landDims, setLandDims] = useState({ w: 0, h: 0 })

  // 오버레이 크기를 측정해 90° 회전 스테이지를 화면에 꽉 채움(가로)
  useLayoutEffect(() => {
    if (!landscape) return
    const measure = () => {
      const el = landRef.current
      if (el) setLandDims({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [landscape])

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)))
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)))
  const resetZoom = () => setZoom(0.5)

  // 열화상: 영상 모드로 전환하며 토글 (지도에는 열화상 미적용)
  const toggleThermal = () => {
    setMode('video')
    setThermal((v) => !v)
    if (navigator.vibrate) navigator.vibrate(10)
  }

  // 드래그로 화면 이동, 놓으면 중앙 복귀
  const onPanDown = (e) => {
    panStart.current = { x: e.clientX, y: e.clientY }
    setPanning(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }
  const onPanMove = (e) => {
    if (!panStart.current) return
    setPan({
      x: clampPan(e.clientX - panStart.current.x, PAN_MAX_X),
      y: clampPan(e.clientY - panStart.current.y, PAN_MAX_Y),
    })
  }
  const onPanEnd = () => {
    if (!panStart.current) return
    panStart.current = null
    setPanning(false)
    setPan({ x: 0, y: 0 }) // 중앙 복귀
  }

  return (
    <div className="control__bg">
      <div
        className={`control__pan ${panning ? 'is-panning' : ''}`}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(1.2)` }}
        onPointerDown={onPanDown}
        onPointerMove={onPanMove}
        onPointerUp={onPanEnd}
        onPointerLeave={onPanEnd}
        onPointerCancel={onPanEnd}
      >
        {mode === 'map' ? (
          // 지도: viewBox 배율 → 줌 아웃 시 바다가 그만큼 넓게 보임
          <div className="control__bg-map">
            <MarineMap compact zoom={zoom} />
          </div>
        ) : (
          // 영상/열화상: 장면은 꽉 채우고 탐지 객체만 배율 → 0.5배 시 더 넓게
          <VideoFeed compact thermal={thermal} showChips={false} zoom={zoom} />
        )}
      </div>

      {/* 소스 전환 */}
      <div className="control__bg-switch">
        <button className={mode === 'map' ? 'is-on' : ''} onClick={() => setMode('map')} aria-label="지도">
          <i className="ti ti-map" />
        </button>
        <button className={mode === 'video' ? 'is-on' : ''} onClick={() => setMode('video')} aria-label="영상">
          <i className="ti ti-video" />
        </button>
        <button
          className={mode === 'video' && thermal ? 'is-on' : ''}
          onClick={toggleThermal}
          aria-label="열화상"
          title={thermal ? '열화상' : 'RGB'}
        >
          <i className="ti ti-flame" />
        </button>
      </div>

      {/* 가로 전환 — 영상 모드에서 전체 3D 지형 파노라마 */}
      {mode === 'video' && (
        <button
          className="control__land-btn"
          onClick={() => setLandscape(true)}
          aria-label="가로 전체 지형 보기"
          title="가로로 전환 · 전체 3D 지형"
        >
          <i className="ti ti-device-mobile-rotated" />
        </button>
      )}

      {/* 가로(landscape) 전체 3D 지형 오버레이 — 스테이지를 90° 회전해 파노라마로 */}
      {landscape && (
        <div className="control__land" ref={landRef}>
          <div
            className="control__land-stage"
            style={{ width: `${landDims.h}px`, height: `${landDims.w}px` }}
          >
            <VideoFeed compact thermal={thermal} showChips={false} zoom={zoom} />
          </div>

          {/* 가로에서도 조종 — 스테이지와 동일하게 90° 회전한 컨트롤 레이어 */}
          <div
            className="control__land-controls"
            style={{ width: `${landDims.h}px`, height: `${landDims.w}px` }}
          >
            <div className="control__land-steer">
              <SteeringWheel label="운전대" onChange={onSteer} />
            </div>
            <div className="control__land-throttle">
              <Throttle label="스로틀" onChange={onThrottle} resetKey={throttleResetKey} axis="x" />
            </div>
            {/* 상승/하강(수심) — 하단 중앙 */}
            <div className="control__land-depth">
              <DepthControls />
            </div>
            {/* 미니 수중 드론 조종 — 좌상단 */}
            <div className="control__land-drone">
              <DroneControls />
            </div>
            <div className="control__land-hint">
              <i className="ti ti-rotate-clockwise" /> 기기를 가로로 돌려 조종하세요
            </div>
          </div>

          {/* 항상 눌러 나갈 수 있는 닫기(세로 프레임 기준) — 나갈 때 중립으로 */}
          <button
            className="control__land-close"
            onClick={() => {
              onThrottle?.(0)
              onSteer?.(0)
              setLandscape(false)
            }}
          >
            <i className="ti ti-x" /> 세로
          </button>
        </div>
      )}

      {/* 줌 컨트롤 */}
      <div className="control__zoom">
        <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="줌 인">
          <i className="ti ti-plus" />
        </button>
        <button className="control__zoom-level num" onClick={resetZoom} title="줌 리셋">
          {zoom.toFixed(1)}×
        </button>
        <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="줌 아웃">
          <i className="ti ti-minus" />
        </button>
      </div>
    </div>
  )
}

function laggyBanner(latency) {
  if (latency <= 300) return null
  return (
    <div className="control__lag">
      <i className="ti ti-alert-triangle" /> 지연 {Math.round(latency)}ms — 제어 반응 지연 가능
    </div>
  )
}

/* 길게 눌러(600ms) 확정하는 E-STOP */
function EStopButton({ onEngage, engaged, onReset }) {
  const [prog, setProg] = useState(0)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const HOLD = 600

  const tick = useCallback(
    (now) => {
      const elapsed = now - startRef.current
      const p = Math.min(1, elapsed / HOLD)
      setProg(p)
      if (p >= 1) {
        onEngage()
        cancelAnimationFrame(rafRef.current)
        setProg(0)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [onEngage]
  )

  const begin = (e) => {
    e.preventDefault()
    if (engaged) return
    startRef.current = performance.now()
    if (navigator.vibrate) navigator.vibrate(20)
    rafRef.current = requestAnimationFrame(tick)
  }
  const cancel = () => {
    cancelAnimationFrame(rafRef.current)
    setProg(0)
  }

  if (engaged) {
    return (
      <button className="estop estop--reset" onClick={onReset}>
        <i className="ti ti-rotate" />
        해제
      </button>
    )
  }

  return (
    <button
      className="estop"
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      style={{ '--prog': prog }}
    >
      <svg className="estop__ring" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" className="estop__track" />
        <circle
          cx="50"
          cy="50"
          r="46"
          className="estop__fill"
          strokeDasharray={2 * Math.PI * 46}
          strokeDashoffset={2 * Math.PI * 46 * (1 - prog)}
        />
      </svg>
      <span className="estop__inner">
        <i className="ti ti-hand-stop" />
        <b>E-STOP</b>
        <em>{prog > 0 ? '길게…' : '600ms'}</em>
      </span>
    </button>
  )
}
