import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { TelemetryProvider } from './state/TelemetryContext.jsx'
import { DeviceProvider } from './state/DeviceContext.jsx'
import './index.css'
import './app.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TelemetryProvider>
      <DeviceProvider>
        <App />
      </DeviceProvider>
    </TelemetryProvider>
  </React.StrictMode>
)

// PWA 서비스 워커 등록 (설치·오프라인 지원)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
