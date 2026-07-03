import { useState, useEffect, useRef } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

const KIND_LABEL = { bottle: '페트병', can: '캔', glass: '유리병', cup: '종이컵' }
// 실루엣 종횡비(viewBox H/W) — 박스가 실루엣을 감싸도록
const KIND_ASPECT = { bottle: 78 / 44, can: 64 / 40, glass: 78 / 34, cup: 50 / 44 }

// 물살을 타고 떠다니는 쓰레기 (각자 박스가 추적)
const DEBRIS_INIT = [
  { kind: 'bottle', bw: 42 },
  { kind: 'can', bw: 36 },
  { kind: 'glass', bw: 32 },
  { kind: 'cup', bw: 40 },
  { kind: 'bottle', bw: 30 },
  { kind: 'can', bw: 34 },
  { kind: 'glass', bw: 38 },
  { kind: 'cup', bw: 32 },
]
// 화면 밖으로 완전히 나간 뒤에만 반대편에서 재진입(순간이동 방지)
const WRAP_LO = -60
const WRAP_HI = 160
const DEBRIS_COUNT = DEBRIS_INIT.length

/* 쓰레기 종류별 — 단색 그림자 실루엣만 (fill=currentColor) */
function DebrisShape({ kind }) {
  if (kind === 'bottle') {
    // 페트병
    return (
      <svg className="debris__svg" viewBox="0 0 44 78" preserveAspectRatio="xMidYMid meet" fill="currentColor">
        <rect x="16" y="2" width="12" height="7" rx="1.6" />
        <path d="M17 9 h10 v3.5 q0 1.8 1.4 3.2 q3.9 3.9 3.9 9.8 v39 q0 8.8-10.3 8.8 t-10.3-8.8 v-39 q0-5.9 3.9-9.8 q1.4-1.4 1.4-3.2 z" />
      </svg>
    )
  }
  if (kind === 'can') {
    // 알루미늄 캔
    return (
      <svg className="debris__svg" viewBox="0 0 40 64" preserveAspectRatio="xMidYMid meet" fill="currentColor">
        <path d="M8 9 v46 q0 4 12 4 t12-4 v-46 z" />
        <ellipse cx="20" cy="9" rx="12" ry="4" />
      </svg>
    )
  }
  if (kind === 'glass') {
    // 유리병
    return (
      <svg className="debris__svg" viewBox="0 0 34 78" preserveAspectRatio="xMidYMid meet" fill="currentColor">
        <rect x="13" y="2" width="8" height="6" rx="1" />
        <path d="M13.5 8 h7 v13 q0 2 1 3 q4.8 4 4.8 12.4 v33 q0 4.3-9.3 4.3 t-9.3-4.3 v-33 q0-8.4 4.8-12.4 q1-1 1-3 z" />
      </svg>
    )
  }
  // cup (종이컵)
  return (
    <svg className="debris__svg" viewBox="0 0 44 50" preserveAspectRatio="xMidYMid meet" fill="currentColor">
      <ellipse cx="22" cy="10" rx="13.5" ry="3.6" />
      <path d="M9 10 L35 10 L31 45 Q22 49 13 45 Z" />
    </svg>
  )
}

/* 바위/구조물 실루엣 종류별 (span에 맞춰 늘어남) */
const ROCK_PATH = {
  block: 'M3 52 L7 9 Q9 3 16 3 L104 6 Q114 8 116 18 L120 52 Z', // 콘크리트 블록(각짐)
  pebble: 'M0 52 Q3 34 18 30 Q28 26 40 32 Q52 24 66 30 Q82 24 98 32 Q114 30 120 52 Z', // 자갈 무더기
  mound: 'M0 52 Q30 20 60 18 Q92 20 120 52 Z', // 실트 둔덕(완만)
  boulder: 'M0 52 Q3 20 30 12 Q58 5 80 18 Q102 30 120 24 L120 52 Z', // 둥근 바위
}

