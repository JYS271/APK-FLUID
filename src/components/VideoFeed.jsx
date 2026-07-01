import { useState } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 가상 카메라 피드 (RGB / 열화상)
   실제 연동 시 WebRTC <video>로 교체. */
export default function VideoFeed({ compact = false }) {
  const { state } = useTelemetry()
  const [thermal, setThermal] = useState(false)

  return (
    <div className={`videofeed ${thermal ? 'videofeed--thermal' : ''}`}>
      {/* 가상 수중 장면 (CSS 그라디언트 레이어) */}
      <div className="videofeed__scene">
        <div className="videofeed__caustics" />
        <div className="videofeed__particle p1" />
        <div className="videofeed__particle p2" />
        <div className="videofeed__particle p3" />
        {/* 감지 바운딩 박스 */}
        <div className="videofeed__bbox b1">
          <span>플라스틱 0.94</span>
        </div>
        <div className="videofeed__bbox b2">
          <span>어망 0.81</span>
        </div>
      </div>

      {/* HUD 오버레이 */}
      <div className="videofeed__hud">
        <span className="videofeed__rec">
          <i className="ti ti-point-filled" style={{ display: 'none' }} />
          <b className="dot" /> LIVE
        </span>
        <span className="num videofeed__depth">
          <i className="ti ti-arrow-down" /> {state.depth.toFixed(1)}m
        </span>
      </div>

      {/* 모드 토글 */}
      <button className="videofeed__toggle" onClick={() => setThermal((v) => !v)}>
        <i className={`ti ${thermal ? 'ti-flame' : 'ti-camera'}`} />
        {thermal ? '열화상' : 'RGB'}
      </button>

      {!compact && (
        <div className="videofeed__meta num">
          <span><i className="ti ti-temperature" /> {state.waterTemp.toFixed(1)}℃</span>
          <span><i className="ti ti-droplet" /> {Math.round(state.turbidity)} NTU</span>
        </div>
      )}
    </div>
  )
}
