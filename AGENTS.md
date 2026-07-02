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
- **맥락:** 팀 과제(AI Creative Challenge) 프로토타입. 제품명은 `APK`가 아니라 반드시 **`ARK`-FLUID**.

## 2. 실행 · 개발 명령어

```bash
npm install      # 의존성 설치
npm run dev      # Vite 개발 서버 → http://localhost:5173
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

- 개발 서버는 모바일 화면 비율(최대 430px)로 최적화됨. 데스크톱에서는 폰 프레임 안에 렌더.
- `vite.config.js`는 `process.env.PORT`를 읽어 포트를 정함(미지정 시 5173). 자동 포트 도구와 호환.
- 테스트 프레임워크·린터는 아직 없음. 변경 후에는 **개발 서버를 띄워 브라우저에서 직접 확인**하고,
  가능하면 `npm run build`로 컴파일 오류를 함께 점검할 것.

## 3. 기술 스택 · 코드 규칙

- **React 18 + Vite 5**, **JavaScript(JSX)** — TypeScript 아님. `.jsx`에 타입 주석 넣지 말 것.
- **상태관리:** 외부 라이브러리 없이 React Context + `useReducer` (`src/state/TelemetryContext.jsx`).
- **라우팅:** 라우터 라이브러리 없음. `App.jsx`의 `tab` 상태(dashboard/records) + `control` 오버레이로 전환.
- **차트/게이지:** 차트 라이브러리(Recharts 등) 쓰지 말 것. **SVG로 직접 구현**
  (`Charts.jsx`, `NetGauge.jsx`, `MarineMap.jsx`, 쓰레기·생물 실루엣 등).
- **아이콘:** Tabler Icons 웹폰트(CDN). `<i className="ti ti-이름" />` 형태. **아웃라인만**(`-filled` 금지).
- **폰트:** Pretendard(CDN). 수치는 `.num` 클래스로 `tabular-nums` 고정폭.
- **애니메이션:** 다수 개체의 자율 이동(해양생물, 표류 쓰레기)은 **`requestAnimationFrame` 루프**로 구현.
  탭 비활성 시 큰 점프를 막기 위해 `dt`를 클램프(≤0.05s)할 것.
- 새 의존성 추가는 지양. 꼭 필요하면 먼저 이유를 설명할 것.

## 4. 디렉터리 구조

```
src/
├─ main.jsx                    # 엔트리. TelemetryProvider로 App을 감쌈
├─ App.jsx                     # 앱 셸: 탭 전환 + 제어 모드 + 웹모달 + 토스트
├─ index.css                   # 디자인 토큰(:root 변수) + 전역 스타일 + 키프레임
├─ app.css                     # 컴포넌트 스타일 (화면/컴포넌트별 클래스)
├─ state/
│  └─ TelemetryContext.jsx     # ★ 가상 로봇 시뮬레이션 엔진 (아래 5절 참고)
├─ data/
│  ├─ mapData.js               # 순찰 경로 / 히트맵 / 해안선 / 장애물 / 기지(homeBase) 좌표(0~100)
│  └─ analytics.js             # 기록 화면용 정적 목업(주간/월간/구역/종류/배지/이력/KPI)
├─ screens/
│  ├─ Dashboard.jsx            # 상태바·지도·영상·요약·배터리 카드·빠른작업·외부 링크 CTA
│  ├─ Control.jsx              # 몰입형 HUD·운전대/스로틀·E-STOP·Auto/Manual·줌·드래그 팬
│  └─ Records.jsx              # KPI·주간/월간 차트·히트맵·배지·이력
└─ components/
   ├─ StatusBar.jsx            # 상단 브랜드(가오리 아이콘+로고)·연결/배터리/지연 (+ latencyLevel export)
   ├─ MarineMap.jsx            # 해양 SVG 지도(viewBox 줌)·FOV·장애물/회피·가오리 마커·조류·복귀선
   ├─ EnvOverlay.jsx           # 지도 위 투명 오버레이 카드(조류/수온/탁도 + 동기화 타임스탬프)
   ├─ VideoFeed.jsx            # 카메라 피드(RGB/열화상)·디헤이징·해양생물 그림자·표류 쓰레기+추적박스
   ├─ NetGauge.jsx             # 곡선형 네트(가오리 입) 게이지 — SVG 아치 (warn/crit 임계 prop)
   ├─ SteeringWheel.jsx        # 운전대 — 돌려서 선회, 놓으면 중앙 복귀
   ├─ Throttle.jsx             # 세로 스로틀 — 위=전진/아래=후진, 위치 유지(순항), 중립 디텐트
   ├─ Joystick.jsx             # (레거시) 포인터 조이스틱 — 현재 제어 화면 미사용
   ├─ Charts.jsx               # BarChart / DonutChart / Legend (SVG 직접 구현)
   ├─ TabBar.jsx               # 하단 탭(대시보드/기록) + 중앙 오렌지 제어 FAB
   ├─ Toast.jsx                # 전역 토스트 (state.toast 구독, 3.2s 자동 해제)
   └─ WebBridge.jsx            # 인앱 브라우저(WebView) 모달 시뮬레이션
