import { useState, useEffect } from 'react'

/* ============================================================
   실제 iPhone UI 크롬 — Dynamic Island · 시스템 상태바 · 홈 인디케이터
   ------------------------------------------------------------
   - IOSStatusBar: Safe Area 상단을 차지하는 시스템 상태바(시간·신호·배터리).
     플로우(플렉스) 자식으로 배치돼 앱 콘텐츠를 자연스럽게 아래로 민다.
   - IPhoneChrome: Dynamic Island(검은 알약) + Home Indicator.
     하드웨어처럼 최상단 z-index로 겹쳐 그린다(콘텐츠는 그 아래에서 시작).
   Safe Area는 env(safe-area-inset-*) 기반 CSS 변수(--safe-top/--safe-bottom)로
   모든 iPhone 모델에 자동 대응. 데스크톱 목업에서는 폴백값이 사용된다.
   ============================================================ */

function fmtClock() {
  const d = new Date()
  let h = d.getHours() % 12
  if (h === 0) h = 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function IOSStatusBar({ dark = false }) {
  const [time, setTime] = useState(fmtClock)
  useEffect(() => {
    const id = setInterval(() => setTime(fmtClock()), 15000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={`ios-status ${dark ? 'ios-status--dark' : ''}`} aria-hidden="true">
      <span className="ios-status__time num">{time}</span>
      <div className="ios-status__icons">
        {/* 셀룰러 신호 */}
        <svg className="ios-ic" viewBox="0 0 18 12" width="17" height="11">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0.5" width="3" height="11.5" rx="0.8" opacity="0.35" />
        </svg>
        {/* Wi-Fi */}
        <svg className="ios-ic" viewBox="0 0 17 13" width="16" height="12">
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 5.2a9 9 0 0 1 13 0" />
            <path d="M4.6 7.9a5.2 5.2 0 0 1 7.8 0" />
          </g>
          <circle cx="8.5" cy="10.6" r="1.4" fill="currentColor" />
        </svg>
        {/* 배터리 */}
        <span className="ios-batt">
          <span className="ios-batt__lvl" />
        </span>
      </div>
    </div>
  )
}

export function IPhoneChrome({ dark = false }) {
  return (
    <>
      <div className="ios-island" aria-hidden="true">
        <span className="ios-island__cam" />
      </div>
      <div className={`ios-home ${dark ? 'ios-home--dark' : ''}`} aria-hidden="true" />
    </>
  )
}
