import { useEffect, useRef, useState } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 경보(알람) 센터 — 상태에서 활성 경보를 도출해 상단에 스택으로 표시.
   대상: 배터리 부족/위험 · 수거함 가득참 임박 · 전방 장애물(이상) 감지 · 통신 이상 · 긴급 정지.
   새 경보 발생 시 진동 + (중대 경보는) 경고음. 조건 해제 시 자동 사라짐. */

// 경고음(WebAudio) — 짧은 톤. 사용자 상호작용 이후에만 소리남(정책상 무음일 수 있음)
let _actx
function beep(sev) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    _actx = _actx || new AC()
    if (_actx.state === 'suspended') _actx.resume()
    const o = _actx.createOscillator()
    const g = _actx.createGain()
    o.connect(g)
    g.connect(_actx.destination)
    o.type = 'sine'
    o.frequency.value = sev === 'critical' ? 880 : 640
    const n = _actx.currentTime
    g.gain.setValueAtTime(0.0001, n)
    g.gain.exponentialRampToValueAtTime(0.07, n + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, n + 0.22)
    o.start(n)
    o.stop(n + 0.24)
  } catch {
    /* 무음 처리 */
  }
}

const SEV_ORDER = { critical: 0, warning: 1, info: 2 }
const AUTO_HIDE = 5 // 경보 표시 후 5초 지나면 자동으로 사라짐(초)

export default function AlarmCenter() {
  const { state } = useTelemetry()
  const [dismissed, setDismissed] = useState({})
  const seenRef = useRef(new Set())
  const firstSeenRef = useRef({}) // key -> 최초 표시 시각(missionTime)
  // 전방 장애물 경보는 짧게 유지(회피 기동 중 깜빡임 방지)
  const holdRef = useRef(-1e9)
  if (state.avoiding) holdRef.current = state.missionTime
  const obstacleActive = state.avoiding || state.missionTime - holdRef.current < 2.5

  const alarms = []
  if (state.mode === 'estop') {
    alarms.push({ key: 'estop', sev: 'critical', icon: 'ti-hand-stop', title: '긴급 정지 발동', desc: '모든 추진 정지됨' })
  }
  if (state.connection === 'lost') {
    alarms.push({ key: 'comm', sev: 'critical', icon: 'ti-wifi-off', title: '통신 두절 경보', desc: '페일세이프 정지 중' })
  } else if (state.connection === 'weak') {
    alarms.push({ key: 'comm-weak', sev: 'warning', icon: 'ti-antenna-bars-2', title: '통신 지연 경보', desc: `지연 ${Math.round(state.latency)}ms · 제어 반응 지연 가능` })
  }
  if (state.battery <= 12) {
    alarms.push({ key: 'batt', sev: 'critical', icon: 'ti-battery-1', title: '배터리 위험', desc: `${Math.round(state.battery)}% · 즉시 기지 복귀 필요` })
  } else if (state.battery <= 30) {
    alarms.push({ key: 'batt', sev: 'warning', icon: 'ti-battery-2', title: '배터리 부족 경보', desc: `${Math.round(state.battery)}% · 기지 자동 복귀` })
  }
  const netKg = (state.netLoad / 100) * state.netCapacityKg
  if (netKg >= 44) {
    alarms.push({ key: 'net', sev: 'warning', icon: 'ti-basket', title: '수거함 가득참 임박', desc: `${Math.round(netKg)}kg / 50kg · 곧 자동 복귀` })
  }
  if (obstacleActive) {
    const d = state.nearObstacle ? ` · 근접 ${Math.round(state.nearObstacle.dist)}` : ''
    alarms.push({ key: 'obstacle', sev: 'warning', icon: 'ti-alert-triangle', title: '전방 이상 감지', desc: `장애물 감지 · 자동 회피 기동${d}` })
  }

  const keySig = alarms.map((a) => a.key).join('|')

  useEffect(() => {
    const cur = new Set(alarms.map((a) => a.key))
    const newlyCritical = alarms.some((a) => a.sev === 'critical' && !seenRef.current.has(a.key))
    const newlyAny = alarms.some((a) => !seenRef.current.has(a.key))
    const beepWorthy = alarms.some((a) => a.key !== 'obstacle' && !seenRef.current.has(a.key))
    seenRef.current = cur
    // 최초 표시 시각 기록(5초 자동 숨김용) · 조건 해제 시 기록 제거(재발생 시 다시 5초 표시)
    const fs = firstSeenRef.current
    for (const a of alarms) if (!(a.key in fs)) fs[a.key] = state.missionTime
    for (const k of Object.keys(fs)) if (!cur.has(k)) delete fs[k]
    // 조건이 해제된 경보는 닫힘 상태도 초기화(재발생 시 다시 알림)
    setDismissed((prev) => {
      let changed = false
      const next = { ...prev }
      for (const k of Object.keys(next)) if (!cur.has(k)) (delete next[k], (changed = true))
      return changed ? next : prev
    })
    if (newlyAny && navigator.vibrate) navigator.vibrate(newlyCritical ? [80, 40, 80] : [50])
    if (newlyCritical) beep('critical')
    else if (beepWorthy) beep('warning')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig])

  const visible = alarms
    .filter((a) => {
      if (dismissed[a.key]) return false
      const fs = firstSeenRef.current[a.key]
      if (fs != null && state.missionTime - fs >= AUTO_HIDE) return false // 5초 경과 → 자동 숨김
      return true
    })
    .sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev])
  if (!visible.length) return null

  return (
    <div className="alarms" role="alert" aria-live="assertive">
      {visible.map((a) => (
        <div key={a.key} className={`alarm alarm--${a.sev}`}>
          <span className="alarm__ic">
            <i className={`ti ${a.icon}`} />
          </span>
          <div className="alarm__body">
            <b className="alarm__title">{a.title}</b>
            <span className="alarm__desc num">{a.desc}</span>
          </div>
          <button className="alarm__x" onClick={() => setDismissed((d) => ({ ...d, [a.key]: true }))} aria-label="경보 닫기">
            <i className="ti ti-x" />
          </button>
        </div>
      ))}
    </div>
  )
}
