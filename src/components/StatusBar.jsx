import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 지연 임계값 헬퍼 — 제어 화면도 재사용
   150ms↓ 원활(초록) / ~300ms 주의(오렌지) / 300ms↑ 지연(레드) */
export function latencyLevel(ms) {
  if (ms <= 150) return { level: 'good', color: 'var(--success)', label: '원활' }
  if (ms <= 300) return { level: 'warn', color: 'var(--orange-500)', label: '주의' }
  return { level: 'bad', color: 'var(--danger)', label: '지연' }
}

function batteryIcon(pct, charging) {
  if (charging) return 'ti-battery-charging'
  if (pct <= 12) return 'ti-battery-1'
  if (pct <= 40) return 'ti-battery-2'
  if (pct <= 75) return 'ti-battery-3'
  return 'ti-battery-4'
}

export default function StatusBar({ dark = false }) {
  const { state } = useTelemetry()
  const lat = latencyLevel(state.latency)
  const conn = state.connection

  const connMeta = {
    online: { icon: 'ti-wifi', color: 'var(--success)', label: '연결됨' },
    weak: { icon: 'ti-wifi-2', color: 'var(--orange-500)', label: '약함' },
    lost: { icon: 'ti-wifi-off', color: 'var(--danger)', label: '두절' },
  }[conn]

  const batLow = state.battery <= 20

  return (
    <div className={`statusbar ${dark ? 'statusbar--dark' : ''}`}>
      <div className="statusbar__brand">
        <span className="statusbar__mark" aria-hidden="true" />
        <div className="statusbar__brand-text">
          <span className="statusbar__logo num">ARK<b>·</b>FLUID</span>
          <span className="statusbar__unit">NET MODULE Ver.A</span>
        </div>
      </div>

      <div className="statusbar__stats">
        <span className="chip" style={{ color: connMeta.color }} title={`통신 ${connMeta.label}`}>
          <i className={`ti ${connMeta.icon}`} />
          <span className="num">{Math.round(state.signal)}%</span>
        </span>

        <span className="chip" style={{ color: lat.color }} title={`지연 ${lat.label}`}>
          <i className="ti ti-activity-heartbeat" />
          <span className="num">{Math.round(state.latency)}ms</span>
        </span>

        <span className="chip" style={{ color: batLow ? 'var(--danger)' : dark ? 'var(--text-invert)' : 'var(--text)' }} title="배터리">
          <i className={`ti ${batteryIcon(state.battery, state.charging)}`} />
          <span className="num">{Math.round(state.battery)}%</span>
        </span>
      </div>
    </div>
  )
}
