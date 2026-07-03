import { useState, useRef } from 'react'
import { kpi } from '../data/analytics.js'

/* 기록 KPI 캐러셀 — 오늘 수거·주간 누적·수거 효율·가동률을 한 카드로 정리.
   애플워치/갤럭시워치처럼 좌우 스와이프로 다음/이전 항목 전환 + 하단 인디케이터. */
const SLIDES = [
  { key: 'today', icon: 'ti-trash', label: '오늘 수거', value: kpi.todayKg, unit: 'kg', accent: true, sub: '오늘 수거한 무게' },
  { key: 'week', icon: 'ti-calendar-stats', label: '주간 누적', value: kpi.weekKg, unit: 'kg', sub: '이번 주 누적 수거량' },
  { key: 'eff', icon: 'ti-target-arrow', label: '수거 효율', value: kpi.efficiency, unit: '%', sub: 'AI 경로 최적화 기준' },
  { key: 'uptime', icon: 'ti-plug-connected', label: '가동률', value: kpi.uptime, unit: '%', sub: '이번 주 평균 가동' },
]
const LAST = SLIDES.length - 1

export default function KpiCarousel() {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const dragRef = useRef(0)
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
        s.decided = -1
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
    if ((index === 0 && d > 0) || (index === LAST && d < 0)) d *= 0.3
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
        setIndex(next)
        if (navigator.vibrate) navigator.vibrate(8)
      }
    }
    st.current.decided = 0
    dragRef.current = 0
    setDragging(false)
    setDrag(0)
  }

  return (
    <section className="kpicar swim-in" style={{ animationDelay: '.04s' }}>
      <div
        className="kpicar__view"
        ref={wrapRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      >
        <div
          className={`kpicar__track ${dragging ? 'is-drag' : ''}`}
          style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}
        >
          {SLIDES.map((s) => (
            <div className="kpicar__slide" key={s.key}>
              <div className={`kpicard ${s.accent ? 'is-accent' : ''}`}>
                <span className="kpicard__ic">
                  <i className={`ti ${s.icon}`} />
                </span>
                <span className="kpicard__val num">
                  {s.value}
                  <em>{s.unit}</em>
                </span>
                <span className="kpicard__label">{s.label}</span>
                <span className="kpicard__sub">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="kpicar__dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            className={`kpicar__dot ${i === index ? 'is-on' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={s.label}
            title={s.label}
          />
        ))}
      </div>
    </section>
  )
}
