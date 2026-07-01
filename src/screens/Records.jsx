import { BarChart, DonutChart, Legend } from '../components/Charts.jsx'
import {
  weeklyCollection,
  debrisTypes,
  badges,
  history,
  kpi,
} from '../data/analytics.js'

/* 기록(Analyze) — KPI·히트맵·차트·배지·이력 */
export default function Records({ onOpenWeb }) {
  return (
    <div className="screen records">
      <header className="records__head swim-in">
        <p className="dash__eyebrow">운용 기록</p>
        <h1 className="dash__title">수거 성과 분석</h1>
      </header>

      {/* KPI 카드 */}
      <section className="kpigrid swim-in" style={{ animationDelay: '.04s' }}>
        <Kpi icon="ti-trash" label="오늘 수거" value={kpi.todayKg} unit="kg" accent />
        <Kpi icon="ti-calendar-stats" label="주간 누적" value={kpi.weekKg} unit="kg" />
        <Kpi icon="ti-target-arrow" label="수거 효율" value={kpi.efficiency} unit="%" />
        <Kpi icon="ti-plug-connected" label="가동률" value={kpi.uptime} unit="%" />
      </section>

      {/* 주간 차트 */}
      <section className="card swim-in" style={{ animationDelay: '.08s' }}>
        <div className="card__title-row">
          <h2 className="card__title"><i className="ti ti-chart-bar" /> 주간 수거량</h2>
          <span className="card__sub num">kg / 일</span>
        </div>
        <BarChart data={weeklyCollection} />
      </section>

      {/* 종류 분포 도넛 */}
      <section className="card swim-in" style={{ animationDelay: '.12s' }}>
        <div className="card__title-row">
          <h2 className="card__title"><i className="ti ti-recycle" /> 쓰레기 종류</h2>
        </div>
        <div className="card__donut-row">
          <DonutChart data={debrisTypes} />
          <Legend data={debrisTypes} />
        </div>
      </section>

      {/* 배지 */}
      <section className="card swim-in" style={{ animationDelay: '.16s' }}>
        <div className="card__title-row">
          <h2 className="card__title"><i className="ti ti-award" /> 운용 배지</h2>
        </div>
        <div className="badges">
          {badges.map((b, i) => (
            <div key={i} className={`badge ${b.done ? 'badge--done' : 'badge--todo'}`}>
              <i className={`ti ${b.icon}`} />
              <span>{b.label}</span>
              {b.done && <i className="ti ti-check badge__check" />}
            </div>
          ))}
        </div>
      </section>

      {/* 이력 타임라인 */}
      <section className="card swim-in" style={{ animationDelay: '.2s' }}>
        <div className="card__title-row">
          <h2 className="card__title"><i className="ti ti-timeline" /> 최근 이력</h2>
        </div>
        <ul className="timeline">
          {history.map((h, i) => (
            <li key={i} className={`timeline__item timeline__item--${h.tone}`}>
              <span className="timeline__time num">{h.time}</span>
              <span className="timeline__dot" />
              <span className="timeline__text">{h.text}</span>
            </li>
          ))}
        </ul>
        <button className="records__more" onClick={() => onOpenWeb('report')}>
          전체 리포트 보기 <i className="ti ti-external-link" />
        </button>
      </section>
    </div>
  )
}

function Kpi({ icon, label, value, unit, accent }) {
  return (
    <div className={`kpi ${accent ? 'kpi--accent' : ''}`}>
      <i className={`ti ${icon}`} />
      <span className="kpi__value num">
        {value}
        <em>{unit}</em>
      </span>
      <span className="kpi__label">{label}</span>
    </div>
  )
}
