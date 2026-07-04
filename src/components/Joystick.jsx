import { useRef } from 'react'

/* 공용 가상 조이스틱 — 드론 FPV 모드의 조이스틱 디자인/동작을 그대로 사용.
   onChange(x, y): x=좌우, y=상하 (각 -1..1), 놓으면 중앙 복귀.
   props:
     rotated  : 90° 회전 스테이지(가로 모드) 안에서 쓸 때 좌표 보정
     disabled : 잠금(자동 모드 등) — dim + 입력 차단
     axis     : 'both' | 'x'(좌우만·조향) | 'y'(상하만)
     label    : 하단 라벨 텍스트
     icon     : 노브 아이콘 (기본 ti-arrows-move) */
const R = 42

// 스테이지 rotate(90deg) → 화면좌표 델타를 로컬 좌표로 변환. 미회전이면 그대로.
function toLocal(sdx, sdy, rotated) {
  return rotated ? { lx: sdy, ly: -sdx } : { lx: sdx, ly: sdy }
}

export default function Joystick({
  onChange,
  rotated = false,
  disabled = false,
  axis = 'both',
  label,
  icon = 'ti-arrows-move',
}) {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const activeRef = useRef(false)

  const setKnob = (lx, ly) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${lx}px, ${ly}px)`
  }
  const handle = (e) => {
    if (!activeRef.current) return
    const r = baseRef.current.getBoundingClientRect()
    const sdx = e.clientX - (r.left + r.width / 2)
    const sdy = e.clientY - (r.top + r.height / 2)
    let { lx, ly } = toLocal(sdx, sdy, rotated)
    if (axis === 'x') ly = 0
    else if (axis === 'y') lx = 0
    const mag = Math.hypot(lx, ly)
    if (mag > R) {
      lx = (lx / mag) * R
      ly = (ly / mag) * R
    }
    setKnob(lx, ly)
    onChange(+(lx / R).toFixed(3), +(ly / R).toFixed(3))
  }
  const down = (e) => {
    if (disabled) return
    activeRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    handle(e)
    if (navigator.vibrate) navigator.vibrate(6)
  }
  const up = () => {
    if (!activeRef.current) return
    activeRef.current = false
    setKnob(0, 0)
    onChange(0, 0)
  }

  return (
    <div className="joystick">
      <div
        className={`dfpv-joybase ${disabled ? 'is-locked' : ''}`}
        ref={baseRef}
        onPointerDown={down}
        onPointerMove={handle}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
      >
        <span className="dfpv-joyring" />
        <span className="dfpv-joyknob" ref={knobRef}>
          <i className={`ti ${disabled ? 'ti-robot' : icon}`} />
        </span>
      </div>
      {label && <span className="joystick__label">{label}</span>}
    </div>
  )
}