/* 수초 실루엣 종류별 */
function PlantSVG({ kind }) {
  if (kind === 'reed') {
    // 갈대 — 곧고 가는 줄기 여러 대
    return (
      <svg viewBox="0 0 24 100" preserveAspectRatio="none" className="pl">
        <path d="M12 100 L10 5" />
        <path d="M12 100 L19 12" />
        <path d="M12 100 L5 15" />
        <path d="M12 100 L15 7" />
      </svg>
    )
  }
  if (kind === 'algae') {
    // 수초 덤불 — 뭉툭한 잎(채움)
    return (
      <svg viewBox="0 0 40 100" preserveAspectRatio="none" className="pl pl--fill">
        <path d="M20 100 Q4 74 10 52 Q14 38 20 44 Q26 38 30 52 Q36 74 20 100 Z" />
        <path d="M11 82 Q0 66 5 50 Q8 42 12 50 Q15 62 11 82 Z" />
        <path d="M29 82 Q40 66 35 50 Q32 42 28 50 Q25 62 29 82 Z" />
      </svg>
    )
  }
  if (kind === 'sparse') {
    // 성긴 해초 — 가늘고 힘없는 몇 가닥
    return (
      <svg viewBox="0 0 24 100" preserveAspectRatio="none" className="pl">
        <path d="M12 100 Q8 66 13 40 Q17 22 12 6" />
        <path d="M12 76 Q21 64 16 48" />
      </svg>
    )
  }
  // kelp(연안) — 가지치는 다시마
  return (
    <svg viewBox="0 0 24 100" preserveAspectRatio="none" className="pl">
      <path d="M12 100 Q4 74 12 54 Q20 34 11 6" />
      <path d="M12 100 Q19 78 13 60" />
      <path d="M12 72 Q3 60 7 44" />
      <path d="M12 46 Q21 36 17 22" />
    </svg>
  )
}

/* 환경별 해저 지형 프로파일 — 바닥 굴곡 / 바위 / 수초가 각각 다름 */
const TERRAIN = {
  harbor: {
    // 평평한 뻘 바닥
    far: 'M0 150 Q120 146 240 149 T400 147 V220 H0 Z',
    mid: 'M0 174 Q140 170 280 174 T400 171 V220 H0 Z',
    near: 'M0 196 Q200 192 400 196 V220 H0 Z',
    rockKind: 'block',
    rocks: [
      { l: '5%', w: 74, h: 34 },
      { l: '50%', w: 92, h: 44 },
      { l: '85%', w: 62, h: 30 },
    ],
    plantKind: 'sparse',
    plants: [
      { l: '22%', h: 66 },
      { l: '68%', h: 54 },
      { l: '91%', h: 48 },
    ],
  },
  river: {
    // 물길(수로) — 양쪽 둑이 높고 가운데가 팸
    far: 'M0 118 Q60 122 110 150 Q200 178 290 150 Q340 122 400 118 V220 H0 Z',
    mid: 'M0 150 Q70 154 130 172 Q200 190 270 172 Q330 154 400 150 V220 H0 Z',
    near: 'M0 182 Q90 186 150 194 Q200 200 250 194 Q310 186 400 182 V220 H0 Z',
    rockKind: 'pebble',
    rocks: [
      { l: '6%', w: 56, h: 22 },
      { l: '28%', w: 46, h: 18 },
      { l: '50%', w: 62, h: 24 },
      { l: '72%', w: 48, h: 20 },
      { l: '90%', w: 52, h: 22 },
    ],
    plantKind: 'reed',
    plants: [
      { l: '11%', h: 150 },
      { l: '15%', h: 120 },
      { l: '58%', h: 140 },
      { l: '62%', h: 108 },
      { l: '86%', h: 162 },
      { l: '90%', h: 128 },
    ],
  },
  reservoir: {
    // 완만한 넓은 둔덕
    far: 'M0 140 Q100 116 200 132 Q300 148 400 128 V220 H0 Z',
    mid: 'M0 166 Q120 148 220 162 Q320 174 400 158 V220 H0 Z',
    near: 'M0 190 Q110 178 210 188 Q320 198 400 186 V220 H0 Z',
    rockKind: 'mound',
    rocks: [
      { l: '12%', w: 100, h: 30 },
      { l: '60%', w: 116, h: 34 },
    ],
    plantKind: 'algae',
    plants: [
      { l: '10%', h: 72, w: 34 },
      { l: '26%', h: 58, w: 28 },
      { l: '50%', h: 78, w: 40 },
      { l: '70%', h: 60, w: 30 },
      { l: '86%', h: 66, w: 34 },
    ],
  },
  coast: {
    // 모래톱 기복
    far: 'M0 130 Q60 108 120 122 Q180 136 250 112 Q320 92 400 120 V220 H0 Z',
    mid: 'M0 158 Q70 138 140 152 Q210 166 280 144 Q340 128 400 152 V220 H0 Z',
    near: 'M0 186 Q80 172 160 184 Q240 196 310 180 Q360 170 400 186 V220 H0 Z',
    rockKind: 'boulder',
    rocks: [
      { l: '5%', w: 92, h: 44 },
      { l: '44%', w: 70, h: 34 },
      { l: '77%', w: 112, h: 50 },
    ],
    plantKind: 'kelp',
    plants: [
      { l: '10%', h: 120 },
      { l: '24%', h: 150 },
      { l: '30%', h: 96 },
      { l: '66%', h: 112 },
      { l: '80%', h: 150 },
      { l: '88%', h: 104 },
    ],
  },
}

