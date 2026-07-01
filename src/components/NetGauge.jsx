/* 곡선형 네트(가오리 입) 게이지 — SVG 아치
   value 0~100. 90%↑ 오렌지→레드 점멸(임계).
   head dot 위치는 SMIL 없이 JS로 계산. */
export default function NetGauge({ value = 0, label = '수거함', size = 168 }) {
  const v = Math.max(0, Math.min(100, value))
  const critical = v >= 90

  // 아치: 220° 스윕 (-200° → +20°)
  const startDeg = 160
  const sweep = 220
  const R = 62
  const cx = 100
  const cy = 100

  const polar = (deg) => {
    const rad = (deg * Math.PI) / 180
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) }
  }

  const p0 = polar(startDeg)
  const p1 = polar(startDeg + sweep)
  const arc = (frac) => {
    const end = startDeg + sweep * frac
    const pe = polar(end)
    const large = sweep * frac > 180 ? 1 : 0
    return `M${p0.x},${p0.y} A${R},${R} 0 ${large} 1 ${pe.x},${pe.y}`
  }

  const headPos = polar(startDeg + sweep * (v / 100))

  const color = critical ? 'var(--danger)' : v >= 70 ? 'var(--orange-500)' : 'var(--success)'

  return (
    <div className="netgauge" style={{ width: size }}>
      <svg viewBox="0 0 200 150" className={critical ? 'netgauge__svg blink' : 'netgauge__svg'}>
        {/* 트랙 */}
        <path d={arc(1)} fill="none" stroke="var(--surface-2)" strokeWidth="14" strokeLinecap="round" />
        {/* 채움 */}
        <path
          d={arc(v / 100)}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          style={{ transition: 'stroke 0.3s' }}
        />
        {/* head dot (JS 계산) */}
        <circle cx={headPos.x} cy={headPos.y} r="7" fill="#fff" stroke={color} strokeWidth="3.5" />

        {/* 중앙 수치 */}
        <text x="100" y="96" textAnchor="middle" className="num netgauge__value" fill={color}>
          {Math.round(v)}
          <tspan fontSize="16" dy="-14">%</tspan>
        </text>
        <text x="100" y="118" textAnchor="middle" className="netgauge__label">
          {label}
        </text>
      </svg>
    </div>
  )
}
