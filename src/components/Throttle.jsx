import { useRef, useState, useCallback, useEffect } from 'react'

/* 세로 스로틀 레버 — 위=전진 / 아래=후진, 중앙=중립.
   손을 떼도 위치 유지(순항). onChange(thrust) with thrust ∈ [-1,1].
   중앙 근처(±8%)는 중립 디텐트로 스냅.
   resetKey 변경 시 중립으로 리셋(E-STOP 등). */
export default function Throttle({ label = '추력', onChange, resetKey, axis = 'y' }) {
  const trackRef = useRef(null)
  const [val, setVal] = useState(0) // -1..1
  const activeRef = useRef(false)

  useEffect(() => {
    setVal(0)
    onChange?.(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const update = useCallback(
    (clientX, clientY) => {
      const r = trackRef.current.getBoundingClientRect()
      let v
      if (axis === 'x') {
        // 가로(90° 회전) 모드: 오른쪽=전진(+1) ~ 왼쪽=후진(-1)
        const rel = (clientX - r.left) / r.width
        v = rel * 2 - 1
      } else {
        const rel = (clientY - r.top) / r.height // 0(위) ~ 1(아래)
        v = 1 - rel * 2 // 위=+1, 중앙=0, 아래=-1
      }
      v = Math.max(-1, Math.min(1, v))
      if (Math.abs(v) < 0.08) v = 0 // 중립 디텐트
      setVal(v)
      onChange?.(+v.toFixed(3))
    },
    [onChange, axis]
  )

  const onPointerDown = (e) => {
    activeRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 합성 이벤트 등에서 무시 */
    }
    update(e.clientX, e.clientY)
    if (navigator.vibrate) navigator.vibrate(8)
  }
  const onPointerMove = (e) => {
    if (!activeRef.current) return
    update(e.clientX, e.clientY)
  }
  const end = () => {
    activeRef.current = false // 위치 유지(스냅백 없음)
  }

  const toNeutral = () => {
    setVal(0)
    onChange?.(0)
    if (navigator.vibrate) navigator.vibrate(12)
  }

  // 노브 위치: v=1 → 0%(위), v=0 → 50%, v=-1 → 100%(아래)
  const topPct = ((1 - val) / 2) * 100
  const pct = Math.round(val * 100)
  const fwd = val >= 0

  return (
    <div className="throttle">
      <div
        ref={trackRef}
        className="throttle__track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {/* 눈금 */}
        <span className="throttle__tick t-top">전진</span>
        <span className="throttle__tick t-mid">N</span>
        <span className="throttle__tick t-bot">후진</span>

        {/* 채움 바 (중앙 기준) */}
        <div
          className={`throttle__fill ${fwd ? 'is-fwd' : 'is-rev'}`}
          style={
            fwd
              ? { top: `${topPct}%`, bottom: '50%' }
              : { top: '50%', bottom: `${100 - topPct}%` }
          }
        />

        {/* 노브 */}
        <div className="throttle__knob" style={{ top: `${topPct}%` }} onDoubleClick={toNeutral}>
          <i className="ti ti-grip-horizontal" />
        </div>
      </div>
      <span className="throttle__label">
        {label}
        <em className="num">{pct === 0 ? '중립' : `${fwd ? '전' : '후'} ${Math.abs(pct)}%`}</em>
      </span>
    </div>
  )
}
