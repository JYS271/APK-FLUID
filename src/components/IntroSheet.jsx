import { useState } from 'react'

/* ARK-FLUID 프로젝트 소개 시트 — 대시보드 스타일 카드 레이아웃.
   상단 히어로 이미지는 public/intro-hero.png 를 사용하며,
   파일이 없으면 브랜드 배너로 자동 대체된다. */
const HERO_SRC = import.meta.env.BASE_URL + 'intro-hero.png'

function MantaMark() {
  return (
    <svg className="intro__manta" viewBox="0 0 200 140" aria-hidden="true">
      <defs>
        <linearGradient id="introRay" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fd7ff" />
          <stop offset="0.5" stopColor="#2a7fd4" />
          <stop offset="1" stopColor="#0b2f5e" />
        </linearGradient>
      </defs>
      <path
        d="M100 12 C128 12 150 24 176 52 C190 67 198 78 198 86 C198 92 190 92 182 88 C168 81 150 74 138 74 C142 92 140 112 128 128 C122 136 116 132 114 122 C111 108 106 96 100 90 C94 96 89 108 86 122 C84 132 78 136 72 128 C60 112 58 92 62 74 C50 74 32 81 18 88 C10 92 2 92 2 86 C2 78 10 67 24 52 C50 24 72 12 100 12 Z"
        fill="url(#introRay)"
      />
      <circle cx="86" cy="46" r="5" fill="#eaf7ff" />
      <circle cx="114" cy="46" r="5" fill="#eaf7ff" />
    </svg>
  )
}

export default function IntroSheet({ open, onClose }) {
  const [loaded, setLoaded] = useState(false)

  if (!open) return null

  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label="ARK-FLUID 소개">
      <div className="intro__bar">
        <button className="intro__back" onClick={onClose}>
          <i className="ti ti-chevron-left" /> 대시보드
        </button>
        <span className="intro__bar-title">프로젝트 소개</span>
      </div>

      <div className="intro__scroll">
        {/* 히어로 이미지 (없으면 브랜드 배너로 대체) */}
        <div className="intro__hero">
          <img
            className="intro__hero-img"
            src={HERO_SRC}
            alt="ARK-FLUID"
            style={{ opacity: loaded ? 1 : 0 }}
            onLoad={() => setLoaded(true)}
          />
          {!loaded && (
            <div className="intro__hero-fallback">
              <MantaMark />
              <b className="num">ARK·FLUID</b>
              <span>모듈형 해양 정화 수중 로봇</span>
            </div>
          )}
        </div>

        <div className="intro__content">
          <header className="intro__head">
            <p className="intro__eyebrow">PROJECT</p>
            <h1 className="intro__title">AI 기반 모듈형 해양 정화 로봇</h1>
            <p className="intro__lead">
              매년 증가하는 해양 쓰레기는 해양 생태계에 심각한 피해를 주고 있습니다. ARK-FLUID는 탐사부터
              수거까지 자동화해 더 빠르고 효율적인 정화를 실현합니다.
            </p>
          </header>

          {/* 기존 방식의 한계 */}
          <section className="card intro__card">
            <div className="card__title-row">
              <h2 className="card__title">
                <i className="ti ti-alert-triangle" /> 기존 해양 정화 방식의 한계
              </h2>
            </div>
            <ul className="intro__list intro__list--warn">
              <li>
                <i className="ti ti-map-pin-off" />
                오염원의 위치를 사전에 파악하기 어렵습니다.
              </li>
              <li>
                <i className="ti ti-replace" />
                작업 환경에 따라 그물망·펜스 등 회수 장비를 직접 교체해야 합니다.
              </li>
              <li>
                <i className="ti ti-trending-down" />
                그 결과 작업 효율이 낮습니다.
              </li>
            </ul>
          </section>

          {/* ARK-FLUID의 해결 방식 */}
          <section className="card intro__card">
            <div className="card__title-row">
              <h2 className="card__title">
                <i className="ti ti-bulb" /> ARK-FLUID의 해결 방식
              </h2>
            </div>
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
            <p className="intro__closing">
              <i className="ti ti-sparkles" /> 보다 효율적인 해양 정화 작업을 수행합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
