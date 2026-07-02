# ARK-FLUID · 관제 앱

SHECO의 만타레이(가오리) 기반 모듈형 해양 쓰레기 수거 로봇 **NET MODULE Ver.A**를
모니터링·제어·분석하는 **모바일 관제 앱 프로토타입**입니다.
실제 로봇 서버 없이 **가상 텔레메트리 시뮬레이션**으로 UI/UX 전체 흐름을 구현한 데모입니다.

**🔗 라이브 데모:** https://jys271.github.io/APK-FLUID/

> AI Creative Challenge 팀 과제 프로토타입. `main` 브랜치 푸시 시 GitHub Pages로 자동 배포됩니다.

## 화면 (3-Tab)

| 화면 | 내용 |
|---|---|
| **대시보드** | 상태바 · 해양 지도(부채꼴 센서 FOV) · 실시간 영상 · 곡선 게이지 · 요약 · 빠른작업 |
| **제어** | 몰입형 딥네이비 HUD · 운전대(선회) + 세로 스로틀(추력) · 길게 눌러 확정하는 E-STOP |
| **기록** | KPI · 주간/종류 차트(SVG) · 배지 · 이력 타임라인 |

## 기술 스택

- **React 18 + Vite 5**, JavaScript(JSX)
- 상태관리: React Context + `useReducer` (외부 라이브러리 없음)
- 차트/게이지: 라이브러리 없이 **SVG 직접 구현**
- 폰트: Pretendard · 아이콘: Tabler Icons (CDN)

## 실행

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 → http://localhost:5173
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

모바일 화면 비율(최대 430px)에 최적화되어 있으며, 데스크톱에서는 폰 프레임 안에 렌더됩니다.

## 시뮬레이션 엔진

`src/state/TelemetryContext.jsx`가 앱의 심장입니다. 600ms마다 `TICK`으로 배터리 소모,
수거함 적재, 경로 이동, 지연 변동을 계산합니다. 조이스틱/운전대 입력은 차동 추진
(differential thrust)으로 방위·위치에 반영되고, E-STOP·통신두절 시 자동 Fail-safe 정지합니다.

실제 로봇 연동 시 `TICK` 리듀서를 WebSocket/MQTT 구독으로, `VideoFeed`를 WebRTC로,
지도의 0~100 정규화 좌표를 실제 GPS 좌표계로 매핑하면 컴포넌트 계층을 그대로 재사용할 수 있습니다.
