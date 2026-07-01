/* 하단 탭 + 중앙 오렌지 제어 FAB */
export default function TabBar({ tab, onTab, onControl }) {
  const tabs = [
    { key: 'dashboard', icon: 'ti-layout-dashboard', label: '대시보드' },
    { key: 'records', icon: 'ti-chart-histogram', label: '기록' },
  ]

  return (
    <nav className="tabbar">
      <button
        className={`tabbar__item ${tab === 'dashboard' ? 'is-active' : ''}`}
        onClick={() => onTab('dashboard')}
      >
        <i className="ti ti-layout-dashboard" />
        <span>대시보드</span>
      </button>

      {/* 중앙 제어 FAB */}
      <button className="tabbar__fab" onClick={onControl} aria-label="제어 모드">
        <i className="ti ti-steering-wheel" />
        <span>제어</span>
      </button>

      <button
        className={`tabbar__item ${tab === 'records' ? 'is-active' : ''}`}
        onClick={() => onTab('records')}
      >
        <i className="ti ti-chart-histogram" />
        <span>기록</span>
      </button>
    </nav>
  )
}
