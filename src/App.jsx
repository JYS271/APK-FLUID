import { useState, useCallback } from 'react'
import { useTelemetry } from './state/TelemetryContext.jsx'
import StatusBar from './components/StatusBar.jsx'
import TabBar from './components/TabBar.jsx'
import Toast from './components/Toast.jsx'
import WebBridge from './components/WebBridge.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Control from './screens/Control.jsx'
import Records from './screens/Records.jsx'

/* 앱 셸: 탭 전환 + 제어 모드 + 웹모달 + 토스트
   모달/오버레이는 반드시 .device 직속에서 렌더. */
export default function App() {
  const [tab, setTab] = useState('dashboard') // dashboard | records
  const [control, setControl] = useState(false)
  const [web, setWeb] = useState(null) // { url, title } | null
  const { state } = useTelemetry()

  const openControl = useCallback(() => setControl(true), [])
  const exitControl = useCallback(() => setControl(false), [])

  const openWeb = useCallback((key) => {
    const map = {
      report: { url: 'portal.sheco.io/ark/report', title: '일일 운용 리포트' },
    }
    setWeb(map[key] || map.report)
  }, [])

  return (
    <div className="device-frame">
      <div className="device">
        {/* 제어 모드: 딥 레이어가 전체를 덮음 */}
        {control ? (
          <Control onExit={exitControl} />
        ) : (
          <>
            <StatusBar />
            {tab === 'dashboard' && <Dashboard onControl={openControl} onOpenWeb={openWeb} />}
            {tab === 'records' && <Records onOpenWeb={openWeb} />}
            <TabBar tab={tab} onTab={setTab} onControl={openControl} />
          </>
        )}

        {/* 전역 오버레이 — .device 직속 */}
        <Toast />
        <WebBridge
          open={!!web}
          url={web?.url}
          title={web?.title}
          onClose={() => setWeb(null)}
        />

        {/* 통신두절/저배터리 등 시스템 상태 표시(제어 중에도) */}
        {state.connection === 'lost' && (
          <div className="sysbanner">
            <i className="ti ti-wifi-off" /> 통신 두절 — Fail-safe 정지 중
          </div>
        )}
      </div>
    </div>
  )
}