/* 해저 지형 — 원경 능선/바닥 굴곡 + 바위 + 흔들리는 수초(환경별로 달라짐) */
function Seabed() {
  const { state } = useTelemetry()
  const t = TERRAIN[state.environment] || TERRAIN.harbor
  return (
    <div className="videofeed__seabed" aria-hidden="true">
      <svg viewBox="0 0 400 220" preserveAspectRatio="none">
        <path className="sb sb--far" d={t.far} />
        <path className="sb sb--mid" d={t.mid} />
        <path className="sb sb--near" d={t.near} />
      </svg>
      {/* 전경 바위/구조물 실루엣(해초 뿌리 높이) */}
      <div className="videofeed__rocks" aria-hidden="true">
        {t.rocks.map((r, i) => (
          <span key={i} className="rock" style={{ left: r.l, width: `${r.w}px`, height: `${r.h}px` }}>
            <svg viewBox="0 0 120 52" preserveAspectRatio="none">
              <path d={ROCK_PATH[t.rockKind]} />
            </svg>
          </span>
        ))}
      </div>
      {/* 흔들리는 수초 실루엣(화면 안까지 올라옴) */}
      <div className="videofeed__weeds" aria-hidden="true">
        {t.plants.map((p, i) => (
          <span
            key={i}
            className="weed"
            style={{
              left: p.l,
              width: p.w ? `${p.w}px` : undefined,
              height: `${p.h}px`,
              animationDelay: `${-0.4 * i}s`,
              animationDuration: `${5 + (i % 3) * 0.6}s`,
            }}
          >
            <PlantSVG kind={t.plantKind} />
          </span>
        ))}
      </div>
    </div>
  )
}

/* 해양생물 실루엣 — 물고기/해파리/거북이/치어 떼 */
function CreatureSVG({ type }) {
  if (type === 'jelly') {
    return (
      <svg viewBox="0 0 44 54" preserveAspectRatio="xMidYMid meet">
        <path d="M6 21 Q6 5 22 5 Q38 5 38 21 Q38 25 34 25 L10 25 Q6 25 6 21 Z" />
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M12 25 Q10 40 13 52" />
          <path d="M18 25 Q17 42 19 53" />
          <path d="M24 25 Q25 42 23 53" />
          <path d="M30 25 Q32 40 30 52" />
        </g>
      </svg>
    )
  }
  if (type === 'school') {
    // 치어 떼 (작은 물고기 여러 마리) — 오른쪽을 향함
    const one = 'M16 6 Q11 1 4 5 L0 1 L2 6 L0 11 L4 7 Q11 11 16 6 Z'
    return (
      <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid meet">
        <path d={one} transform="translate(2 4) scale(1)" />
        <path d={one} transform="translate(24 0) scale(1.1)" />
        <path d={one} transform="translate(18 20) scale(0.85)" />
        <path d={one} transform="translate(40 14) scale(1)" />
      </svg>
    )
  }
  // fish (기본) — 오른쪽(머리)을 향함
  return (
    <svg viewBox="0 0 64 34" preserveAspectRatio="xMidYMid meet">
      <path d="M58 17 Q42 3 20 11 Q10 5 4 3 Q9 13 4 31 Q10 29 20 23 Q42 31 58 17 Z" />
    </svg>
  )
}

// 자율 유영 개체 (spd = %/s). swims=true면 진행 방향을 바라봄, false(해파리)는 부유
const CREATURES = [
  { type: 'fish', size: 62, op: 0.22, blur: 0.5, spd: 9 },
  { type: 'school', size: 54, op: 0.16, blur: 1, spd: 11 },
  { type: 'jelly', size: 38, op: 0.18, blur: 0.6, spd: 3 },
  { type: 'fish', size: 48, op: 0.19, blur: 0.7, spd: 8 },
  { type: 'fish', size: 42, op: 0.14, blur: 1.2, spd: 7 },
  { type: 'school', size: 46, op: 0.13, blur: 1.3, spd: 10 },
  { type: 'fish', size: 34, op: 0.12, blur: 1.5, spd: 6 },
  { type: 'jelly', size: 30, op: 0.14, blur: 1, spd: 2.5 },
  { type: 'fish', size: 40, op: 0.13, blur: 1.1, spd: 8 },
]

