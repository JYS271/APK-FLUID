# AGENTS.md

이 문서는 **ARK-FLUID 관제 앱** 저장소에서 작업하는 AI 코딩 에이전트를 위한 가이드입니다.
사람 개발자 온보딩에도 유용합니다. 코드를 수정하기 전에 먼저 읽으세요.

---

## 1. 프로젝트 개요

- **제품:** ARK-FLUID — SHECO의 만타레이(가오리) 기반 모듈형 해양 쓰레기 수거 로봇(NET MODULE Ver.A)
- **이 저장소:** 그 로봇을 모니터링·제어·분석하는 **모바일 관제 앱 프로토타입**
- **성격:** 실제 로봇 서버 없이 **가상 텔레메트리 시뮬레이션**으로 UI/UX 전체 흐름을 구현한 데모
- **범위:** 핵심 3화면 — 대시보드(Monitor) · 제어(Control) · 기록(Analyze)
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
- 테스트/린터 없음. 변경 후 **개발 서버 확인 + `npm run build`(컴파일 점검)** 를 습관화.

## 3. 기술 스택 · 코드 규칙

- **React 18 + Vite 5**, **JavaScript(JSX)** — TypeScript 아님. `.jsx`에 타입 주석 넣지 말 것.
- **상태관리:** 외부 라이브러리 없이 React Context + `useReducer` (`src/state/TelemetryContext.jsx`).
- **라우팅:** 라우터 없음. `App.jsx`의 `tab`(dashboard/records) + `control` 오버레이로 전환.
- **차트/게이지/지도/실루엣:** 라이브러리 금지. 전부 **SVG 직접 구현**.
- **아이콘:** Tabler Icons 웹폰트(CDN). `<i className="ti ti-이름" />`, **아웃라인만**(`-filled` 금지).
- **폰트:** Pretendard(CDN). 수치는 `.num`(`tabular-nums`).
- **자율 이동(해양생물·표류 쓰레기·함대):** `requestAnimationFrame` 루프 또는 `state.missionTime` 파생.
  rAF 사용 시 **cleanup(`cancelAnimationFrame`) + `dt` 클램프(≤0.05s)** 필수.
- 새 의존성 추가 지양. 꼭 필요하면 먼저 이유 설명.

## 4. 디렉터리 구조

```
public/
├─ manifest.webmanifest         # PWA 매니페스트(standalone)
├─ icon.svg                     # 앱 아이콘(가오리)
└─ sw.js                        # 서비스 워커(네트워크 우선 + 런타임 캐시)
src/
├─ main.jsx                     # 엔트리. TelemetryProvider로 App 감쌈 + SW 등록
├─ App.jsx                      # 앱 셸: 탭 전환 + 제어 오버레이 + 웹모달 + 토스트
├─ index.css                    # 디자인 토큰(:root) + 전역 + 키프레임
├─ app.css                      # 컴포넌트 스타일
├─ state/TelemetryContext.jsx   # ★ 시뮬레이션 엔진 (5절)
├─ data/
│  ├─ mapData.js                # 환경별 경로/장애물/히트맵 + 해안선/기지
│  └─ analytics.js              # 기록 화면 정적 목업(주간/월간/구역/종류/배지/이력/KPI)
├─ screens/
│  ├─ Dashboard.jsx             # 상태바·환경선택·지도·영상·게이지·스탯·배터리·빠른작업·CTA
│  ├─ Control.jsx               # 몰입형 HUD·환경바·운전대/스로틀·E-STOP·Auto/Manual·줌·드래그팬
│  └─ Records.jsx               # KPI·주간/월간 차트·도넛·배지·이력
└─ components/
   ├─ StatusBar.jsx             # 브랜드(가오리+로고)·연결/배터리/지연 (+ latencyLevel export)
   ├─ EnvSelector.jsx           # 운용 환경 전환 버튼(항만/하천/저수지/연안), dark/compact 변형
   ├─ MarineMap.jsx             # 지도(viewBox 줌)·환경별 경로/장애물/히트맵·수질 색조·FOV·마커·함대
   ├─ EnvOverlay.jsx            # 지도 위 투명 카드(조류/수온/탁도 + 동기화 타임스탬프)
   ├─ VideoFeed.jsx             # 카메라(RGB/열화상)·디헤이징·해양생물 그림자·표류 쓰레기+추적박스
   ├─ NetGauge.jsx              # 곡선 네트 게이지(warn/crit 임계 prop)
   ├─ SteeringWheel.jsx         # 운전대(선회, 놓으면 중앙 복귀)
   ├─ Throttle.jsx              # 세로 스로틀(추력, 위치 유지, 중립 디텐트)
   ├─ Joystick.jsx              # (레거시) 현재 제어 화면 미사용
   ├─ Charts.jsx                # BarChart/DonutChart/Legend (SVG)
   ├─ TabBar.jsx                # 하단 탭 + 중앙 오렌지 제어 FAB
   ├─ Toast.jsx                 # 전역 토스트(state.toast, 3.2s 자동 해제)
   └─ WebBridge.jsx             # 인앱 브라우저(WebView) 모달 시뮬레이션
```

