# AGENTS.md

이 문서는 **ARK-FLUID 관제 앱** 저장소에서 작업하는 AI 코딩 에이전트를 위한 가이드입니다.
사람 개발자 온보딩에도 유용합니다. 코드를 수정하기 전에 먼저 읽으세요.

---

## 1. 프로젝트 개요

- **제품:** ARK-FLUID — SHECO의 만타레이(가오리) 기반 모듈형 해양 쓰레기 수거 로봇(NET MODULE Ver.A)
- **이 저장소:** 그 로봇을 모니터링·제어·분석하는 **모바일 관제 앱 프로토타입**
- **성격:** 실제 로봇 서버 없이 **가상 텔레메트리 시뮬레이션**으로 UI/UX 전체 흐름을 구현한 데모
- **범위:** 핵심 3화면 — 대시보드(Monitor) · 제어(Control) · 기록(Analyze) + **미니 수중 드론 FPV** 조종 화면
- **설계 철학:** "엣지 컴퓨팅" — 로봇 온보드에서 연산(항법·탐지·경로계획)을 처리했다고 가정하고,
  시뮬레이션 엔진이 그 **결과값**을 산출한다. 컴포넌트는 **결과 시각화**에만 집중.
- **배포:** GitHub Pages 자동 배포 + **PWA(설치형 앱)**. 라이브: https://jys271.github.io/APK-FLUID/
- **맥락:** 팀 과제(AI Creative Challenge) 프로토타입. 제품명은 `APK`가 아니라 반드시 **`ARK`-FLUID**
  (리포명만 APK-FLUID).

## 2. 실행 · 개발 · 배포