```

## 5. 시뮬레이션 엔진 (가장 중요)

`src/state/TelemetryContext.jsx`가 앱의 심장입니다.

- `initialState`에 로봇의 모든 상태(연결·배터리·수거함·운동·환경·모드 등)를 정의.
- **600ms 마다 `TICK` 액션**(now 타임스탬프 주입)을 디스패치 → 아래를 계산:
  - **배터리:** `BATTERY_DRAIN_PER_S = 1/(10*60)` → **10분당 1% 고정 소모**(추력/속도 무관).
  - **이동:** patrol(자동 순찰 경로 추종) / manual(운전대+스로틀 differential thrust, 후진 시 moveSign −1)
    / hold(관성 정지) / returning(homeBase로 직진 복귀). 조류(current)로 미세 드리프트.
  - **장애물 회피(OA):** `computeAvoidance()`가 전방 근접 장애물 반대편으로 곡선 조향각 산출.
  - **조작 어시스트:** 수동+assist 시 전방 표적으로 정렬 보정(`nearestTargetAhead`).
  - **지연:** manual은 WebRTC 저지연(<108ms), 그 외 telemetry 경로.
  - **환경/탐지:** 수온·탁도·수심·조류·객체탐지(`detections`, 일부 레거시)를 동일 `ts`로 동기화.
- **자동 복귀·알람 트리거:**
  - **배터리 30% 미만** → `returning=true` + 토스트 "배터리 부족으로 기지 복귀".
  - **수거함 50kg 도달**(용량 `netCapacityKg` 기준) → `returning=true` + 토스트 "가득 차기 전 기지 복귀".
  - `returning` 중 기지 3유닛 이내 도킹 → 수거함 자동 배출(netLoad 0) 후 순찰 재개.
- `E-STOP`·통신두절 시 자동 Fail-safe 정지(대기 소모만).
- **액션:** `SET_THRUSTER` `SET_MODE` `SET_AUTONOMY` `TOGGLE_ASSIST` `TOGGLE_DEHAZE`
  `ESTOP`/`RESET_ESTOP` `RETURN_HOME`(→returning) `DUMP_NET` `TOAST`/`CLEAR_TOAST` 등.
- 컴포넌트는 `useTelemetry()` 훅으로 `state`, `gps`, `heatmap`, `path`, `obstacles`와 액션 함수를 받음.

> **실제 로봇 연동 시:** `TICK` 리듀서(목업 계산)를 **WebSocket/MQTT 구독으로 교체**하고,
> `VideoFeed`를 WebRTC `<video>`로, `MarineMap`의 0~100 정규화 좌표를 실제 GPS로 매핑하면 됨.
> 컴포넌트 계층은 그대로 재사용 가능하도록 설계됨.

## 6. 제어(Control) 화면 상호작용

- **조종:** 운전대(선회, 놓으면 중앙 복귀) + 세로 스로틀(추력, 위치 유지) → differential thrust.
- **E-STOP:** 오작동 방지를 위해 **길게 눌러(600ms) 확정**. 발동 시 레드 오버레이 + 토스트 + 햅틱.
- **Auto/Manual 토글**과 **어시스트(정밀 정렬 리티클)** 제공. 수동은 WebRTC 저지연 표시.
- **줌:** 0.5×~3.0× (기본 **0.5×**). **지도는 viewBox 배율**(줌 아웃 시 바다가 넓게 보임),
  **영상은 탐지 오버레이만 스케일**(장면은 항상 꽉 채움).
- **드래그 팬:** 배경을 드래그하면 그 방향으로 이동, 놓으면 중앙 복귀. `scale(1.2)` 헤드룸 내 클램프.
- **소스 전환:** 지도 / 영상(RGB) / 열화상.

## 7. 영상(VideoFeed) 표현

- **해양생물 그림자:** 물고기/치어떼/해파리가 rAF로 자율 유영(진행 방향 응시, 가장자리 반사).
- **표류 쓰레기 + 추적 박스:** 쓰레기(페트병/캔/유리병/종이컵)가 **조류를 타고 표류**(개별 방향·속도차),
  각 박스가 종류를 라벨링하며 **개별 추적**. 완전히 화면 밖에서만 반대편 재진입(**순간이동 금지**).
- **쓰레기 렌더:** 디테일 없는 **단색 그림자 실루엣**(`fill=currentColor`), 박스 안에서 천천히 회전.
  종류 SVG는 `DebrisShape`, 종횡비는 `KIND_ASPECT`.
- **디헤이징:** 탁도 비례 CSS 필터로 시인성 보정(ON/OFF).

## 8. 디자인 시스템 (반드시 준수)

토큰은 `src/index.css`의 `:root`에 정의됨. **하드코딩 색상 대신 CSS 변수 사용.**

- **컬러 60/30/10 비율:** White(배경) · Navy(구조/텍스트) · **Orange(행동/강조)**.
- **오렌지 = 행동 규칙:** 오렌지(`--orange-500`, 차분한 톤 `#f26522`)는 **CTA · 핵심 수치 ·
  로봇 위치/경로 · 주의/경고**에만. 보조 요소엔 쓰지 말 것. 화면당 Primary 오렌지 CTA는 1개.