## 5. 시뮬레이션 엔진 (가장 중요)

`src/state/TelemetryContext.jsx` — 600ms 마다 `TICK`(now 타임스탬프 주입) 디스패치.

- **배터리:** `BATTERY_DRAIN_PER_S = 1/(10*60)` → **10분당 1% 고정 소모**(추력/속도 무관).
- **이동:** patrol(현재 환경 경로 추종) / manual(운전대+스로틀 differential thrust, 후진 moveSign −1)
  / hold(관성 정지) / returning(homeBase 직진 복귀). 조류로 미세 드리프트.
- **OA 회피:** `computeAvoidance(pos, heading, obstacles)` — **현재 환경 장애물**로 곡선 우회 조향.
- **어시스트:** 수동+assist 시 전방 표적 정렬 보정.
- **환경값:** 선택된 환경(`ENV_MODES` 프로파일) 기준으로 탁도·유속·수온 계산 + 객체탐지·조류·`ts` 동기화.
- **운용 환경(`environment`):** 항만/하천/저수지/연안. `SET_ENVIRONMENT`로 전환하면
  **경로·장애물·히트맵(모두 `mapData`의 환경별 세트)·물색·수질값**이 함께 바뀜. `ENV_MODES` export.
- **자동 복귀·알람 트리거(최초 1회):**
  - **배터리 30% 미만** → `returning=true` + 토스트 "배터리 부족으로 기지 복귀".
  - **수거함 50kg 도달** → `returning=true` + 토스트 "가득 차기 전 기지 복귀".
  - `returning` 중 기지 3유닛 이내 도킹 → 수거함 자동 배출 후 순찰 재개.
- `E-STOP`·통신두절 시 Fail-safe 정지(대기 소모만).
- **컨텍스트 제공값:** `state, gps, heatmap, path, obstacles`(모두 현재 환경 기준) + 액션 함수들
  (`setThruster, setMode, setAutonomy, toggleAssist, toggleDehaze, setEnvironment,
  estop, resetEstop, returnHome, dumpNet, toast …`).

> **실제 로봇 연동 시:** `TICK`을 WebSocket/MQTT 구독으로, `VideoFeed`를 WebRTC로,
> 0~100 정규화 좌표를 실제 GPS로 매핑. 컴포넌트 계층 재사용 가능.

## 6. 지도(MarineMap) 세부

- **환경별 구성:** 컨텍스트의 `path`(수거 구역 점선), `obstacles`, `heatmap`(주황 히트맵)이
  현재 환경 세트로 자동 갱신 (대시보드·제어 공통).
- **수질 색조:** 탁도↑ → 탁한 오버레이 불투명도↑, 수온으로 청록↔갈색 hue 이동(영상처럼 반응, 0.6s 전환).
- **줌:** viewBox 배율(줌 아웃 시 바다 넓게). 바다 rect/그리드는 넓게(-80~180) 확장.
- **마커:** 로봇=오렌지 가오리(방위 회전), 시작/목표=현재 경로 양 끝, 기지, **함대 3대**(작고 반투명
  네이비 가오리, `missionTime` 기반 궤도 이동).

## 7. 제어(Control) · 영상(VideoFeed)

- **제어:** 운전대(선회, 중앙 복귀) + 세로 스로틀(추력, 위치 유지) → differential thrust.
  E-STOP 길게(600ms) 확정. Auto/Manual·어시스트·환경바. 줌 기본 **0.5×**(지도=viewBox, 영상=탐지 스케일).
  배경 드래그 팬(놓으면 중앙 복귀). 소스: 지도/영상(RGB)/열화상.
- **영상:** RGB/열화상 장면 + 디헤이징. **해양생물 그림자**(rAF 자율 유영) + **표류 쓰레기 + 추적 박스**
  (조류를 타고 흐르며 개별 추적, 완전히 화면 밖에서만 재진입 → 순간이동 없음). 쓰레기는 단색 그림자 실루엣.
