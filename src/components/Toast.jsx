import { useEffect } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 전역 토스트 — state.toast 구독 */
export default function Toast() {
  const { state, clearToast } = useTelemetry()
  const toast = state.toast

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(clearToast, 3200)
    return () => clearTimeout(id)
  }, [toast?.id, clearToast])

  if (!toast) return null

  const icon = {
    success: 'ti-circle-check',
    warning: 'ti-alert-triangle',
    danger: 'ti-alert-octagon',
    info: 'ti-info-circle',
  }[toast.kind || 'info']

  return (
    <div className={`toast toast--${toast.kind || 'info'}`} role="status" key={toast.id}>
      <i className={`ti ${icon}`} />
      <span>{toast.text}</span>
    </div>
  )
}
