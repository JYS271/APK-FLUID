import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 해양 환경 모니터링 — 지도 레이어 상단 '투명 오버레이 카드'
   조류(속도/방향) · 수온 · 탁도. 로봇 위치와 동일 타임스탬프(state.ts) 공유. */
export default function EnvOverlay() {
  const { state } = useTelemetry()
  const cur = state.current

  // 동기화 타임스탬프 (HH:MM:SS) — pos·env 공통 s.ts
  const clock = state.ts
    ? new Date(state.ts).toLocaleTimeString('ko-KR', { hour12: false })
    : '--:--:--'

  return (
    <div className="envoverlay">
      <div className="envcard">
        <span className="envcard__ico" style={{ transform: `rotate(${cur.dir}deg)` }}>
          <i className="ti ti-arrow-up" />
        </span>
        <div className="envcard__body">
          <span className="envcard__val num">{cur.speed.toFixed(2)}<em>kn</em></span>
          <span className="envcard__lbl num">조류 {Math.round(cur.dir)}°</span>
        </div>
      </div>

      <div className="envcard">
        <span className="envcard__ico"><i className="ti ti-temperature" /></span>
        <div className="envcard__body">
          <span className="envcard__val num">{state.waterTemp.toFixed(1)}<em>℃</em></span>
          <span className="envcard__lbl">수온</span>
        </div>
      </div>

      <div className="envcard">
        <span className="envcard__ico"><i className="ti ti-droplet" /></span>
        <div className="envcard__body">
          <span className="envcard__val num">{Math.round(state.turbidity)}<em>NTU</em></span>
          <span className="envcard__lbl">탁도</span>
        </div>
      </div>

      {/* 동기화 타임스탬프 배지 */}
      <div className="envstamp num" title="위치·환경 동일 타임스탬프 (공통 데이터 동기화)">
        <i className="ti ti-clock-bolt" /> {clock}
      </div>
    </div>
  )
}