```bash
npm install      # 의존성 설치
npm run dev      # Vite 개발 서버 → http://localhost:5173
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

- 개발 서버는 모바일 화면 비율(최대 430px)로 최적화됨. 데스크톱에서는 폰 프레임 안에 렌더.
- `vite.config.js`: `base: './'`(Pages 서브경로/로컬 파일 호환), `server.port`는 `process.env.PORT` 사용.
- **배포:** `main` 브랜치 푸시 시 `.github/workflows/deploy.yml`이 빌드→GitHub Pages 자동 배포.
  - 첫 시도에서 간헐적으로 `Deployment failed, try again later`가 뜰 수 있음(GitHub 측 일시 오류).
    `gh run rerun <id> --failed`로 재시도하면 성공. **코드 문제 아님.**
- 테스트/린터 없음. 변경 후 **개발 서버 확인 + `npm run build`(컴파일 점검)** 를 습관화.

## 3. 기술 스택 · 코드 규칙

- **React 18 + Vite 5**, **JavaScript(JSX)** — TypeScript 아님. `.jsx`에 타입 주석 넣지 말 것.
- **상태관리:** 외부 라이브러리 없이 React Context + `useReducer` (`src/state/TelemetryContext.jsx`).
- **라우팅:** 라우터 없음. `App.jsx`의 `tab`(dashboard/records) + `control`·`droneMode`·`intro`·`web` 오버레이로 전환.
- **차트/게이지/지도/실루엣/수중씬:** 라이브러리 금지. 전부 **SVG/CSS 직접 구현**.
- **아이콘:** Tabler Icons 웹폰트(CDN). `<i className="ti ti-이름" />`, **아웃라인만**(`-filled` 금지, 소수 예외뿐).
- **폰트:** Pretendard(CDN). 수치는 `.num`(`tabular-nums`).
- **애니메이션:** `requestAnimationFrame` 루프 또는 `state.missionTime` 파생.
  rAF 사용 시 **cleanup(`cancelAnimationFrame`) + `dt` 클램프(≤0.05s)** 필수.
  60fps로 씬을 그릴 땐 React state 재렌더 대신 **ref로 DOM transform 직접 변경**(FPV 씬 참고), HUD 수치만 저빈도 setState.
- **StrictMode(dev)로 effect가 2회 실행됨** — 진입/종료 side-effect는 **멱등(idempotent) 액션**으로.
  (예: 드론 전개/도킹은 `toggleDrone` 대신 `setDroneDeployed(true|false)`.)
- 새 의존성 추가 지양. 꼭 필요하면 먼저 이유 설명.

## 4. 디렉터리 구조

```
public/
├─ manifest.webmanifest         # PWA 매니페스트(standalone)
├─ icon.svg                     # 앱 아이콘(가오리)
├─ intro-hero.png               # 프로젝트 소개 시트 히어로 이미지
└─ sw.js                        # 서비스 워커(HTML은 no-store, 그 외 런타임 캐시. arkfluid-v2)
src/
├─ main.jsx                     # 엔트리. StrictMode + TelemetryProvider로 App 감쌈 + SW 등록
├─ App.jsx                      # 앱 셸: 탭 + control/droneMode/intro/web 오버레이 + 토스트/알람
├─ index.css                    # 디자인 토큰(:root) + 전역 + 키프레임
├─ app.css                      # 컴포넌트 스타일(단일 파일)
├─ state/TelemetryContext.jsx   # ★ 시뮬레이션 엔진 (5절)
├─ data/
│  ├─ mapData.js                # 환경별 경로/장애물/히트맵 + 해안선/기지
│  └─ analytics.js              # 기록 화면 정적 목업(주간/월간/구역/종류/배지/이력/KPI)
├─ screens/
│  ├─ Dashboard.jsx             # 상태바·지도캐러셀·영상·게이지·통계세그먼트·배터리·드론카드·빠른작업·소개·CTA
│  ├─ Control.jsx               # 몰입형 HUD·운전대/스로틀·E-STOP·Auto/Manual·줌·드래그팬·가로 3D지형·수심·드론조종
│  ├─ DroneFPV.jsx              # ★ 미니 수중 드론 1인칭(FPV) 전용 조종 화면 (7절)
│  └─ Records.jsx               # KPI 캐러셀·주간/월간 차트·도넛·배지·이력
└─ components/
   ├─ StatusBar.jsx             # 브랜드·연결/배터리/지연 + NotificationBell (latencyLevel export)
   ├─ NotificationBell.jsx      # 상태바 알림 벨(미확인 배지 + 패널)
   ├─ AlarmCenter.jsx           # 경보 배너(5s 자동 해제) → notifications에 기록
   ├─ MapCarousel.jsx           # 대시보드 지도 스와이프(항만→하천→저수지→연안 순차 전환)
   ├─ MarineMap.jsx             # 지도(viewBox 줌)·환경별 세트·수질 색조·FOV·마커(내위치 블루닷)·함대
   ├─ EnvOverlay.jsx            # 지도 위 투명 카드(조류/수온/탁도 + 동기화 타임스탬프)
   ├─ VideoFeed.jsx             # 카메라(RGB/열화상)·디헤이징·해저지형·해양생물·표류쓰레기+추적박스·수면 분할
   ├─ StatSegment.jsx           # 대시보드 4분할 통계(오늘수거/탁도/수온/가동) 알약형 아코디언
   ├─ KpiCarousel.jsx           # 기록 KPI 워치형 스와이프 캐러셀
   ├─ NetGauge.jsx              # 곡선 네트 게이지(warn/crit 임계 prop)
   ├─ SteeringWheel.jsx         # 운전대(선회, 놓으면 중앙 복귀)
   ├─ Throttle.jsx              # 스로틀(추력, 위치 유지, 중립 디텐트, axis 'y'|'x')
   ├─ Charts.jsx                # BarChart/DonutChart/Legend (SVG)
   ├─ TabBar.jsx                # 하단 탭 + 중앙 오렌지 제어 FAB
   ├─ Toast.jsx                 # 전역 토스트(state.toast, 자동 해제)
   ├─ WebBridge.jsx             # 인앱 브라우저(WebView) 모달 시뮬레이션
   ├─ IntroSheet.jsx            # 'ARK-FLUID 프로젝트 소개' 바텀시트(히어로+한계/해결 정리)
   ├─ EnvSelector.jsx           # (레거시) 환경 버튼 — 현재 MapCarousel 스와이프로 대체, 미사용
   ├─ StatDetailSheet.jsx       # (레거시) 통계 상세 시트 — StatSegment 아코디언으로 대체, 미사용
   └─ Joystick.jsx              # (레거시) 미사용
