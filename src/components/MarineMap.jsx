import { useTelemetry } from '../state/TelemetryContext.jsx'
import { coastline, homeBase } from '../data/mapData.js'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const lerp = (a, b, t) => Math.round(a + (b - a) * t)

/* 만타레이 실루엣 (재사용) — ARK-FLUID 브랜드 가오리 글리프
   원본 viewBox 0..200 x 0..140(중심 100,70)을 원점 기준으로 축소·정렬 */
const MANTA_S = 0.038
function Manta({ fill, stroke = '#fff', sw = 0.35 }) {
  return (
    <g transform={`scale(${MANTA_S}) translate(-100 -70)`}>
      <path
        d="M100 12 C128 12 150 24 176 52 C190 67 198 78 198 86 C198 92 190 92 182 88
           C168 81 150 74 138 74 C142 92 140 112 128 128 C122 136 116 132 114 122
           C111 108 106 96 100 90 C94 96 89 108 86 122 C84 132 78 136 72 128
           C60 112 58 92 62 74 C50 74 32 81 18 88 C10 92 2 92 2 86
           C2 78 10 67 24 52 C50 24 72 12 100 12 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw / MANTA_S}
        strokeLinejoin="round"
      />
      <circle cx="86" cy="48" r="6.5" fill="#fff" />
      <circle cx="114" cy="48" r="6.5" fill="#fff" />
    </g>
  )
}

/* 스타일드 해양 SVG 지도
   - 순찰 경로(오렌지 점선) + 시작/목표 가오리 마커
   - 쓰레기 히트맵 · 장애물(소나 링) · OA 회피 아크
   - 부채꼴(날개) 센서 FOV · 로봇 마커(위치/방위 회전) · 조류 화살표 */
