import { useState, useRef } from 'react'
import { useTelemetry, ENV_MODES } from '../state/TelemetryContext.jsx'

/* 대시보드 통계 세그먼트 — 가로 1줄 4분할 탭.
   탭 선택 시 그 칸만 연주황으로 강조되고, 아래에 해당 항목의 값·정보를 표시. */
const TABS = [
  { key: 'collected', icon: 'ti-trash', label: '오늘 수거' },
  { key: 'turbidity', icon: 'ti-droplet', label: '탁도' },
  { key: 'temp', icon: 'ti-temperature', label: '수온' },
  { key: 'uptime', icon: 'ti-clock', label: '가동' },
]

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

function content(key, state) {
  const env = ENV_MODES.find((m) => m.key === state.environment) || ENV_MODES[0]
  if (key === 'collected') {
    const kg = Math.round((state.netLoad / 100) * state.netCapacityKg)
    return { value: `${state.collectedToday}`, unit: '개', title: '오늘 수거된 양', sub: `수거함 적재 ${kg}kg / ${state.netCapacityKg}kg` }
  }
  if (key === 'turbidity') {
    const t = Math.round(state.turbidity)
    const grade = t < 25 ? '맑음' : t < 45 ? '보통' : '탁함'
    return { value: `${t}`, unit: 'NTU', title: `오늘의 탁한 정도 · ${grade}`, sub: state.dehaze ? '디헤이징 ON · 시야 보정 중' : '디헤이징 OFF' }
  }
  if (key === 'temp') {
    return { value: state.waterTemp.toFixed(1), unit: '℃', title: '현재 수온', sub: `${env.label} · 기준 ${env.temp.toFixed(1)}℃` }
  }
  return { value: fmtTime(state.missionTime), unit: '', title: '누적 가동 시간', sub: `현재 속도 ${state.speed.toFixed(1)} knot` }
}

export default function StatSegment() {
  const { state } = useTelemetry()
  const [sel, setSel] = useState(null) // null이면 접힘(정보 숨김)
  const lastRef = useRef('collected') // 접힐 때도 마지막 내용 유지(부드러운 수축)
  if (sel) lastRef.current = sel
  const open = sel !== null
  const c = content(lastRef.current, state)

  return (
    <section className="card statseg swim-in" style={{ animationDelay: '.16s' }}>
      {/* 가로 4분할 탭 — 누르면 아래로 펼쳐지고, 다시 누르면 접힘 */}
      <div className="statseg__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={sel === t.key}
            aria-expanded={sel === t.key}
            className={`statseg__tab ${sel === t.key ? 'is-on' : ''}`}
            onClick={() => setSel((prev) => (prev === t.key ? null : t.key))}
          >
            <span className="statseg__ic">
              <i className={`ti ${t.icon}`} />
            </span>
            <span className="statseg__lbl">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 선택 시에만 펼쳐지는 값·정보 */}
      <div className={`statseg__panel ${open ? 'is-open' : ''}`}>
        <div className="statseg__panel-inner">
          <span className="statseg__value num">
            {c.value}
            {c.unit && <em>{c.unit}</em>}
          </span>
          <span className="statseg__title">{c.title}</span>
          <span className="statseg__sub">{c.sub}</span>
        </div>
      </div>
    </section>
  )
}
