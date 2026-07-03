import { useState, useRef } from 'react'

/* ARK-C 프로젝트 소개 시트 — 대시보드 스타일 카드 레이아웃.
   상단은 미디어 캐러셀(영상 → 사진, 좌우 스와이프).
   미디어는 public/ 의 intro-video.mp4 · intro-collect.png 를 사용. */
const BASE = import.meta.env.BASE_URL
const MEDIA = [
  { key: 'video', type: 'video', src: BASE + 'intro-video.mp4', cap: '실제 수거 시연 영상' },
  {
    key: 'collect',
    type: 'image',
    src: BASE + 'intro-collect.png',
    alt: '회수 모듈과 미니 수중 드론의 동시 운용',
    cap: '회수 모듈 · 미니 수중 드론 동시 운용',
  },
]
const LAST = MEDIA.length - 1

/* 상단 미디어 캐러셀 — 좌우 스와이프(세로 스크롤과 방향 구분) */
function IntroMedia() {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(0)
  const wrapRef = useRef(null)
  const st = useRef({ x: 0, y: 0, decided: 0 }) // decided: 0 미정 / 1 가로 / -1 세로

  const onDown = (e) => {
    st.current = { x: e.clientX, y: e.clientY, decided: 0 }
  }
  const onMove = (e) => {
    const s = st.current
    if (s.decided === -1) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (s.decided === 0) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      if (Math.abs(dy) > Math.abs(dx)) {
        s.decided = -1
        return
      }
      s.decided = 1
      setDragging(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }
    let d = dx
    if ((index === 0 && d > 0) || (index === LAST && d < 0)) d *= 0.3
    dragRef.current = d
    setDrag(d)
  }
  const onUp = () => {
    const s = st.current
    if (s.decided === 1) {
      const w = wrapRef.current ? wrapRef.current.clientWidth : 320
      const threshold = Math.min(70, w * 0.22)
      const d = dragRef.current
      let next = index
      if (d <= -threshold) next = Math.min(LAST, index + 1)
      else if (d >= threshold) next = Math.max(0, index - 1)
      if (next !== index) {
        setIndex(next)
        if (navigator.vibrate) navigator.vibrate(8)
      }
    }
    st.current.decided = 0
    dragRef.current = 0
    setDragging(false)
    setDrag(0)
  }

  return (
    <div className="introcar">
      <div
        className="introcar__view"
        ref={wrapRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      >
        <div
          className={`introcar__track ${dragging ? 'is-drag' : ''}`}
          style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}
        >
          {MEDIA.map((m) => (
            <div className="introcar__slide" key={m.key}>
              {m.type === 'video' ? (
                <video
                  className="introcar__media"
                  src={m.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              ) : (
                <img className="introcar__media" src={m.src} alt={m.alt} draggable={false} />
              )}
              <span className="introcar__cap">
                <i className={`ti ${m.type === 'video' ? 'ti-player-play-filled' : 'ti-photo'}`} />
                {m.cap}
              </span>
            </div>
          ))}
        </div>

        {index === 0 && (
          <span className="introcar__hint">
            밀어서 보기 <i className="ti ti-chevron-right" />
          </span>
        )}
      </div>

      <div className="introcar__dots">
        {MEDIA.map((m, i) => (
          <button
            key={m.key}
            className={`introcar__dot ${i === index ? 'is-on' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={m.cap}
          />
        ))}
      </div>
    </div>
  )
}

export default function IntroSheet({ open, onClose }) {
  if (!open) return null

  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label="ARK-C 소개">
      <div className="intro__bar">
        <button className="intro__back" onClick={onClose}>
          <i className="ti ti-chevron-left" /> 대시보드
        </button>
        <span className="intro__bar-title">프로젝트 소개</span>
      </div>

      <div className="intro__scroll">
        <div className="intro__content">
          {/* 미디어 캐러셀 (영상 → 사진) */}
          <IntroMedia />

          {/* 헤더 */}
          <header className="intro__head">
            <p className="intro__eyebrow">PROJECT · ARK-C</p>
            <h1 className="intro__title">AI 기반 모듈형 해양 정화 로봇</h1>
            <p className="intro__lead">
              매년 늘어나는 해양 쓰레기는 생태계에 심각한 피해를 줍니다. ARK-C는 탐사부터 수거까지
              전 과정을 자동화해 더 빠르고 효율적인 정화를 실현합니다.
            </p>
          </header>

          {/* 기존 방식의 한계 */}
          <section className="card intro__card">
            <h2 className="intro__card-title">
              <i className="ti ti-alert-triangle" /> 기존 해양 정화 방식의 한계
            </h2>
            <ul className="intro__list">
              <li>
                <i className="ti ti-map-pin-off" />
                <span>오염원의 위치를 사전에 파악하기 어렵습니다.</span>
              </li>
              <li>
                <i className="ti ti-replace" />
                <span>작업 환경에 따라 그물망·펜스 등 회수 장비를 직접 교체해야 합니다.</span>
              </li>
              <li>
                <i className="ti ti-trending-down" />
                <span>그 결과 작업 효율이 낮습니다.</span>
              </li>
            </ul>
          </section>

          {/* ARK-C의 해결 방식 */}
          <section className="card intro__card">
            <h2 className="intro__card-title">
              <i className="ti ti-bulb" /> ARK-C의 해결 방식
            </h2>
            <ol className="intro__steps">
              <li>
                <span className="intro__step-no num">1</span>
                <div>
                  <b>해저 탐사</b>
                  <span>탈부착형 미니 수중 드론이 먼저 해저를 탐사합니다.</span>
                </div>
              </li>
              <li>
                <span className="intro__step-no num">2</span>
                <div>
                  <b>AI 경로 생성</b>
                  <span>AI가 데이터를 분석해 최적의 수거 경로를 생성합니다.</span>
                </div>
              </li>
              <li>
                <span className="intro__step-no num">3</span>
                <div>
                  <b>회수 모듈 자동 전개</b>
                  <span>오염물의 종류에 따라 회수 모듈을 자동으로 전개합니다.</span>
                </div>
              </li>
            </ol>
          </section>

          <p className="intro__closing">
            <i className="ti ti-sparkles" /> 보다 효율적인 해양 정화 작업을 수행합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
