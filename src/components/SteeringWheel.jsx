import { useRef, useState, useCallback } from 'react'

/* 운전대 — 돌려서 조향. onChange(turn) with turn ∈ [-1,1]
   놓으면 중앙(직진)으로 스프링 복귀. */
export default function SteeringWheel({ label = '조향', onChange, maxAngle = 135 }) {
  const ref = useRef(null)
  const [angle, setAngle] = useState(0)
  const [dragging, setDragging] = useState(false)
  const grab = useRef({ pointer: 0, angle: 0 })
  const activeRef = useRef(false)

  const centerAngle = useCallback((x, y) => {
    const r = ref.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    return (Math.atan2(y - cy, x - cx) * 180) / Math.PI
  }, [])

  const onPointerDown = (e) => {
    activeRef.current = true
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 합성 이벤트 등에서 무시 */
    }
    grab.current = { pointer: centerAngle(e.clientX, e.clientY), angle }
    if (navigator.vibrate) navigator.vibrate(8)
  }

  const onPointerMove = (e) => {
    if (!activeRef.current) return
    const pa = centerAngle(e.clientX, e.clientY)
    // 각도 wrap 보정 → [-180,180]
    const delta = ((pa - grab.current.pointer + 540) % 360) - 180
    let next = grab.current.angle + delta
    next = Math.max(-maxAngle, Math.min(maxAngle, next))
    setAngle(next)
    onChange?.(+(next / maxAngle).toFixed(3))
  }

  const end = () => {
    if (!activeRef.current) return
    activeRef.current = false
    setDragging(false)
    setAngle(0) // 중앙 복귀
    onChange?.(0)
  }

  const turnPct = Math.round((angle / maxAngle) * 100)

  return (
    <div className="wheel">
      <div
        ref={ref}
        className={`wheel__base ${dragging ? 'is-drag' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <svg viewBox="0 0 100 100" className="wheel__svg">
          {/* 외륜 */}
          <circle cx="50" cy="50" r="46" className="wheel__rim" />
          <circle cx="50" cy="50" r="46" className="wheel__rim-glow" />
          {/* 상단 마커(12시) */}
          <rect x="47.5" y="4" width="5" height="10" rx="2.5" className="wheel__mark" />
          {/* 스포크 */}
          <rect x="46" y="34" width="8" height="32" rx="4" className="wheel__spoke" />
          <rect x="20" y="46" width="30" height="8" rx="4" className="wheel__spoke" />
          <rect x="50" y="46" width="30" height="8" rx="4" className="wheel__spoke" />
          {/* 허브 */}
          <circle cx="50" cy="50" r="12" className="wheel__hub" />
          <circle cx="50" cy="50" r="4.5" className="wheel__hub-dot" />
        </svg>
      </div>
      <span className="wheel__label">
        {label}
        <em className="num">{turnPct === 0 ? '직진' : `${turnPct > 0 ? '우' : '좌'} ${Math.abs(turnPct)}%`}</em>
      </span>
    </div>
  )
}