- **의미 색:** 정상 `--success`, 위험/긴급정지 `--danger`, 주의 `--warning`.
- **엘리베이션:** 부드러운 다층 그림자(`--shadow-*`) + **헤어라인 보더**(`--hairline`)로 크리스프하게.
- **생체 모방(Manta-Ray) 언어:**
  - 카드는 **비대칭 라운드**(위 18px / 아래 22px, `--card-radius`) — 직각 박스 지양.
  - 정량 데이터는 가능한 한 **곡선 게이지**(`NetGauge`)로. 선형 바는 보조에만.
  - 지도 센서 시야는 **부채꼴(날개) FOV**, 로봇/시작/목표 마커는 **가오리 실루엣**.
  - 모션은 유선형: 진입 `swimIn`, 강조 채움 탄성 `cubic-bezier`.
- **심도 계층:** 상위(수면)=화이트 모니터링 레이어 / 하위(수심)=딥네이비 몰입 제어 레이어.
- **모션 절제:** CTA/FAB에 상시 깜빡임(호흡) 금지 — 탭 시 부드러운 반응만. 진입 애니메이션은 유지.

## 9. 안전 · 임계 피드백

- **지연 시각화:** 150ms↓ 원활(초록) / ~300ms 주의(오렌지) / 300ms↑ 지연(레드) + 경고 배너.
  임계값 로직은 `StatusBar.jsx`의 `latencyLevel()`에 있음(제어 화면도 재사용).
- **배터리:** 30% 이하 → 카드 주황(12% 이하 레드+점멸), 30% 미만 진입 시 알람+자동 복귀.
- **수거함:** `NetGauge`의 `warn` 임계(대시보드는 50kg 지점) 넘으면 주황, 50kg에서 알람+자동 복귀.
- 피드백은 **시각+햅틱**을 함께(`navigator.vibrate`) — 선상/소음 환경 가정.

## 10. 자주 밟는 함정 (Gotchas)

- **오버레이/모달은 `App.jsx` 최상위(`.device` 직속)에서 렌더**. 스크롤 컨테이너(`.screen`)나
  transform 중인 요소 안에 두면 그 요소가 containing block이 되어 전체를 못 덮음.
- **스크롤 영역(`.screen`)은 `min-height:0` + `margin-bottom: var(--tabbar-h)`** 로 하단 탭바에
  가려지지 않게. (플렉스 자식이 콘텐츠 높이로 늘어나 내부 스크롤이 막히는 문제 방지)
- **SMIL 애니메이션(`<animateMotion>`)보다 JS 위치 계산 선호** — 렌더러 안정성/캡처 문제.
  (단, 마커 펄스 등 단순 `<animate>`는 사용 중)
- **화면에 표시되는 숫자는 반드시 반올림**(`toFixed`/`Math.round`). float 잔여값 노출 금지.
- **환경:** Windows + PowerShell. 경로에 한글·공백 포함될 수 있음 — 항상 따옴표로 감쌀 것.
  ImageMagick 없음(`convert`는 Windows 디스크 유틸이니 리사이즈에 쓰지 말 것).
- 여러 파일을 연쇄 수정하면 **HMR 과도기에 일시적 콘솔 에러**가 찍힐 수 있음 —
  **전체 새로고침 후** 실제 오류 여부를 판단할 것. useReducer 상태는 HMR/보존될 수 있어,
  `initialState` 변경 검증은 캐시버스터 쿼리(`?cb=`)로 완전 새로고침할 것.
- `file://` 링크는 브라우저가 http(dev 서버) 출처에서 이동을 차단 — 로컬/패키징 환경에서만 열림.

## 11. 변경 시 체크리스트

1. CSS 변수(토큰)를 썼는가? 하드코딩 색상은 아닌가?
2. 오렌지를 "행동/강조"에만 썼는가? 상시 깜빡임을 추가하지 않았는가?
3. 표시 숫자를 반올림했는가?
4. `npm run build` 통과 + 개발 서버에서 3화면 렌더/전환 정상 + 콘솔 에러 없는가?
5. 새 컴포넌트가 실제 로봇 연동 시에도 재사용 가능한 구조인가(데이터는 props/훅으로 주입)?
6. rAF 루프를 추가했다면 cleanup(`cancelAnimationFrame`)과 `dt` 클램프를 넣었는가?
