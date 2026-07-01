/* SVG 직접 구현 차트 — BarChart / DonutChart (Recharts 미사용) */

export function BarChart({ data, unit = '', height = 140 }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const w = 300
  const pad = 8
  const barW = (w - pad * 2) / data.length
  const chartH = height - 28

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="barchart" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d.value / max) * (chartH - 10)
        const x = pad + i * barW + barW * 0.2
        const bw = barW * 0.6
        const y = chartH - h
        const peak = d.value === max
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={h}
              rx="4"
              fill={peak ? 'var(--orange-500)' : 'var(--navy-100)'}
              className="barchart__bar"
              style={{ transformOrigin: `${x + bw / 2}px ${chartH}px` }}
            />
            <text x={x + bw / 2} y={chartH + 16} textAnchor="middle" className="barchart__label">
              {d.label}
            </text>
            <text x={x + bw / 2} y={y - 4} textAnchor="middle" className="barchart__val num" fill={peak ? 'var(--orange-600)' : 'var(--text-soft)'}>
              {Math.round(d.value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function DonutChart({ data, size = 150, thickness = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const R = size / 2 - thickness / 2
  const C = 2 * Math.PI * R
  let acc = 0

  return (
    <div className="donut" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="donut__svg">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const frac = d.value / total
            const len = frac * C
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={R}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-acc}
                strokeLinecap="butt"
              />
            )
            acc += len
            return seg
          })}
        </g>
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" className="donut__total num">
          {Math.round(total)}
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" className="donut__unit">
          %
        </text>
      </svg>
    </div>
  )
}

export function Legend({ data }) {
  return (
    <ul className="legend">
      {data.map((d, i) => (
        <li key={i}>
          <span className="legend__dot" style={{ background: d.color }} />
          <span className="legend__label">{d.label}</span>
          <span className="legend__val num">{Math.round(d.value)}%</span>
        </li>
      ))}
    </ul>
  )
}
