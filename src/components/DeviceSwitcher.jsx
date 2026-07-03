import { useState, useRef, useEffect } from 'react'
import { useDevices } from '../state/DeviceContext.jsx'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 기기 전환 드롭다운 — ARK·C 로고 옆 ▼.
   누르면 컨텍스트 메뉴처럼 아래로 펼쳐져 등록된 기기 목록 표시.
   기기 선택 시 제어 대상 전환, 하단 '기기 연동하기'로 연동 모달 오픈. */
export default function DeviceSwitcher() {
  const { devices, currentDevice, currentId, selectDevice, openPair } = useDevices()
  const { toast } = useTelemetry()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const pick = (d) => {
    if (d.id !== currentId) {
      selectDevice(d.id)
      toast(`ARK-C · ${d.id}(으)로 전환`, 'info')
    }
    setOpen(false)
  }

  return (
    <div className="devsw" ref={ref}>
      <button
        className={`devsw__trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="devsw__row">
          <span className="statusbar__logo num">
            ARK<b>·</b>C
          </span>
          <i className="ti ti-chevron-down devsw__chev" />
        </span>
        <span className="statusbar__unit">{currentDevice.unit}</span>
      </button>

      {open && (
        <div className="devsw__menu" role="listbox">
          <p className="devsw__menu-title">연동된 기기</p>
          {devices.map((d) => (
            <button
              key={d.id}
              role="option"
              aria-selected={d.id === currentId}
              className={`devsw__item ${d.id === currentId ? 'is-current' : ''}`}
              onClick={() => pick(d)}
            >
              <span className="devsw__dot" />
              <span className="devsw__item-text">
                <b>
                  ARK-C <span className="num">· {d.id}</span>
                </b>
                <em>
                  {d.site} · {d.unit}
                </em>
              </span>
              {d.id === currentId && <i className="ti ti-check devsw__check" />}
            </button>
          ))}
          <div className="devsw__divider" />
          <button
            className="devsw__pair"
            onClick={() => {
              openPair()
              setOpen(false)
            }}
          >
            <i className="ti ti-plus" /> 기기 연동하기
          </button>
        </div>
      )}
    </div>
  )
}
