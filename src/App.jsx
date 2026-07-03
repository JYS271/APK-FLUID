import { useState, useCallback } from 'react'
import StatusBar from './components/StatusBar.jsx'
import TabBar from './components/TabBar.jsx'
import Toast from './components/Toast.jsx'
import AlarmCenter from './components/AlarmCenter.jsx'
import WebBridge from './components/WebBridge.jsx'
import IntroSheet from './components/IntroSheet.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Control from './screens/Control.jsx'
import DroneFPV from './screens/DroneFPV.jsx'
import Records from './screens/Records.jsx'

/* 앱 셸: 탭 전환 + 제어 모드 + 웹모달 + 토스트
   모달/오버레이는 반드시 .device 직속에서 렌더. */
export default function App() {
  const [tab, setTab] = useState('dashboard') // dashboard | records
  const [control, setControl] = useState(false)
  const [droneMode, setDroneMode] = useState(false) // 미니 수중 드론 FPV 모드
  const [web, setWeb] = useState(null) // { url, title } | null
  const [intro, setIntro] = useState(false)

  const openControl = useCallback(() => setControl(true), [])
  const exitControl = useCallback(() => setControl(false), [])
  const openDrone = useCallback(() => setDroneMode(true), [])
  const exitDrone = useCallback(() => setDroneMode(false), [])

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
            {tab === 'dashboard' && (
              <Dashboard
                onControl={openControl}
                onDroneMode={openDrone}
                onOpenWeb={openWeb}
                onOpenIntro={() => setIntro(true)}
              />
            )}
            {tab === 'records' && <Records onOpenWeb={openWeb} />}
            <TabBar tab={tab} onTab={setTab} onControl={openControl} />
          </>
        )}

        {/* 미니 수중 드론 FPV 모드 — 전용 조종 화면(최상위 오버레이) */}
        {droneMode && <DroneFPV onExit={exitDrone} />}

        {/* 전역 오버레이 — .device 직속 */}
        <AlarmCenter />
        <IntroSheet open={intro} onClose={() => setIntro(false)} />
        <Toast />
        <WebBridge
          open={!!web}
          url={web?.url}
          title={web?.title}
          onClose={() => setWeb(null)}
        />
      </div>
    </div>
  )
}
