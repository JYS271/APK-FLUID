import { useState, useEffect, useRef } from 'react'
import { useDevices } from '../state/DeviceContext.jsx'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 기기 연동 모달 — 고유 번호 입력 → 검증 → 연동.
   형식 오류는 즉시 인라인 표시, 유효하면 짧은 연동 시뮬레이션 후 성공 토스트. */
export default function DevicePairModal() {
  const { pairOpen, closePair, validateCode, addDevice } = useDevices()
  const { toast } = useTelemetry()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const timerRef = useRef(0)

  useEffect(() => {
    if (pairOpen) {
      setCode('')
      setError('')
      setBusy(false)
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
    return () => clearTimeout(timerRef.current)
  }, [pairOpen])

  if (!pairOpen) return null

  const submit = (e) => {
    e.preventDefault()
    if (busy) return
    // 즉시 형식/중복 검증
    const { error: err } = validateCode(code)
    if (err) {
      setError(err)
      return
    }
    // 유효 → 연동 시뮬레이션(0.8s) 후 추가
    setError('')
    setBusy(true)
    timerRef.current = setTimeout(() => {
      const res = addDevice(code)
      if (res.ok) {
        toast(`ARK-C · ${res.device.id} 기기 연동 완료`, 'success')
        closePair()
      } else {
        setError(res.error)
        setBusy(false)
      }
    }, 800)
  }

  return (
    <div className="modal-scrim" onClick={busy ? undefined : closePair}>
      <div
        className="pairmodal"
        role="dialog"
        aria-modal="true"
        aria-label="기기 연동"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pairmodal__head">
          <span className="pairmodal__ic">
            <i className="ti ti-router" />
          </span>
          <div className="pairmodal__head-text">
            <b>기기 연동하기</b>
            <span>기기 고유 번호를 입력해 연결하세요</span>
          </div>
          <button className="pairmodal__x" onClick={closePair} disabled={busy} aria-label="닫기">
            <i className="ti ti-x" />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="pairmodal__label" htmlFor="dev-code">
            고유 번호
          </label>
          <input
            id="dev-code"
            ref={inputRef}
            className={`pairmodal__input num ${error ? 'is-error' : ''}`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              if (error) setError('')
            }}
            placeholder="예: 7F3A21"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
          {error && (
            <p className="pairmodal__err">
              <i className="ti ti-alert-circle" /> {error}
            </p>
          )}
          <p className="pairmodal__hint">기기 하단 라벨의 6자리 코드를 입력하세요.</p>

          <button type="submit" className="pairmodal__submit" disabled={busy}>
            {busy ? (
              <>
                <i className="ti ti-loader-2 spin" /> 연동 중…
              </>
            ) : (
              <>
                <i className="ti ti-link" /> 연동하기
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
