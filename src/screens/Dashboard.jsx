import { useTelemetry } from '../state/TelemetryContext.jsx'
import { latencyLevel } from '../components/StatusBar.jsx'
import MarineMap from '../components/MarineMap.jsx'
import VideoFeed from '../components/VideoFeed.jsx'
import NetGauge from '../components/NetGauge.jsx'
import EnvOverlay from '../components/EnvOverlay.jsx'
import EnvSelector from '../components/EnvSelector.jsx'

// 실시간 원격 접속 링크 (첨부 파일)
const REMOTE_URL = encodeURI(
  'file:///C:/Users/VISION/Documents/카카오톡 받은 파일/3/index.html'
)

/* 대시보드(Monitor) — 상태바·지도·영상·요약·빠른작업 */
export default function Dashboard({ onControl, onOpenWeb }) {
  const { state, returnHome } = useTelemetry()
  const lat = latencyLevel(state.latency)
  const laggy = state.latency > 300

  const modeLabel = state.returning
    ? '기지 복귀 · 배출'
    : {
        patrol: '자동 순찰',
        manual: '수동 조종',
        hold: '정지 대기',
        estop: '긴급 정지',
      }[state.mode]

  return (
    <div className="screen dash">
      {/* 지연 경고 배너 */}
      {laggy && (
        <div className="banner banner--danger swim-in">
          <i className="ti ti-alert-triangle" />
          통신 지연 {Math.round(state.latency)}ms — 원격 제어 주의
        </div>
      )}

      <header className="dash__head swim-in">
        <div>
          <p className="dash__eyebrow">현재 임무</p>
          <h1 className="dash__title">
            {modeLabel}
            <span className={`dot-badge dot-badge--${state.mode === 'estop' ? 'danger' : state.mode === 'hold' ? 'warn' : 'ok'}`} />
          </h1>
        </div>
        <div className="dash__speed num">
          <b>{state.speed.toFixed(1)}</b>
          <span>knot</span>
        </div>
      </header>

      {/* 운용 환경 전환 */}
      <EnvSelector />

      {/* 지도 카드 */}
      <section className="card card--map swim-in" style={{ animationDelay: '.04s' }}>
        <div className="card__map-wrap">
          <MarineMap />
          <EnvOverlay />
          {state.avoiding && (
            <div className="oa-badge">
              <i className="ti ti-alert-triangle" /> 장애물 회피 기동
            </div>
          )}
          <button className="card__map-fs" onClick={onControl} aria-label="제어로 전환">
            <i className="ti ti-arrows-maximize" />
          </button>
        </div>
        <div className="card__map-foot">
          <span><i className="ti ti-compass" /> <b className="num">{Math.round(state.heading)}°</b></span>
          <span><i className="ti ti-ripple" /> 수심 <b className="num">{state.depth.toFixed(1)}m</b></span>
          <span style={{ color: lat.color }}><i className="ti ti-activity" /> {lat.label}</span>
        </div>
      </section>

      {/* 영상 + 게이지 그리드 */}
      <div className="dash__grid">
        <section className="card card--video swim-in" style={{ animationDelay: '.08s' }}>
          <div className="card__title-row">
            <h2 className="card__title"><i className="ti ti-video" /> 실시간 영상</h2>
          </div>
          <VideoFeed compact />
        </section>

        <section className="card card--gauge swim-in" style={{ animationDelay: '.12s' }}>
          <NetGauge value={state.netLoad} label="수거함 적재" size={150} warn={(50 / state.netCapacityKg) * 100} />
          <p className="card--gauge__sub num">
            {Math.round((state.netLoad / 100) * state.netCapacityKg)}kg / {state.netCapacityKg}kg
          </p>
        </section>
      </div>

      {/* 요약 스탯 */}
      <section className="statgrid swim-in" style={{ animationDelay: '.16s' }}>
        <Stat icon="ti-trash" label="오늘 수거" value={state.collectedToday} unit="개" accent />
        <Stat icon="ti-temperature" label="수온" value={state.waterTemp.toFixed(1)} unit="℃" />
        <Stat icon="ti-droplet" label="탁도" value={Math.round(state.turbidity)} unit="NTU" />
        <Stat icon="ti-clock" label="가동" value={formatTime(state.missionTime)} unit="" />
      </section>

      {/* 배터리 카드 */}
      <BatteryCard battery={state.battery} charging={state.charging} />

      {/* 빠른 작업 */}
      <section className="quick swim-in" style={{ animationDelay: '.2s' }}>
        <h2 className="section-title">빠른 작업</h2>
        <div className="quick__row quick__row--2">
          <button className="quick__btn" onClick={returnHome}>
            <i className="ti ti-home-move" />
            기지 복귀 · 배출
          </button>
          <button className="quick__btn" onClick={() => onOpenWeb('report')}>
            <i className="ti ti-file-analytics" />
            상세 리포트
          </button>
        </div>
        {/* 화면당 Primary 오렌지 CTA 1개 — 실시간 원격 접속 링크(첨부) */}
        <a className="cta" href={REMOTE_URL} target="_blank" rel="noopener noreferrer">
          <i className="ti ti-info-circle" />
          ARK-FLUID 더 알아보기
          <i className="ti ti-external-link cta__ext" />
        </a>
      </section>
    </div>
  )
}

function Stat({ icon, label, value, unit, accent }) {
  return (
    <div className={`stat ${accent ? 'stat--accent' : ''}`}>
      <i className={`ti ${icon}`} />
      <div className="stat__body">
        <span className="stat__value num">
          {value}
          {unit && <em>{unit}</em>}
        </span>
        <span className="stat__label">{label}</span>
      </div>
    </div>
  )
}

function BatteryCard({ battery, charging }) {
  const pct = Math.round(battery)
  const low = pct <= 30 // 30% 미만 → 주황 경고
  const critical = pct <= 12
  const color = charging ? 'var(--success)' : critical ? 'var(--danger)' : low ? 'var(--warning)' : 'var(--success)'
  const icon = charging
    ? 'ti-battery-charging'
    : pct <= 15
    ? 'ti-battery-1'
    : pct <= 30
    ? 'ti-battery-2'
    : pct <= 70
    ? 'ti-battery-3'
    : 'ti-battery-4'
  // 예상 운용 시간 (완충 ≈ 6시간 기준)
  const runMin = Math.round((battery / 100) * 6 * 60)
  const rh = Math.floor(runMin / 60)
  const rm = runMin % 60
  const statusText = charging
    ? '충전 중'
    : critical
    ? '배터리 위험'
    : low
    ? '배터리 부족 · 기지 복귀'
    : '정상'

  return (
    <section className="card card--battery swim-in" style={{ animationDelay: '.18s' }}>
      <div className="battery__head">
        <span className="battery__title">
          <i className={`ti ${icon}`} style={{ color }} /> 배터리
        </span>
        <span className="battery__pct num" style={{ color }}>
          {pct}
          <em>%</em>
        </span>
      </div>
      <div className="battery__bar">
        <span
          className={`battery__fill ${critical ? 'is-low' : ''}`}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="battery__meta">
        <span className="battery__status" style={{ color }}>
          <i className="ti ti-circle-filled" /> {statusText}
        </span>
        <span className="battery__run num">
          {charging ? '—' : `약 ${rh}시간 ${String(rm).padStart(2, '0')}분`} 운용 가능
        </span>
      </div>
    </section>
  )
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
