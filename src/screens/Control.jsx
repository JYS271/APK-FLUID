import { useRef, useState, useCallback, useEffect } from 'react'
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
  const { state, setThruster, setMode, estop, resetEstop } = useTelemetry()
  const lat = latencyLevel(state.latency)

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
      {/* 배경: 지도 or 영상 스위처 */}
      <ControlBackground />

      {/* 상단 HUD 바 */}
      <div className="control__topbar">
        <button className="control__exit" onClick={handleExit}>
          <i className="ti ti-chevron-left" /> 모니터
        </button>
        <div className="control__hudstats num">
          <span style={{ color: lat.color }}>
            <i className="ti ti-activity-heartbeat" /> {Math.round(state.latency)}ms
          </span>
          <span><i className="ti ti-gauge" /> {state.speed.toFixed(1)}kn</span>
          <span><i className="ti ti-compass" /> {Math.round(state.heading)}°</span>
          <span><i className="ti ti-battery-3" /> {Math.round(state.battery)}%</span>
        </div>
      </div>

      {laggyBanner(state.latency)}

      {/* 하단 컨트롤 독 — 운전대(선회) · E-STOP · 스로틀(추력) */}
      <div className="control__dock">
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

function ControlBackground() {
  const [mode, setMode] = useState('map') // map | video
  return (
    <div className="control__bg">
      {mode === 'map' ? (
        <div className="control__bg-map">
          <MarineMap compact />
        </div>
      ) : (
        <VideoFeed compact />
      )}
      <div className="control__bg-switch">
        <button className={mode === 'map' ? 'is-on' : ''} onClick={() => setMode('map')}>
          <i className="ti ti-map" />
        </button>
        <button className={mode === 'video' ? 'is-on' : ''} onClick={() => setMode('video')}>
          <i className="ti ti-video" />
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