```

## 5. 시뮬레이션 엔진 (가장 중요)

`src/state/TelemetryContext.jsx` — 600ms 마다 `TICK`(now 타임스탬프 주입) 디스패치.

- **배터리:** `BATTERY_DRAIN_PER_S = 1/(10*60)` → **10분당 1% 고정 소모**(추력/속도 무관).
- **이동:** patrol(현재 환경 경로 추종) / manual(운전대+스로틀 differential thrust, 후진 −1)
  / hold(관성 정지) / returning(homeBase 직진 복귀). 조류로 미세 드리프트.
- **OA 회피:** `computeAvoidance(pos, heading, obstacles)` — **현재 환경 장애물**로 곡선 우회 조향.
- **어시스트:** 수동+assist 시 전방 표적 정렬 보정.
- **수심(depth):** `vertical`(-1 상승/0 유지/+1 하강, `setVertical`) × `DEPTH_RATE(1.5m/s)`, 범위 0~15m.
  깊이는 `VideoFeed`의 **수면 분할**과 `DroneFPV` 수중 톤에 반영.
- **미니 수중 드론:** `drone = { deployed, x, y, light, mvx, mvy, battery }`.
  - 전개(미부착): `mvx/mvy × DRONE_SPEED`로 이동 + `DRONE_DRAIN(0.09%/s)` 방전.
  - 도킹(부착): `DRONE_CHARGE(0.35%/s)` 충전.
  - 액션: `setDroneMove(x,y)`, `toggleDroneLight`, **`setDroneDeployed(bool)`**(멱등, 권장)/`toggleDrone`(토글).
- **환경값:** 선택 환경(`ENV_MODES` 프로파일) 기준 탁도·유속·수온 + 객체탐지·조류·`ts` 동기화.
- **운용 환경(`environment`):** 항만/하천/저수지/연안. `SET_ENVIRONMENT`로 전환하면
  **경로·장애물·히트맵(모두 `mapData` 환경별 세트)·물색·수질값**이 함께 바뀜. `ENV_MODES` export.
- **자동 복귀·알람 트리거(최초 1회):**
  - **배터리 30% 미만** → `returning=true` + 토스트/경보.
  - **수거함 50kg 도달** → `returning=true` + 토스트/경보.
  - `returning` 중 기지 3유닛 이내 도킹 → 수거함 자동 배출 후 순찰 재개.
- **알림 이력:** provider 로컬 상태(`notifications`, `notifUnread`) — `pushNotification` /
  `markNotificationsRead` / `clearNotifications`. `AlarmCenter`가 경보를 띄우고 기록, `NotificationBell`이 표시.
- `E-STOP`·통신두절 시 Fail-safe 정지(대기 소모만).
- **컨텍스트 제공값:** `state, stateRef, gps, heatmap, path, obstacles`(현재 환경 기준) + 액션들
  (`setThruster, setVertical, toggleDrone, setDroneMove, setDroneDeployed, toggleDroneLight,
  setMode, setAutonomy, toggleAssist, toggleDehaze, setEnvironment, estop, resetEstop,
  returnHome, dumpNet, toast, clearToast, setConnection`) + 알림 함수들.

> **실제 로봇 연동 시:** `TICK`을 WebSocket/MQTT 구독으로, `VideoFeed`/`DroneFPV`를 WebRTC로,
> 0~100 정규화 좌표를 실제 GPS로 매핑. 컴포넌트 계층 재사용 가능.

## 6. 대시보드 · 지도 · 기록

- **대시보드 구성:** `MapCarousel`(지도) → `VideoFeed`(실시간 영상) → `NetGauge`(수거함) →
  `StatSegment`(오늘수거/탁도/수온/가동 4분할 **알약형 아코디언**, 선택 시 연주황 원 + 아래로 상세 펼침) →
  `BatteryCard` → `DroneStatusCard`(드론 배터리 + **1인칭 조종 모드** 진입 버튼) → 빠른 작업 → 소개 카드 → CTA.
- **지도 캐러셀:** 좌우 스와이프로 항만→하천→저수지→연안 순차 전환(`setEnvironment`).
  포인터 이벤트 가로/세로 판별(`st.current.decided`), 동기 스냅은 `dragRef`. 활성 슬라이드만 라이브 렌더.
- **MarineMap:** 수질 색조(탁도↑ 불투명도↑, 수온 hue 이동, 0.6s 전환), viewBox 줌, 로봇=**Apple '내 위치' 블루닷**,
  함대 3대(반투명, `missionTime` 궤도).
- **기록:** `KpiCarousel`(오늘수거/주간누적/수거효율/가동률, 워치형 스와이프 + 슬라이드별 배경색) +
  주간/월간 막대차트 + 종류 도넛 + 운용 배지 + 최근 이력.

## 7. 제어(Control) · 영상(VideoFeed) · 드론 FPV(DroneFPV)

- **Control:** 운전대(선회, 중앙 복귀) + 스로틀(추력, 위치 유지) → differential thrust.
  E-STOP 길게(600ms). Auto/Manual·어시스트. 줌 기본 **0.5×**. 배경 드래그 팬(중앙 복귀). 소스: 지도/영상/열화상.
  **가로(landscape) 전환**: 스테이지 90° 회전 파노라마 + 회전된 조종 레이어(운전대·스로틀 `axis="x"`·수심 상승/하강·드론 전개/D패드/탐사등).
- **VideoFeed props:** `compact`, `thermal`(controlled), `showChips`, `zoom`, `hideBoxes`.
  - 대시보드: `<VideoFeed compact hideBoxes />` → 박스/라벨 숨김(실루엣만).
  - 해저지형(환경별) + 해양생물(원근 z) + 표류 쓰레기+추적 박스 + **수면 분할**(`surfaceBand = clamp(50*(1-depth/1.5),0,50)`) + 표면 쓰레기.
- **DroneFPV(★ 신규):** 대시보드 드론 카드에서 **1인칭 조종 모드** 진입 → 전용 FPV 오버레이(`App.jsx`의 `droneMode`).
  - 가로 스테이지 90° 회전(기존 컨벤션). 진입 카메라 부팅 애니메이션(~0.42s).
  - 진입 시 **본체 AUTO 유지 + 드론 전개**(`setDroneDeployed(true)`), 종료 시 도킹(`setDroneDeployed(false)`) — 멱등이라 StrictMode 안전.
  - 수중 씬: 깊이 그라디언트·갓레이·수중안개(탁도)·마린스노우·라이트콘·비네트 + **해저 지형 원근 컨베이어**(바위/모래/수초/구조물/장애물 시각 구분, rAF로 DOM transform 직접 갱신).
  - 반투명 HUD: 탐사상태 · 본체AUTO/배터리/신호 · 실시간 텔레메트리(수온·수심·수온변화·탐사거리) · AI 탐지 박스(종류·신뢰도%·개수) · 크로스헤어.
  - 조종: 좌하단 **가상 조이스틱** · 우하단 카메라 방향패드/상승·하강/탐사등.
  - **주의:** 스테이지가 `rotate(90deg)`라 포인터 델타를 로컬로 변환해야 함 — `toLocal(sdx,sdy) = {lx: sdy, ly: -sdx}`.
    조이스틱 노브가 손가락을 따라오고, 가로 화면 기준 **위로 밀면 전진**.

## 8. 디자인 시스템 (반드시 준수)

토큰은 `src/index.css`의 `:root`. **하드코딩 색상 대신 CSS 변수.**

- **컬러 60/30/10:** White(배경)·Navy(구조)·**Orange(행동/강조, `#f26522`)**. 오렌지는 CTA·핵심 수치·
  로봇 위치/경로·주의/경고·선택 강조에만. 화면당 Primary 오렌지 CTA 1개.