- **`VideoFeed` props:** `compact`, `thermal`(controlled), `showChips`, `zoom`, `hideBoxes`.
  - 대시보드: `<VideoFeed compact hideBoxes />` → **박스/라벨 숨김(실루엣만)**, HUD는 LIVE만·칩은 RGB만.
  - 제어 배경: `showChips={false}` → HUD/칩 숨김, 추적 박스 유지.

## 8. 디자인 시스템 (반드시 준수)

토큰은 `src/index.css`의 `:root`. **하드코딩 색상 대신 CSS 변수.**

- **컬러 60/30/10:** White(배경)·Navy(구조)·**Orange(행동/강조, `#f26522`)**. 오렌지는 CTA·핵심 수치·
  로봇 위치/경로·주의/경고에만. 화면당 Primary 오렌지 CTA 1개.
- **라운드 스케일:** `--card-radius`(메인 18/22), `--card-radius-sm`(서브 16/20), `--r-control`(12),
  `--r-pill`(999). 카드마다 제각각 값 쓰지 말고 토큰 사용.
- **엘리베이션:** 부드러운 다층 그림자(`--shadow-*`) + **헤어라인 보더**(`--hairline`).
- **8px 그리드:** padding/margin/gap은 4·8·12·16·24 계열로.
- **생체 모방:** 카드 비대칭 라운드, 곡선 게이지(`NetGauge`), 부채꼴 FOV, 가오리 마커, 유선형 모션(`swimIn`).
- **모션 절제:** CTA/FAB에 상시 깜빡임 금지 — 탭 시 부드러운 반응(:active/hover)만. 진입 애니메이션 유지.
- **심도 계층:** 상위(수면)=화이트 모니터링 / 하위(수심)=딥네이비 몰입 제어.

## 9. 안전 · 임계 피드백

- **지연:** 150ms↓ 원활/~300ms 주의/300ms↑ 지연 + 배너. `StatusBar.latencyLevel()`(제어도 재사용).
- **배터리:** ≤30% 카드 주황(≤12% 위험 레드+점멸), 30% 미만 진입 시 알람+자동 복귀.
- **수거함:** `NetGauge` `warn` 임계(대시보드=50kg)에서 주황, 50kg에서 알람+자동 복귀.
- 피드백은 **시각+햅틱**(`navigator.vibrate`).

## 10. 자주 밟는 함정 (Gotchas)

- **오버레이/모달은 `App.jsx` 최상위(`.device` 직속)** 에서 렌더. 스크롤 컨테이너·transform 요소 안에 두면 못 덮음.
- **스크롤 영역(`.screen`)은 `min-height:0` + `margin-bottom: var(--tabbar-h)`** 로 하단 탭바에 안 가리게.
- **SMIL `<animate>` 있는 지도는 스크린샷 캡처가 멈출 수 있음**(기능은 정상). 수치 검증(eval)으로 확인할 것.
  새로 만드는 동적 요소는 가급적 JS/CSS로.
- **표시 숫자는 반드시 반올림**(`toFixed`/`Math.round`).
- **Windows + PowerShell**. 경로에 한글·공백 가능 → 따옴표로 감쌀 것. ImageMagick 없음(`convert`는 디스크 유틸).
- HMR 과도기 일시 콘솔 에러는 **전체 새로고침 후** 판단. useReducer 상태가 HMR/bfcache로 보존될 수 있어,
  `initialState` 변경 검증은 **캐시버스터 쿼리(`?cb=`)로 완전 새로고침**.
- `file://` 링크는 http 출처에서 브라우저가 이동 차단 — 로컬 파일/패키징에서만 열림.
- 환경별 데이터를 추가할 땐 `mapData`의 세트(paths/obstacles/heatmap)를 **같은 키(harbor/river/reservoir/coast)**
  로 맞추고, 엔진 provider와 `computeAvoidance` 인자까지 함께 반영.

## 11. 변경 시 체크리스트

1. CSS 변수/라운드·그림자 토큰을 썼는가? 하드코딩 색상·상시 깜빡임은 아닌가?
2. 오렌지를 "행동/강조"에만, 표시 숫자를 반올림했는가?
3. `npm run build` 통과 + 3화면 렌더/전환 + 콘솔 에러 없는가?
4. rAF 추가 시 cleanup + `dt` 클램프를 넣었는가?
5. 환경 전환 시 관련 요소(경로·장애물·히트맵·색·수질)가 함께 바뀌는가?
6. 새 컴포넌트가 실제 로봇 연동에도 재사용 가능한가(데이터는 props/훅 주입)?
