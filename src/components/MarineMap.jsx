import { useTelemetry, ENV_MODES } from '../state/TelemetryContext.jsx'
import { coastline, homeBase, patrolPaths, heatmapSets, obstacleSets } from '../data/mapData.js'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const lerp = (a, b, t) => Math.round(a + (b - a) * t)

/* 스타일드 해양 SVG 지도
   - 순찰 경로(오렌지 점선) + 시작/목표 마커 · 쓰레기 히트맵 · 장애물(소나 링) · OA 회피 아크
   - 부채꼴 센서 FOV · 로봇 마커(내 위치) · 조류 화살표
   environment prop 지정 시 해당 환경의 정적 지도(캐러셀 슬라이드용). 미지정 시 현재 활성 환경(라이브). */
export default function MarineMap({ compact = false, zoom = 1, environment }) {
  const ctx = useTelemetry()
  const { state, gps } = ctx
  // 환경별 슬라이드(비활성)면 mapData에서 직접, 활성이면 컨텍스트(라이브)에서
  const envKey = environment || state.environment
  const active = envKey === state.environment
  const heatmap = environment ? heatmapSets[envKey] || heatmapSets.harbor : ctx.heatmap
  const path = environment ? patrolPaths[envKey] || patrolPaths.harbor : ctx.path
  const obstacles = environment ? obstacleSets[envKey] || obstacleSets.harbor : ctx.obstacles
  const envMode = ENV_MODES.find((m) => m.key === envKey) || ENV_MODES[0]
  const turbidity = active ? state.turbidity : envMode.turbidity
  const waterTemp = active ? state.waterTemp : envMode.temp

  // 줌: 배율이 낮을수록 viewBox를 넓혀 그만큼 더 넓은 바다를 보여줌
  const vs = 100 / zoom
  const vOff = 50 - vs / 2
  const viewBox = `${vOff} ${vOff} ${vs} ${vs}`

  const pathStr = path.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
  const pathStart = path[0]
  const pathGoal = path[path.length - 1]

  // 수질 색조 — 탁도↑ → 탁한 오버레이 진해짐, 수온으로 청록↔갈색 이동(영상처럼 반응)
  const murk = clamp01((turbidity - 16) / 56) * 0.6 // 오버레이 불투명도 0~0.6
  const warm = clamp01((waterTemp - 18) / 6) // 0(차가움/청록) ~ 1(따뜻함/갈색)
  const tint = `rgb(${lerp(38, 104, warm)}, ${lerp(96, 84, warm)}, ${lerp(84, 44, warm)})`

  // 다른 ARK-FLUID 유닛(함대) — 미션 시간 기반 궤도 이동
  const t = state.missionTime
  const orbit = (cx, cy, rx, ry, w, ph) => {
    const a = t * w + ph
    const vx = -Math.sin(a) * rx * w
    const vy = Math.cos(a) * ry * w
    return {
      x: cx + Math.cos(a) * rx,
      y: cy + Math.sin(a) * ry,
      heading: ((Math.atan2(vx, -vy) * 180) / Math.PI + 360) % 360,
    }
  }
  const fleet = [
    orbit(30, 34, 13, 10, 0.16, 0),
    orbit(70, 60, 12, 13, -0.13, 2),
    orbit(52, 46, 20, 15, 0.1, 4),
  ]

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

  // 조류 화살표 그리드 (비활성 슬라이드는 환경 기본 유속·정적 방향)
  const cur = active ? state.current : { speed: envMode.currentSpeed, dir: 210 }
  const curRad = (cur.dir * Math.PI) / 180
  const arrows = [
    { x: 30, y: 24 }, { x: 66, y: 34 }, { x: 78, y: 66 }, { x: 34, y: 72 }, { x: 52, y: 48 },
  ]
  const goalDone = active && state.netLoad >= 90

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
        const detected = active && state.nearObstacle && Math.abs(state.nearObstacle.x - o.x) < 0.1 && Math.abs(state.nearObstacle.y - o.y) < 0.1
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
      {active && avoidArc && (
        <path d={avoidArc} fill="none" stroke="var(--warning)" strokeWidth="0.9" strokeDasharray="1.4 1.2" strokeLinecap="round" />
      )}

      {/* 기지 자동 복귀 경로 (배출 복귀 중) */}
      {active && state.returning && (
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
        {active && state.returning && (
          <circle r="2.4" fill="none" stroke="var(--success)" strokeWidth="0.5" opacity="0.7">
            <animate attributeName="r" values="2.4;5;2.4" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* 경로 시작(0%) 마커 — 원형 점 */}
      <g transform={`translate(${pathStart.x} ${pathStart.y})`} opacity="0.85">
        <circle r="1.8" fill="none" stroke="rgba(200,220,255,0.55)" strokeWidth="0.5" />
        <circle r="0.8" fill="rgba(215,230,255,0.9)" />
      </g>
      {/* 경로 목표(100%) 마커 — 수거 임박 시 오렌지 */}
      <g transform={`translate(${pathGoal.x} ${pathGoal.y})`}>
        <circle r="1.9" fill="none" stroke={goalDone ? 'var(--orange-500)' : 'rgba(200,220,255,0.55)'} strokeWidth="0.5" />
        <circle r="0.9" fill={goalDone ? 'var(--orange-500)' : 'rgba(215,230,255,0.9)'} />
        {goalDone && (
          <circle r="1.9" fill="none" stroke="var(--orange-500)" strokeWidth="0.4" opacity="0.7">
            <animate attributeName="r" values="1.9;5;1.9" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* 다른 유닛(함대) — 활성 환경만 */}
      {active &&
        fleet.map((u, i) => (
          <g key={`u${i}`} transform={`translate(${u.x.toFixed(2)} ${u.y.toFixed(2)})`} opacity="0.5">
            <circle r="1.3" fill="var(--navy-300)" stroke="rgba(200,220,255,0.6)" strokeWidth="0.35" />
          </g>
        ))}

      {/* 센서 FOV 부채꼴 + 로봇 마커(내 위치) — 활성 환경만 */}
      {active && (
        <>
          <path d={`M${gps.x},${gps.y} L${fx1},${fy1} A${fovR},${fovR} 0 0 1 ${fx2},${fy2} Z`} fill="url(#fov)" opacity="0.85" />
          <g transform={`translate(${gps.x} ${gps.y})`}>
            {/* 정확도 헤일로(맥동) */}
            <circle r="4.5" fill="rgba(10,132,255,0.16)" stroke="rgba(10,132,255,0.35)" strokeWidth="0.3">
              <animate attributeName="r" values="3.4;7;3.4" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.95;0.35;0.95" dur="2.4s" repeatCount="indefinite" />
            </circle>
            {/* 파란 위치 점(흰 테두리) */}
            <circle r="2" fill="#0a84ff" stroke="#fff" strokeWidth="0.7" />
          </g>
        </>
      )}

      {active && !compact && (
        <text x="3" y="97" fill="rgba(200,220,255,0.55)" fontSize="2.6" className="num">
          {gps.x.toFixed(1)}, {gps.y.toFixed(1)} · {Math.round(state.heading)}°
        </text>
      )}
    </svg>
  )
}
