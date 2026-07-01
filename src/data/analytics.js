/* ============================================================
   기록(Analyze) 화면용 정적 목업 데이터
   ============================================================ */

// 주간 수거량 (kg)
export const weeklyCollection = [
  { label: '월', value: 42 },
  { label: '화', value: 58 },
  { label: '수', value: 51 },
  { label: '목', value: 73 },
  { label: '금', value: 66 },
  { label: '토', value: 88 },
  { label: '일', value: 61 },
]

// 구역별 수거 비중
export const zoneBreakdown = [
  { label: 'A구역 (북안)', value: 34, color: 'var(--orange-500)' },
  { label: 'B구역 (중앙)', value: 28, color: 'var(--navy-600)' },
  { label: 'C구역 (남만)', value: 22, color: 'var(--navy-400, #3f6299)' },
  { label: 'D구역 (외해)', value: 16, color: 'var(--navy-300)' },
]

// 쓰레기 종류 분포
export const debrisTypes = [
  { label: '플라스틱', value: 47, color: 'var(--orange-500)' },
  { label: '어망/로프', value: 21, color: 'var(--navy-600)' },
  { label: '스티로폼', value: 18, color: 'var(--navy-500)' },
  { label: '기타', value: 14, color: 'var(--navy-300)' },
]

// 운용 배지(성과)
export const badges = [
  { icon: 'ti-recycle', label: '누적 1톤 돌파', done: true },
  { icon: 'ti-route', label: '순찰 100회', done: true },
  { icon: 'ti-battery-charging', label: '무충전 8시간', done: true },
  { icon: 'ti-shield-check', label: '무사고 30일', done: false },
]

// 최근 이력
export const history = [
  { time: '14:22', kind: 'collect', text: 'B구역 순찰 수거 완료 · 6.4kg', tone: 'success' },
  { time: '13:48', kind: 'net', text: '수거함 배출 (기지 도킹)', tone: 'info' },
  { time: '13:05', kind: 'warning', text: '탁도 상승 감지 (58 NTU)', tone: 'warning' },
  { time: '12:30', kind: 'route', text: 'A→B구역 경로 전환', tone: 'info' },
  { time: '11:52', kind: 'collect', text: 'A구역 밀집 구역 수거 · 9.1kg', tone: 'success' },
  { time: '11:10', kind: 'estop', text: '수동 긴급정지 → 해제', tone: 'danger' },
]

// KPI 요약
export const kpi = {
  todayKg: 24.6,
  weekKg: 439,
  efficiency: 92, // %
  uptime: 98, // %
}
