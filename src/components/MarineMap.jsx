import { useTelemetry } from '../state/TelemetryContext.jsx'
import { coastline, homeBase } from '../data/mapData.js'

/* 스타일드 해양 SVG 지도
   - 순찰 경로(오렌지 점선)
   - 쓰레기 히트맵
   - 부채꼴(날개) 센서 FOV
   - 로봇 마커(위치/방위) */
export default function MarineMap({ compact = false }) {
  const { state, gps, heatmap, path } = useTelemetry()

  const pathStr = path.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  // 센서 FOV 부채꼴 (방위 기준 ±38°)
  const fovR = 26
  const half = 38
  const h = state.heading
  const a1 = ((h - half - 90) * Math.PI) / 180
  const a2 = ((h + half - 90) * Math.PI) / 180
  const fx1 = gps.x + Math.cos(a1) * fovR
  const fy1 = gps.y + Math.sin(a1) * fovR
  const fx2 = gps.x + Math.cos(a2) * fovR
  const fy2 = gps.y + Math.sin(a2) * fovR

  return (
    <svg className="marinemap" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="해양 순찰 지도">
      <defs>
        <radialGradient id="sea" cx="42%" cy="38%" r="80%">
          <stop offset="0%" stopColor="#173a6b" />
          <stop offset="60%" stopColor="#0f2b52" />
          <stop offset="100%" stopColor="#0a1d3a" />
        </radialGradient>
        <radialGradient id="hot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,106,31,0.55)" />
          <stop offset="100%" stopColor="rgba(255,106,31,0)" />
        </radialGradient>
        <linearGradient id="fov" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(120,200,255,0.42)" />
          <stop offset="100%" stopColor="rgba(120,200,255,0)" />
        </linearGradient>
      </defs>

      {/* 바다 */}
      <rect x="0" y="0" width="100" height="100" fill="url(#sea)" />

      {/* 등심선 그리드 */}
      <g stroke="rgba(120,170,230,0.10)" strokeWidth="0.4">
        {[20, 40, 60, 80].map((v) => (
          <line key={`h${v}`} x1="0" y1={v} x2="100" y2={v} />
        ))}
        {[20, 40, 60, 80].map((v) => (
          <line key={`v${v}`} x1={v} y1="0" x2={v} y2="100" />
        ))}
      </g>

      {/* 육지(해안선) */}
      <polygon points={coastline} fill="#1d3a2b" opacity="0.9" />
      <polygon points={coastline} fill="none" stroke="rgba(120,220,160,0.4)" strokeWidth="0.5" />

      {/* 히트맵 */}
      {heatmap.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4 + p.w * 6} fill="url(#hot)" />
      ))}

      {/* 순찰 경로 */}
      <path d={pathStr} fill="none" stroke="var(--orange-500)" strokeWidth="0.7" strokeDasharray="2 1.6" opacity="0.9" />

      {/* 기지 */}
      <g transform={`translate(${homeBase.x} ${homeBase.y})`}>
        <circle r="2.4" fill="none" stroke="rgba(120,220,160,0.8)" strokeWidth="0.5" />
        <circle r="0.9" fill="rgba(120,220,160,0.9)" />
      </g>

      {/* 센서 FOV 부채꼴 */}
      <path d={`M${gps.x},${gps.y} L${fx1},${fy1} A${fovR},${fovR} 0 0 1 ${fx2},${fy2} Z`} fill="url(#fov)" opacity="0.85" />

      {/* 로봇 마커 (만타레이 방향) */}
      <g transform={`translate(${gps.x} ${gps.y}) rotate(${state.heading})`}>
        <circle r="4.5" fill="rgba(255,106,31,0.18)">
          <animate attributeName="r" values="4.5;6.5;4.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        {/* 가오리 실루엣 */}
        <path d="M0,-3.2 C2.6,-1.4 3,1.4 0,3.2 C-3,1.4 -2.6,-1.4 0,-3.2 Z" fill="var(--orange-500)" stroke="#fff" strokeWidth="0.35" />
        <circle cx="0" cy="-1.2" r="0.5" fill="#fff" />
      </g>

      {!compact && (
        <text x="3" y="97" fill="rgba(200,220,255,0.55)" fontSize="2.6" className="num">
          {gps.x.toFixed(1)}, {gps.y.toFixed(1)} · {Math.round(state.heading)}°
        </text>
      )}
    </svg>
  )
}