- **라운드 스케일:** `--card-radius`(메인 18/22), `--card-radius-sm`(서브 16/20), `--r-control`(12),
  `--r-pill`(999). 카드마다 제각각 값 쓰지 말고 토큰 사용.
- **엘리베이션:** 부드러운 다층 그림자(`--shadow-*`) + **헤어라인 보더**(`--hairline`).
- **8px 그리드:** padding/margin/gap은 4·8·12·16·24 계열로.
- **생체 모방:** 카드 비대칭 라운드, 곡선 게이지(`NetGauge`), 부채꼴 FOV, 유선형 모션(`swimIn`).
- **모션 절제:** CTA/FAB에 상시 깜빡임 금지 — 탭 시 부드러운 반응(:active/hover)만. 진입 애니메이션 유지.
- **심도 계층:** 상위(수면)=화이트 모니터링 / 하위(수심)=딥네이비 몰입 제어·FPV.
- **몰입 HUD:** 제어/FPV 오버레이는 영상을 가리지 않게 **반투명 유리(blur) HUD**. 전문 수중 드론 인터페이스 톤.

## 9. 안전 · 임계 피드백

- **지연:** 150ms↓ 원활/~300ms 주의/300ms↑ 지연 + 배너. `StatusBar.latencyLevel()`(제어도 재사용).
- **배터리:** ≤30% 카드 주황(≤12% 위험 레드+점멸), 30% 미만 진입 시 알람+자동 복귀.
- **수거함:** `NetGauge` `warn` 임계(대시보드=50kg)에서 주황, 50kg에서 알람+자동 복귀.
- **경보:** `AlarmCenter` 배너 **5초 자동 해제** + 알림 이력 기록. 피드백은 **시각+햅틱**(`navigator.vibrate`).

