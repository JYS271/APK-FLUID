import { useState, useRef } from 'react'
import { useTelemetry, ENV_MODES } from '../state/TelemetryContext.jsx'
import MarineMap from './MarineMap.jsx'

/* 대시보드 지도 캐러셀 — 좌우 스와이프로 운용 환경 전환.
   왼쪽 드래그: 항만→하천→저수지→연안 / 오른쪽: 역순.
   각 슬라이드는 해당 환경의 지도(활성 환경만 라이브). 하단 인디케이터(● ○ ○ ○). */
const ENV_KEYS = ENV_MODES.map((m) => m.key)
const LAST = ENV_KEYS.length - 1

export default function MapCarousel() {
  const { state, setEnvironment } = useTelemetry()
  const index = Math.max(0, ENV_KEYS.indexOf(state.environment))
  const [drag, setDrag] = useState(0) // px (렌더용)
  const dragRef = useRef(0) // 동기 로직용(스냅 판정)
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef(null)
  const st = useRef({ x: 0, y: 0, decided: 0 }) // decided: 0 미정 / 1 가로 / -1 세로

  const onDown = (e) => {
    st.current = { x: e.clientX, y: e.clientY, decided: 0 }
  }
  const onMove = (e) => {
    const s = st.current
    if (s.decided === -1) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (s.decided === 0) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      if (Math.abs(dy) > Math.abs(dx)) {
        s.decided = -1 // 세로 스크롤은 그대로
        return
      }
      s.decided = 1
      setDragging(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }
    let d = dx
    if ((index === 0 && d > 0) || (index === LAST && d < 0)) d *= 0.3 // 가장자리 저항
    dragRef.current = d
    setDrag(d)
  }
  const onUp = () => {
    const s = st.current
    if (s.decided === 1) {
      const w = wrapRef.current ? wrapRef.current.clientWidth : 320
      const threshold = Math.min(70, w * 0.22)
      const d = dragRef.current
      let next = index
      if (d <= -threshold) next = Math.min(LAST, index + 1)
      else if (d >= threshold) next = Math.max(0, index - 1)
      if (next !== index) {
        setEnvironment(ENV_KEYS[next])
        if (navigator.vibrate) navigator.vibrate(8)
      }
    }
    st.current.decided = 0
    dragRef.current = 0
    setDragging(false)
    setDrag(0)
  }

  return (
    <div
      className="mapcar"
      ref={wrapRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
    >
      <div
        className={`mapcar__track ${dragging ? 'is-drag' : ''}`}
        style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}
      >
        {ENV_KEYS.map((env) => (
          <div className="mapcar__slide" key={env}>
            <MarineMap environment={env} />
          </div>
        ))}
      </div>

      {/* 현재 위치 인디케이터 (● ○ ○ ○) + 환경명 */}
      <div className="mapcar__nav">
        <span className="mapcar__name">{ENV_MODES[index].label}</span>
        <div className="mapcar__dots">
          {ENV_MODES.map((m, i) => (
            <button
              key={m.key}
              className={`mapcar__dot ${i === index ? 'is-on' : ''}`}
              onClick={() => setEnvironment(m.key)}
              aria-label={m.label}
              title={m.label}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
