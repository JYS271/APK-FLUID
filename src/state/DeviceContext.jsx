import { createContext, useContext, useState, useCallback } from 'react'

/* ============================================================
   기기(디바이스) 상태 — 연동된 기기 목록 · 현재 선택 기기 · 연동 모달 상태
   앱 전역에서 공유(상태바 스위처 · 연동 모달 · 대시보드).
   실제 서버 연동 시: SEED/addDevice를 디바이스 레지스트리 API로 교체.
   ============================================================ */

// 고유 번호 형식: 영문 대문자·숫자 6자리
const CODE_RE = /^[A-Z0-9]{6}$/

const SEED = [
  { id: '7F3A21', unit: 'NET MODULE Ver.A', site: '부산항 1구역' },
  { id: 'B2D904', unit: 'NET MODULE Ver.B', site: '광안리 연안' },
]

const DeviceContext = createContext(null)

export function DeviceProvider({ children }) {
  const [devices, setDevices] = useState(SEED)
  const [currentId, setCurrentId] = useState(SEED[0].id)
  const [pairOpen, setPairOpen] = useState(false)

  const currentDevice = devices.find((d) => d.id === currentId) || devices[0]

  const selectDevice = useCallback((id) => {
    setCurrentId(id)
    if (navigator.vibrate) navigator.vibrate(6)
  }, [])

  const openPair = useCallback(() => setPairOpen(true), [])
  const closePair = useCallback(() => setPairOpen(false), [])

  // 고유 번호 형식 검사 (동기, 즉시 피드백용)
  const validateCode = useCallback(
    (raw) => {
      const code = String(raw || '').trim().toUpperCase()
      if (!code) return { code, error: '고유 번호를 입력해 주세요.' }
      if (!CODE_RE.test(code)) return { code, error: '고유 번호는 영문·숫자 6자리예요. (예: 7F3A21)' }
      if (devices.some((d) => d.id === code)) return { code, error: '이미 연동된 기기예요.' }
      return { code, error: null }
    },
    [devices]
  )

  // 기기 추가 + 자동 전환 (성공 시 새 기기로 제어 대상 전환)
  const addDevice = useCallback(
    (raw) => {
      const { code, error } = validateCode(raw)
      if (error) return { ok: false, error }
      const device = { id: code, unit: `NET MODULE · ${code}`, site: '신규 연동' }
      setDevices((prev) => [...prev, device])
      setCurrentId(code)
      return { ok: true, device }
    },
    [validateCode]
  )

  const value = {
    devices,
    currentDevice,
    currentId,
    selectDevice,
    pairOpen,
    openPair,
    closePair,
    validateCode,
    addDevice,
  }
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}

export function useDevices() {
  const ctx = useContext(DeviceContext)
  if (!ctx) throw new Error('useDevices must be used within DeviceProvider')
  return ctx
}