const rand = (a, b) => a + Math.random() * (b - a)

function MarineLife() {
  const elsRef = useRef([])
  const stateRef = useRef(null)
  if (!stateRef.current) {
    stateRef.current = CREATURES.map((c) => ({
      ...c,
      x: rand(8, 92),
      y: rand(12, 88),
      heading: rand(0, Math.PI * 2),
      turn: rand(-0.5, 0.5),
      phase: rand(0, Math.PI * 2),
      swims: c.type !== 'jelly',
    }))
  }

  useEffect(() => {
    let raf
    let last = null
    const loop = (t) => {
      if (last == null) last = t
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05 // 탭 비활성 등으로 큰 점프 방지
      const arr = stateRef.current
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i]
        // 자아: 방향을 서서히 무작위로 틀며 배회
        c.turn += rand(-1, 1) * 1.8 * dt
        c.turn = Math.max(-0.9, Math.min(0.9, c.turn))
        c.heading += c.turn * dt * (c.swims ? 1.2 : 0.5)
        const vx = Math.cos(c.heading)
        const vy = Math.sin(c.heading)
        c.x += vx * c.spd * dt
        c.y += vy * c.spd * dt * (c.swims ? 1 : 0.6)
        // 가장자리에서 방향 전환(반사)
        if (c.x < 5 && vx < 0) (c.heading = Math.PI - c.heading), (c.turn *= -0.4)
        if (c.x > 95 && vx > 0) (c.heading = Math.PI - c.heading), (c.turn *= -0.4)
        if (c.y < 8 && vy < 0) (c.heading = -c.heading), (c.turn *= -0.4)
        if (c.y > 92 && vy > 0) (c.heading = -c.heading), (c.turn *= -0.4)
        c.x = Math.max(5, Math.min(95, c.x))
        c.y = Math.max(8, Math.min(92, c.y))

        const el = elsRef.current[i]
        if (!el) continue
        let tf = 'translate(-50%, -50%)'
        if (c.swims) {
          const deg = (c.heading * 180) / Math.PI
          const flipY = Math.cos(c.heading) < 0 ? -1 : 1 // 좌향 시 상하 뒤집어 배가 아래로
          tf += ` rotate(${deg}deg) scale(1, ${flipY})`
        } else {
          c.phase += dt * 2
          tf += ` translateY(${Math.sin(c.phase) * 2.5}px)`
        }
        el.style.left = c.x + '%'
        el.style.top = c.y + '%'
        el.style.transform = tf
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="videofeed__life" aria-hidden="true">
      {stateRef.current.map((c, i) => (
        <div
          key={i}
          ref={(el) => (elsRef.current[i] = el)}
          className="videofeed__creature"
          style={{ width: `${c.size}px`, opacity: c.op, filter: `blur(${c.blur}px)` }}
        >
          <CreatureSVG type={c.type} />
        </div>
      ))}
    </div>
  )
}

/* 전진/후진 광학 흐름 — 추력을 넣으면 소실점에서 방사상으로 흐르는 부유물(마린스노우)
   전진: 중심→바깥으로 뻗어 지나감(앞으로 나아가는 느낌) · 후진: 바깥→중심으로 수렴 */
const FLOW_N = 24
const FLOW_CX = 50
const FLOW_CY = 44
function MotionFlow() {
  const { state } = useTelemetry()
  const driveRef = useRef(0)
  driveRef.current = (state.thrusterL + state.thrusterR) / 2
  const elsRef = useRef([])
  const psRef = useRef(null)
  if (!psRef.current) {
    psRef.current = Array.from({ length: FLOW_N }, () => ({
      x: rand(0, 100),
      y: rand(0, 100),
      r: rand(0.7, 1.5),
    }))
  }

  useEffect(() => {
    let raf
    let last = null
    const respawnCenter = (p) => {
      p.x = FLOW_CX + rand(-10, 10)
      p.y = FLOW_CY + rand(-8, 8)
    }
    const respawnEdge = (p) => {
      const a = rand(0, Math.PI * 2)
      p.x = FLOW_CX + Math.cos(a) * 78
      p.y = FLOW_CY + Math.sin(a) * 64
    }
    const loop = (t) => {
      if (last == null) last = t
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05
      const drive = driveRef.current
      const mag = Math.abs(drive)
      const arr = psRef.current
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i]
        const dx = p.x - FLOW_CX
        const dy = p.y - FLOW_CY
        const dist = Math.hypot(dx, dy) || 0.01
        // 원근: 바깥일수록 빠르게 흐름
        const speed = drive * 48 * (0.28 + dist / 46) * p.r
        p.x += (dx / dist) * speed * dt
        p.y += (dy / dist) * speed * dt
        const off = p.x < -8 || p.x > 108 || p.y < -8 || p.y > 108
        if (drive > 0) {
          if (off || dist > 80) respawnCenter(p)
        } else if (drive < 0) {
          if (dist < 5) respawnEdge(p)
          else if (off) respawnEdge(p)
        }
        const el = elsRef.current[i]
        if (!el) continue
        if (mag < 0.02) {
          el.style.opacity = '0'
          continue
        }
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI
        const len = 1 + mag * (1.6 + dist * 0.12)
        el.style.left = p.x + '%'
        el.style.top = p.y + '%'
        el.style.opacity = String(Math.min(0.55, mag * (0.2 + dist / 55)))
        el.style.transform = `translate(-50%, -50%) rotate(${ang}deg) scaleX(${len})`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="videofeed__flow" aria-hidden="true">
      {psRef.current.map((_, i) => (
        <span key={i} ref={(el) => (elsRef.current[i] = el)} className="flowstreak" />
      ))}
    </div>
  )
}

/* 떠다니는 쓰레기 + 추적 박스 — 조류(state.current)를 타고 흐르고
   각 박스가 종류를 라벨링하며 개별 추적. rAF로 부드럽게 이동. */
function DebrisField() {
  const { state } = useTelemetry()
  const curRef = useRef(state.current)
  curRef.current = state.current
  // 전진/후진 추력 → 영상이 앞으로 나아가는 느낌(양수=전진)
  const driveRef = useRef(0)
  driveRef.current = (state.thrusterL + state.thrusterR) / 2
  const elsRef = useRef([])
  const objsRef = useRef([])
  const tagsRef = useRef([])
  const stRef = useRef(null)
  if (!stRef.current) {
    stRef.current = DEBRIS_INIT.map((d) => ({
      ...d,
      x: rand(8, 92),
      y: rand(10, 90),
      rot: rand(-25, 25),
      rotSpd: rand(-10, 10), // 느린 회전(뒤척임)
      phase: rand(0, Math.PI * 2),
      dirOff: rand(-0.5, 0.5), // 물살 대비 개별 방향차
      spdMul: rand(0.7, 1.3), // 개별 속도차
      confBase: 0.82 + Math.random() * 0.15,
    }))
  }

  useEffect(() => {
    let raf
    let last = null
    const loop = (t) => {
      if (last == null) last = t
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05
      const cur = curRef.current
      const baseAng = (cur.dir * Math.PI) / 180
      const spd = 2.4 + cur.speed * 3 // 물살 세기
      const arr = stRef.current
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i]
        c.phase += dt * 0.7
        // 물살을 타되 개별 방향차 + 완만한 방향 흔들림(자연스러운 배회)
        c.dirOff += rand(-1, 1) * 0.35 * dt
        c.dirOff = Math.max(-0.7, Math.min(0.7, c.dirOff))
        const a = baseAng + c.dirOff
        const sp = spd * c.spdMul
        c.x += (Math.sin(a) * sp + Math.sin(c.phase) * 0.8) * dt
        c.y += (-Math.cos(a) * sp + Math.cos(c.phase * 0.8) * 0.8) * dt
        // 전진 추력 → 소실점(중심)에서 방사상으로 흘러 지나감(전진 주행감)
        const drive = driveRef.current
        if (drive) {
          const dx = c.x - 50
          const dy = c.y - 44
          const dist = Math.hypot(dx, dy) || 0.01
          const fs = drive * 20 * (0.3 + dist / 50)
          c.x += (dx / dist) * fs * dt
          c.y += (dy / dist) * fs * dt
        }
        // 완전히 화면 밖으로 나간 뒤에만 반대편에서 재진입(순간이동 방지)
        if (c.x < WRAP_LO) c.x = WRAP_HI
        else if (c.x > WRAP_HI) c.x = WRAP_LO
        if (c.y < WRAP_LO) c.y = WRAP_HI
        else if (c.y > WRAP_HI) c.y = WRAP_LO
        c.rot += c.rotSpd * dt

        const el = elsRef.current[i]
        if (!el) continue
        el.style.left = c.x + '%'
        el.style.top = c.y + '%'
        const obj = objsRef.current[i]
        if (obj) obj.style.transform = `rotate(${c.rot}deg)`
        const tag = tagsRef.current[i]
        if (tag) tag.textContent = `${KIND_LABEL[c.kind]} ${(c.confBase + Math.sin(c.phase * 1.6) * 0.03).toFixed(2)}`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      {stRef.current.map((c, i) => (
        <div
          key={i}
          ref={(el) => (elsRef.current[i] = el)}
          className="videofeed__track"
          style={{ width: `${c.bw}px`, height: `${c.bw * KIND_ASPECT[c.kind]}px`, transform: 'translate(-50%, -50%)' }}
        >
          <span ref={(el) => (tagsRef.current[i] = el)} className="videofeed__bbox-tag num">
            {KIND_LABEL[c.kind]}
          </span>
          <span ref={(el) => (objsRef.current[i] = el)} className="videofeed__obj">
            <DebrisShape kind={c.kind} />
          </span>
        </div>
      ))}
    </>
  )
}

/* 가상 카메라 피드 (RGB / 열화상)
   - AI 바운딩 박스: state.detections를 픽셀단위(%) 실시간 오버레이
   - 디헤이징: 탁도 보정 필터로 시인성 확보
   실제 연동 시 WebRTC <video>로 교체. */
export default function VideoFeed({ compact = false, thermal: thermalProp, showChips = true, zoom = 1, hideBoxes = false }) {
  const { state, toggleDehaze } = useTelemetry()
  const [thermalState, setThermalState] = useState(false)
  // thermalProp이 주어지면 제어(외부), 아니면 내부 상태 사용
  const controlled = thermalProp !== undefined
  const thermal = controlled ? thermalProp : thermalState
  const dehaze = state.dehaze

  // 디헤이징 파이프라인: 탁도 비례 보정 (탁도↑ → 보정 강도↑)
  const clarity = Math.min(1, Math.max(0, (state.turbidity - 15) / 45))
  const sceneFilter = dehaze
    ? `contrast(${1 + clarity * 0.35}) brightness(${1 + clarity * 0.14}) saturate(${1 + clarity * 0.4})`
    : 'none'

  return (
    <div className={`videofeed ${thermal ? 'videofeed--thermal' : ''}`}>
      {/* 가상 수중 장면 */}
      <div className="videofeed__scene" style={{ filter: sceneFilter }}>
        <div className="videofeed__caustics" />
        {/* 물 속 해저 지형 */}
        <Seabed />
        {!dehaze && <div className="videofeed__haze" style={{ opacity: 0.25 + clarity * 0.4 }} />}
        <div className="videofeed__particle p1" />
        <div className="videofeed__particle p2" />
        <div className="videofeed__particle p3" />
        {/* 지나다니는 해양생물 그림자 */}
        <MarineLife />
        {/* 전진/후진 광학 흐름(추력 반응) */}
        <MotionFlow />
      </div>

      {/* 떠다니는 쓰레기 (+ 추적 박스, hideBoxes면 실루엣만) — 배율에 따라 축소/확대 */}
      <div className={`videofeed__dets ${hideBoxes ? 'is-nobox' : ''}`} style={{ transform: `scale(${zoom})` }}>
        <DebrisField />
      </div>

      {/* HUD 오버레이 (제어 배경에선 숨김 — 상단 바와 겹침 방지) */}
      {showChips && (
        <div className="videofeed__hud">
          <span className="videofeed__rec">
            <b className="dot" /> LIVE
          </span>
        </div>
      )}

      {/* 하단 컨트롤: 카메라 모드 (제어 배경에선 숨김) */}
      {showChips && (
        <div className="videofeed__ctl">
          <button className="videofeed__chip" onClick={() => setThermalState((v) => !v)}>
            <i className={`ti ${thermal ? 'ti-flame' : 'ti-camera'}`} />
            {thermal ? '열화상' : 'RGB'}
          </button>
        </div>
      )}

      {!compact && (
        <div className="videofeed__meta num">
          <span><i className="ti ti-temperature" /> {state.waterTemp.toFixed(1)}℃</span>
          <span><i className="ti ti-droplet" /> {Math.round(state.turbidity)} NTU</span>
        </div>
      )}
    </div>
  )
}
