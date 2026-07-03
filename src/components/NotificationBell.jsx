import { useState } from 'react'
import { useTelemetry } from '../state/TelemetryContext.jsx'

/* 알림 벨 — 상태바 우측. 클릭 시 이전에 울렸던 경보 이력을 드롭다운으로 표시.
   열면 미확인 배지 초기화, '지우기'로 전체 삭제. */
export default function NotificationBell() {
  const { notifications, notifUnread, markNotificationsRead, clearNotifications } = useTelemetry()
  const [open, setOpen] = useState(false)

  const toggle = () => {
    setOpen((o) => {
      const next = !o
      if (next) markNotificationsRead()
      return next
    })
    if (navigator.vibrate) navigator.vibrate(6)
  }

  return (
    <div className="notif">
      <button className={`notif__btn ${open ? 'is-open' : ''}`} onClick={toggle} aria-label="알림" title="알림">
        <i className="ti ti-bell" />
        {notifUnread > 0 && <span className="notif__badge num">{notifUnread > 9 ? '9+' : notifUnread}</span>}
      </button>

      {open && (
        <>
          <div className="notif__scrim" onClick={() => setOpen(false)} />
          <div className="notif__panel" role="dialog" aria-label="알림 이력">
            <div className="notif__head">
              <b>
                <i className="ti ti-bell" /> 알림
              </b>
              {notifications.length > 0 && (
                <button className="notif__clear" onClick={clearNotifications}>
                  지우기
                </button>
              )}
            </div>
            <div className="notif__list">
              {notifications.length === 0 ? (
                <div className="notif__empty">
                  <i className="ti ti-bell-off" />
                  아직 울린 알림이 없습니다
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`notif__item notif__item--${n.sev}`}>
                    <span className="notif__ic">
                      <i className={`ti ${n.icon}`} />
                    </span>
                    <div className="notif__body">
                      <b>{n.title}</b>
                      <span>{n.desc}</span>
                    </div>
                    {n.time && <span className="notif__time num">{n.time}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
