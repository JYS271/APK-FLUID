import { useTelemetry } from '../state/TelemetryContext.jsx'
import { kpi } from '../data/analytics.js'

/* 대시보드 상태 원형 게이지 — 수거·탁도·수온·가동.
   각 항목의 (현재값 / 설정 최대값)을 주황색 도넛 게이지로 표시.
   순수 SVG(stroke-dasharray) + CSS. 아이콘은 프로젝트 표준(Tabler). */
const R = 34
const CIRC = 2 * Math.PI * R

const ITEMS = [
  { key: 'collect', icon: 'ti-trash', label: '수거', max: 1000, get: (s) => s.collectedToday },
  { key: 'turbidity', icon: 'ti-droplet', label: '탁도', max: 100, get: (s) => s.turbidity },
  { key: 'temp', icon: 'ti-temperature', label: '수온', max: 100, get: (s) => s.waterTemp },
  { key: 'uptime', icon: 'ti-activity', label: '가동', max: 100, get: () => kpi.uptime },
]

const clampPct = (v) => Math.max(0, Math.min(100, v))

function GaugeCard({ icon, label, value, max }) {
  const pct = clampPct((value / max) * 100)
  const offset = CIRC * (1 - pct / 100)
  return (
    <div className="sg">
      <svg className="sg__ring" viewBox="0 0 82 82" aria-hidden="true">
        <circle className="sg__track" cx="41" cy="41" r={R} />
        <circle
          className="sg__fill"
          cx="41"
          cy="41"
          r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform="rotate(-90 41 41)"
        />
      </svg>
      <div className="sg__center">
        <i className={`ti ${icon}`} />
        <span className="sg__label">{label}</span>
        <span className="sg__pct num">
          {Math.round(pct)}
          <em>%</em>
        </span>
      </div>
    </div>
  )
}

export default function StatGauges() {
  const { state } = useTelemetry()
  return (
    <section className="sg-row swim-in" style={{ animationDelay: '.16s' }} aria-label="현재 상태 게이지">
      {ITEMS.map((it) => (
        <GaugeCard key={it.key} icon={it.icon} label={it.label} value={it.get(state)} max={it.max} />
      ))}
    </section>
  )
}