export default function MarineMap({ compact = false, zoom = 1 }) {
  const { state, gps, heatmap, path, obstacles } = useTelemetry()

  // 줌: 배율이 낮을수록 viewBox를 넓혀 그만큼 더 넓은 바다를 보여줌
  const vs = 100 / zoom
  const vOff = 50 - vs / 2
  const viewBox = `${vOff} ${vOff} ${vs} ${vs}`

  const pathStr = path.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
  const pathStart = path[0]
  const pathGoal = path[path.length - 1]

  // 수질 색조 — 탁도↑ → 탁한 오버레이 진해짐, 수온으로 청록↔갈색 이동(영상처럼 반응)
  const murk = clamp01((state.turbidity - 16) / 56) * 0.6 // 오버레이 불투명도 0~0.6
  const warm = clamp01((state.waterTemp - 18) / 6) // 0(차가움/청록) ~ 1(따뜻함/갈색)
  const tint = `rgb(${lerp(38, 104, warm)}, ${lerp(96, 84, warm)}, ${lerp(84, 44, warm)})`

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

  // OA 회피 아크: 로봇 앞쪽으로 휘어지는 우회 경로 미리보기
  let avoidArc = null
  if (state.avoiding && state.nearObstacle) {
    const hr = (h * Math.PI) / 180
    const fwd = { x: gps.x + Math.sin(hr) * 14, y: gps.y - Math.cos(hr) * 14 }
    // 장애물 반대편으로 제어점 오프셋
    const ox = state.nearObstacle.x - gps.x
    const side = ox >= 0 ? -1 : 1
    const perp = (hr + (Math.PI / 2) * side)
    const ctrl = { x: gps.x + Math.sin(hr) * 7 + Math.cos(perp) * 9, y: gps.y - Math.cos(hr) * 7 + Math.sin(perp) * 9 }
    avoidArc = `M${gps.x},${gps.y} Q${ctrl.x},${ctrl.y} ${fwd.x},${fwd.y}`
  }

  // 조류 화살표 그리드
  const cur = state.current
  const curRad = (cur.dir * Math.PI) / 180
  const arrows = [
    { x: 30, y: 24 }, { x: 66, y: 34 }, { x: 78, y: 66 }, { x: 34, y: 72 }, { x: 52, y: 48 },
  ]
  const goalDone = state.netLoad >= 90

  return (
    <svg className="marinemap" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" role="img" aria-label="해양 순찰 지도">
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

      {/* 바다 — 줌 아웃 시에도 화면을 채우도록 넓게 */}
      <rect x="-80" y="-80" width="260" height="260" fill="url(#sea)" />

      {/* 수질 색조 오버레이 (탁도·수온 반응) */}
      <rect
        x="-80"
        y="-80"
        width="260"
        height="260"
        fill={tint}
        opacity={murk}
        style={{ transition: 'fill 0.6s ease, opacity 0.6s ease' }}
      />

      {/* 등심선 그리드 (확장 범위) */}
      <g stroke="rgba(120,170,230,0.10)" strokeWidth="0.4">
        {Array.from({ length: 14 }, (_, i) => -80 + i * 20).map((v) => (
          <line key={`h${v}`} x1="-80" y1={v} x2="180" y2={v} />
        ))}
        {Array.from({ length: 14 }, (_, i) => -80 + i * 20).map((v) => (
          <line key={`v${v}`} x1={v} y1="-80" x2={v} y2="180" />
        ))}
      </g>

      {/* 조류 화살표 (약한 청록) */}
      <g stroke="rgba(130,220,235,0.28)" strokeWidth="0.5" fill="none" strokeLinecap="round">
        {arrows.map((p, i) => {
          const ex = p.x + Math.sin(curRad) * 4
          const ey = p.y - Math.cos(curRad) * 4
          const bx = ex - Math.sin(curRad - 0.5) * 1.5
          const by = ey + Math.cos(curRad - 0.5) * 1.5
          const cx = ex - Math.sin(curRad + 0.5) * 1.5
          const cy = ey + Math.cos(curRad + 0.5) * 1.5
          return (
            <g key={i}>
              <line x1={p.x} y1={p.y} x2={ex} y2={ey} />
              <line x1={ex} y1={ey} x2={bx} y2={by} />
              <line x1={ex} y1={ey} x2={cx} y2={cy} />
            </g>
          )
        })}
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

      {/* 장애물 + 소나 링 */}
      {obstacles.map((o, i) => {
        const detected = state.nearObstacle && Math.abs(state.nearObstacle.x - o.x) < 0.1 && Math.abs(state.nearObstacle.y - o.y) < 0.1
        return (
          <g key={i}>
            <circle cx={o.x} cy={o.y} r={o.r} fill="rgba(236,61,61,0.14)" stroke={detected ? 'var(--danger)' : 'rgba(236,61,61,0.5)'} strokeWidth={detected ? 0.7 : 0.4} />
            {detected && (
              <circle cx={o.x} cy={o.y} r={o.r} fill="none" stroke="var(--danger)" strokeWidth="0.5" opacity="0.7">
                <animate attributeName="r" values={`${o.r};${o.r + 5};${o.r}`} dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            <text x={o.x} y={o.y + 0.9} textAnchor="middle" fontSize="2.4" fill="rgba(255,220,220,0.85)">⚠</text>
          </g>
        )
      })}

      {/* OA 회피 아크 */}
      {avoidArc && (
        <path d={avoidArc} fill="none" stroke="var(--warning)" strokeWidth="0.9" strokeDasharray="1.4 1.2" strokeLinecap="round" />
      )}

      {/* 기지 자동 복귀 경로 (배출 복귀 중) */}
      {state.returning && (
        <line
          x1={gps.x}
          y1={gps.y}
          x2={homeBase.x}
          y2={homeBase.y}
          stroke="var(--success)"
          strokeWidth="0.7"
          strokeDasharray="2 1.4"
          strokeLinecap="round"
          opacity="0.9"
        />
      )}

      {/* 기지 */}
      <g transform={`translate(${homeBase.x} ${homeBase.y})`}>
        <circle r="2.4" fill="none" stroke={state.returning ? 'var(--success)' : 'rgba(120,220,160,0.8)'} strokeWidth="0.5" />
        <circle r="0.9" fill="rgba(120,220,160,0.9)" />
        {state.returning && (
          <circle r="2.4" fill="none" stroke="var(--success)" strokeWidth="0.5" opacity="0.7">
            <animate attributeName="r" values="2.4;5;2.4" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* 경로 시작(0%) 가오리 마커 */}
      <g transform={`translate(${pathStart.x} ${pathStart.y}) scale(0.8)`} opacity="0.85">
        <circle r="3.6" fill="none" stroke="rgba(200,220,255,0.5)" strokeWidth="0.4" />
        <Manta fill="rgba(215,230,255,0.9)" stroke="rgba(120,150,200,0.9)" />
      </g>
      {/* 경로 목표(100%) 가오리 마커 — 수거 임박 시 오렌지 */}
      <g transform={`translate(${pathGoal.x} ${pathGoal.y}) scale(0.85)`}>
        <circle r="3.8" fill="none" stroke={goalDone ? 'var(--orange-500)' : 'rgba(200,220,255,0.5)'} strokeWidth="0.5" />
        <Manta fill={goalDone ? 'var(--orange-500)' : 'rgba(215,230,255,0.9)'} />
        {goalDone && (
          <circle r="3.8" fill="none" stroke="var(--orange-500)" strokeWidth="0.4" opacity="0.7">
            <animate attributeName="r" values="3.8;6;3.8" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* 센서 FOV 부채꼴 */}
      <path d={`M${gps.x},${gps.y} L${fx1},${fy1} A${fovR},${fovR} 0 0 1 ${fx2},${fy2} Z`} fill="url(#fov)" opacity="0.85" />

      {/* 로봇 마커 (만타레이 · 방위 회전) */}
      <g transform={`translate(${gps.x} ${gps.y}) rotate(${state.heading})`}>
        <circle r="4.5" fill={state.avoiding ? 'rgba(245,166,35,0.22)' : 'rgba(255,106,31,0.18)'}>
          <animate attributeName="r" values="4.5;6.5;4.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <Manta fill={state.avoiding ? 'var(--warning)' : 'var(--orange-500)'} />
      </g>

      {!compact && (
        <text x="3" y="97" fill="rgba(200,220,255,0.55)" fontSize="2.6" className="num">
          {gps.x.toFixed(1)}, {gps.y.toFixed(1)} · {Math.round(state.heading)}°
        </text>
      )}
    </svg>
  )
}
