import { useTelemetry, ENV_MODES } from '../state/TelemetryContext.jsx'

/* 운용 환경 전환 (항만/하천/저수지/연안)
   dark=true → 제어(딥네이비) 레이어용 스타일. */
export default function EnvSelector({ dark = false, compact = false }) {
  const { state, setEnvironment } = useTelemetry()
  return (
    <div className={`envsel ${dark ? 'envsel--dark' : ''} ${compact ? 'envsel--compact' : ''}`} role="tablist" aria-label="운용 환경">
      {ENV_MODES.map((m) => (
        <button
          key={m.key}
          role="tab"
          aria-selected={state.environment === m.key}
          className={`envsel__btn ${state.environment === m.key ? 'is-on' : ''}`}
          onClick={() => setEnvironment(m.key)}
          title={m.desc}
        >
          <i className={`ti ${m.icon}`} />
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  )
}
