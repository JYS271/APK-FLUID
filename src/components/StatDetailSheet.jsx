import { useEffect } from 'react'
import { useTelemetry, ENV_MODES } from '../state/TelemetryContext.jsx'

/* 대시보드 통계 상세 시트 — 오늘 수거/수온/탁도/가동 버튼을 누르면 하단에서 올라오는 상세 정보. */

const META = {
  collected: { icon: 'ti-trash', title: '오늘 수거', accent: true },
  turbidity: { icon: 'ti-droplet', title: '탁도' },
  temp: { icon: 'ti-temperature', title: '수온' },
  uptime: { icon: 'ti-clock', title: '가동 시간' },
}

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}시간 ${String(m).padStart(2, '0')}분`
    : `${m}분 ${String(sec).padStart(2, '0')}초`
}

function buildDetail(key, state) {
  const env = ENV_MODES.find((m) => m.key === state.environment) || ENV_MODES[0]
  if (key === 'collected') {
    const n = state.collectedToday
    const kg = Math.round((state.netLoad / 100) * state.netCapacityKg)
    const ratios = [
      ['페트병', 0.38],
      ['캔', 0.24],
      ['유리병', 0.21],
      ['종이컵', 0.17],
    ]
    return {
      value: `${n}`,
      unit: '개',
      rows: [
        ['수거함 적재', `${kg}kg / ${state.netCapacityKg}kg`],
        ...ratios.map(([label, r]) => [label, `${Math.round(n * r)}개`]),
      ],
      desc: 'AI 비전이 종류별로 분류·수거한 오늘의 누적 실적입니다.',
    }
  }
  if (key === 'turbidity') {
    const t = Math.round(state.turbidity)
    const grade = t < 25 ? '맑음' : t < 45 ? '보통' : '탁함'
    return {
      value: `${t}`,
      unit: 'NTU',
      rows: [
        ['수질 등급', grade],
        ['디헤이징', state.dehaze ? 'ON · 시야 보정 중' : 'OFF'],
        ['운용 환경', env.label],
      ],
      desc: '탁도가 높을수록 시야 확보를 위해 디헤이징 보정 강도가 자동으로 올라갑니다.',
    }
  }
  if (key === 'temp') {
    const inRange = Math.abs(state.waterTemp - env.temp) < 2
    return {
      value: state.waterTemp.toFixed(1),
      unit: '℃',
      rows: [
        ['운용 환경', env.label],
        ['환경 기준 수온', `${env.temp.toFixed(1)}℃`],
        ['상태', inRange ? '정상' : '기준 대비 편차'],
      ],
      desc: '환경별 기준 수온을 바탕으로 실시간 측정된 수온입니다.',
    }
  }
  // uptime
  const runMin = Math.round((state.battery / 100) * 6 * 60)
  const modeLabel = state.returning
    ? '기지 복귀 · 배출'
    : { patrol: '자동 순찰', manual: '수동 조종', hold: '정지 대기', estop: '긴급 정지' }[state.mode]
  return {
    value: fmtTime(state.missionTime),
    unit: '',
    rows: [
      ['현재 임무', modeLabel],
      ['현재 속도', `${state.speed.toFixed(1)} knot`],
      ['예상 잔여 운용', `약 ${Math.floor(runMin / 60)}시간 ${String(runMin % 60).padStart(2, '0')}분`],
    ],
    desc: '이번 세션 동안 누적된 가동 시간입니다.',
  }
}

export default function StatDetailSheet({ statKey, onClose }) {
  const { state } = useTelemetry()

  useEffect(() => {
    if (!statKey) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [statKey, onClose])

  if (!statKey) return null
  const meta = META[statKey]
  const d = buildDetail(statKey, state)

  return (
    <>
      <div className="statsheet-scrim" onClick={onClose} />
      <div className="statsheet" role="dialog" aria-modal="true" aria-label={`${meta.title} 상세`}>
        <span className="statsheet__grab" />
        <div className="statsheet__head">
          <span className={`statsheet__ic ${meta.accent ? 'is-accent' : ''}`}>
            <i className={`ti ${meta.icon}`} />
          </span>
          <b className="statsheet__title">{meta.title}</b>
          <button className="statsheet__close" onClick={onClose} aria-label="닫기">
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="statsheet__hero num">
          {d.value}
          {d.unit && <em>{d.unit}</em>}
        </div>

        <div className="statsheet__rows">
          {d.rows.map(([label, value]) => (
            <div className="statsheet__row" key={label}>
              <span>{label}</span>
              <b className="num">{value}</b>
            </div>
          ))}
        </div>

        <p className="statsheet__desc">{d.desc}</p>
      </div>
    </>
  )
}