## 10. 자주 밟는 함정 (Gotchas)

- **오버레이/모달은 `App.jsx` 최상위(`.device` 직속)** 에서 렌더. 스크롤 컨테이너·transform 요소 안에 두면 못 덮음.
  (control/droneMode/intro/web/alarm/toast 전부 여기서.)
- **가로(90° 회전) 스테이지 안의 드래그 입력**은 포인터 델타를 로컬 좌표로 회전 변환해야 함(7절 `toLocal`).
  각도 기반(SteeringWheel)은 회전 불변이라 그대로 OK, **벡터 기반(조이스틱)은 변환 필수**.
- **StrictMode(dev) effect 2회 실행** — 진입/종료 부수효과는 멱등 액션으로(`setDroneDeployed` 등).
- **SMIL `<animate>`가 있는 지도는 스크린샷 캡처가 멈출 수 있음**(기능은 정상). 수치 검증(eval)으로 확인.
  새 동적 요소는 가급적 JS/CSS로. 프리뷰 탭이 백그라운드면 rAF가 멈춰 애니메이션 정지처럼 보일 수 있음.
- **표시 숫자는 반드시 반올림**(`toFixed`/`Math.round`).
- **CRLF 줄바꿈** — Node 스크립트로 파일 치환 시 `\n` 대신 `\r\n`/`\s*` 사용. Edit 도구가 안전.
- **Windows + PowerShell**(Bash 도구도 병행 가능). 경로에 한글·공백 가능 → 따옴표로 감쌀 것.
- **HMR 과도기 콘솔 에러/빈 화면은 전체 새로고침 후 판단.** useReducer 상태가 HMR/bfcache로 보존될 수 있어,
  `initialState`/엔진 변경 검증은 **캐시버스터 쿼리(`?cb=`)로 완전 새로고침**.
- **PWA 캐시:** 배포 후 안 열리면 대개 클라이언트 캐시/서비스워커. `sw.js`는 HTML `no-store`.
  시크릿창·`Ctrl+Shift+R`로 확인. 서버 자체는 200이어도 캐시 때문에 옛 화면이 뜰 수 있음.
- 환경별 데이터를 추가할 땐 `mapData` 세트(paths/obstacles/heatmap)를 **같은 키(harbor/river/reservoir/coast)**
  로 맞추고, 엔진 provider와 `computeAvoidance` 인자까지 함께 반영.

## 11. 변경 시 체크리스트

1. CSS 변수/라운드·그림자 토큰을 썼는가? 하드코딩 색상·상시 깜빡임은 아닌가?
2. 오렌지를 "행동/강조"에만, 표시 숫자를 반올림했는가?
3. `npm run build` 통과 + 3화면(+FPV) 렌더/전환 + 콘솔 에러 없는가?
4. rAF 추가 시 cleanup + `dt` 클램프를 넣었는가? 60fps 갱신은 ref로(재렌더 최소화)?
5. 진입/종료 부수효과는 멱등인가(StrictMode 안전)? 가로 회전 드래그는 좌표 변환했는가?
6. 환경 전환 시 관련 요소(경로·장애물·히트맵·색·수질)가 함께 바뀌는가?
7. 새 컴포넌트가 실제 로봇 연동에도 재사용 가능한가(데이터는 props/훅 주입)?
