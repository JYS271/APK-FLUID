/* 인앱 브라우저(WebView) 모달 시뮬레이션
   반드시 .device 직속(App.jsx 최상위)에서 렌더 → inset:0 오버레이. */
export default function WebBridge({ open, url, title, onClose }) {
  if (!open) return null

  return (
    <div className="webbridge" role="dialog" aria-modal="true">
      <div className="webbridge__bar">
        <button className="webbridge__close" onClick={onClose} aria-label="닫기">
          <i className="ti ti-chevron-down" />
        </button>
        <div className="webbridge__addr num">
          <i className="ti ti-lock" />
          {url}
        </div>
        <button className="webbridge__more" aria-label="더보기">
          <i className="ti ti-dots" />
        </button>
      </div>

      <div className="webbridge__body">
        <div className="webbridge__hero">
          <i className="ti ti-world-share" />
          <h3>{title}</h3>
          <p>SHECO · ARK-C 원격 관제 포털</p>
        </div>

        <div className="webbridge__doc">
          <p>이 화면은 인앱 브라우저(WebView) 시뮬레이션입니다. 실제 배포 시 로봇 서버의 상세 리포트·펌웨어 업데이트·매뉴얼 페이지를 여기에 로드합니다.</p>
          <ul>
            <li><i className="ti ti-file-analytics" /> 일일 운용 리포트 (PDF)</li>
            <li><i className="ti ti-refresh" /> 펌웨어 OTA 업데이트</li>
            <li><i className="ti ti-book" /> NET MODULE Ver.A 매뉴얼</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
