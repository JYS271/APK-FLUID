import { useRef, useState, useCallback } from 'react'

/* 포인터 기반 가상 조이스틱 → onChange({x, y}) with x,y ∈ [-1,1]
   축 잠금: axis="vertical"이면 상하(추진)만, "full"이면 자유. */
export default function Joystick({ label, icon, axis = 'full', onChange }) {
  const baseRef = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const activeRef = useRef(false)

  const update = useCallback(
    (clientX, clientY) => {
      const el = baseRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const rad = r.width / 2
      let dx = (clientX - cx) / rad
      let dy = (clientY - cy) / rad
      if (axis === 'vertical') dx = 0
      // 원 안으로 클램프
      const mag = Math.hypot(dx, dy)
      if (mag > 1) {
        dx /= mag
        dy /= mag
      }
      setPos({ x: dx, y: dy })
      // y는 위가 +1(전진)이 되도록 부호 반전
      onChange?.({ x: +dx.toFixed(3), y: +(-dy).toFixed(3) })
    },
    [axis, onChange]
  )

  const end = useCallback(() => {
    activeRef.current = false
    setPos({ x: 0, y: 0 })
    onChange?.({ x: 0, y: 0 })
  }, [onChange])

  const onPointerDown = (e) => {
    activeRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    update(e.clientX, e.clientY)
    if (navigator.vibrate) navigator.vibrate(8)
  }
  const onPointerMove = (e) => {
    if (!activeRef.current) return
    update(e.clientX, e.clientY)
  }

  const knobStyle = {
    transform: `translate(${pos.x * 38}px, ${pos.y * 38}px)`,
  }

  return (
    <div className="joystick">
      <div
        ref={baseRef}
        className="joystick__base"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="joystick__ring" />
        {axis === 'vertical' && <div className="joystick__axis-hint" />}
        <div className="joystick__knob" style={knobStyle}>
          <i className={`ti ${icon}`} />
        </div>
      </div>
      <span className="joystick__label">{label}</span>
    </div>
  )
}
