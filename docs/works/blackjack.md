# #1_BlackJack (blackjack.md)

본 문서는 '아트&테크놀로지' 포트폴리오의 게임 프로젝트인 '#1_BlackJack(굴절 유리 카드 블랙잭)' 작업물의 전용 기술 명세서입니다. 기존 1번 페이지를 덮어씌워 `/works/blackjack` 경로로 구현됩니다.

---

## 1. 개요 및 경로 정보
* **작업물 고유 ID:** `blackjack`
* **프로젝트명:** #1_BlackJack
* **라우트 경로:** `/works/blackjack` (파일 위치: [page.tsx](file:///c:/Users/SOGANG/portfolio/app/works/blackjack/page.tsx))
* **디자인 컨셉:** 고전 카드 게임인 블랙잭을 두께감이 있는 투명하고 묵직한 유리 블록 메타포로 재해석하여 시각적이고 청각적인 물리 경험을 극대화한 인터랙티브 웹 아트.

---

## 2. 핵심 기술 스택
* **Core Framework:** Next.js (App Router), React
* **3D Rendering & WebGL:** Three.js (Vanilla Three.js Integration)
* **Animation:** GSAP (GreenSock Animation Platform) for physics-like tweens, rotations, and UI transitions
* **Audio:** Web Audio API (or basic HTML5 Audio) for heavy glass sliding/colliding physical sound effects

---

## 3. 주요 기능 및 로직 명세
* **Phase 1: Game State Machine (게임 로직)**
  - 표준 52장 덱 생성, 피셔-예이츠 셔플 알고리즘.
  - 플레이어/딜러 점수 계산 (Aces의 1 또는 11 유동적 처리).
  - Blackjack 게임 루프 (딜링 -> 플레이어 턴(Hit/Stand) -> 딜러 턴 -> 승패 판정 -> 베팅/결과).
  - 데이터 기반의 상태 관리 기계 설계로 WebGL 뷰(View) 레이어와 완벽 분리.
* **Phase 2: Base Scene & Geometry (환경 및 모델링)**
  - Three.js 씬, 원근 카메라, 그림자 맵핑, 물리 기반 라이팅(조명).
  - 주변 광원의 굴절과 반사를 위한 HDRI 환경 맵 적용.
  - 카드 형태를 구현하기 위해 모서리가 둥글고 두께감이 있는 `RoundedBoxGeometry` 생성.
* **Phase 3: Optimized Glass Material & Backside (핵심 셰이더 및 재질)**
  - `MeshPhysicalMaterial`의 세밀한 튜닝(transmission: 0.98, roughness: 0.02, clearcoat: 1.0)을 통해 투명하고 맑은 얇은 유리판 재질 렌더링.
  - 카드 앞면(숫자/문양)과 뒷면(불투명 기하학 문양 패턴)의 Multi-material 매핑.
  - **뒷면 필터링 및 동적 Opaque Core**: 카드 뒷면의 기하학 패턴 영역은 빛 투과율을 제한하는 transmissionMap을 적용하고, 카드가 뒤집혀 있을 때(isHidden)만 내부의 불투명 코어(depthCore)를 동적으로 활성화하여 앞면의 숫자 정보를 물리적으로 차단하고, 카드가 공개(Open)되면 코어를 비활성화(visible: false)하여 영롱한 투명 질감을 완전하게 드러냄.
  - **뎁스 정렬 최적화 (Depth Sorting)**: 여러 유리 카드가 겹칠 때 발생하는 WebGL의 반투명 뎁스 버퍼 오작동을 해결하기 위해 `depthWrite: false` 및 렌더링 오더(`renderOrder`) 제어 기법 적용.
* **Phase 4: Kinematics & Interactions (애니메이션 및 인터랙션)**
  - 카드가 날아오는 딜링 애니메이션에 GSAP `Back` / `Elastic` 이징을 적용하여 묵직한 유리판이 떨어지는 듯한 물리적 반동 시뮬레이션.
  - 레이캐스터(Raycaster)를 통한 카드 클릭/호버 3D 인터랙션 및 카드 뒤집기(Flip) 애니메이션.
* **Phase 5: Post-Processing & Special Effects (후처리 화면 효과)**
  - `EffectComposer` 도입 및 `RenderPass`를 기본으로 하는 포스트 프로세싱 셰이더 체인 구축.
  - `UnrealBloomPass`를 결합하여 유리의 투명 반사광 및 발광 하이라이트 번짐을 극대화.
  - 플레이어 승리 시, 외곽부 RGB 채널을 인위적으로 갈라놓는 커스텀 `ChromaticAberrationShader`를 트리거하여 프리즘 왜곡 수차가 0.3초간 팽창했다 페이드아웃되는 극적 연출 적용.
  - 플레이어 패배(Bust 포함) 시, `GlitchPass`를 활성화해 0.95초간 화면이 지지직거리며 일그러지는 아날로그 노이즈 효과 구현.

---

## 4. 직면 과제 및 최적화 방안 (Troubleshooting & Optimization)
* **문제 1: 겹쳐진 투명 카드의 투명도 렌더링 순서 꼬임**
  * **해결책:** Three.js의 투명 물체 뎁스 정렬 문제를 해결하기 위해, 카드 레이어의 높이(Y축 또는 Z축 값)를 기준으로 렌더링 순서(`renderOrder`)를 동적으로 정렬하고 `depthWrite: false` 처리. 필요한 경우 뎁스 프리패스(Depth Pre-pass)를 수행하는 투명도 셰이더 구현.
* **문제 2: 실시간 물리 굴절의 성능 저하**
  * **해결책:** 모바일 등 저사양 환경을 고려하여, 반사가 실시간 큐브맵 갱신 대신 사전에 구워진(Baked) 반사/노말 맵을 기반으로 한 '가짜 굴절(Fake Refraction)' 셰이더로 스위칭할 수 있는 폴백(Fallback) 옵션 구축.

---

## 5. 아날로그 감성 및 최적화 반영 포인트
* **배경 이미지 자체의 대비/밝기 수동 제어 및 거대 돔 메쉬**: Three.js의 `scene.background`로 이미지를 직접 주입하면 렌더러의 톤매핑 필터링이 먹지 않아 밝은 부분이 과도하게 타들어가는 한계가 있습니다. 이를 해결하기 위해 `scene.background`를 해제하고, 사방을 감싸는 **거대 구형 돔 메쉬(`SphereGeometry` + `BackSide`, 반지름 50)**를 세워 텍스처를 투사했습니다. 씬의 짙은 검은색 안개(`FogExp2`, 밀도 `0.06`)에 의해 거리가 먼 배경 메쉬가 검은색으로 완전히 가려되는 문제를 막기 위해 **`fog: false`** 설정을 재질에 부여했습니다. 또한, PMREM 가공 텍스처(`envMap`)를 구체 메쉬에 직접 씌우면 UV 맵핑이 일그러지고 깨지는 오류를 해결하기 위해 **로드된 원본 `texture`를 구체 돔의 `map`으로 직접 바인딩**했습니다. 이 메쉬의 재질 속성에서 불투명도를 **`0.80`**으로 조율하고, **어두운 회색(`THREE.Color(0.65, 0.65, 0.65)`)을 텍스처에 곱하여(Multiply) 배경 이미지 자체의 강렬한 노을 광원부 밝기는 막아내면서도, 감귤빛 본연의 아름다운 황혼을 중간값의 적당한 밝기**로 재조율했습니다.
* **맑고 매끄러운 얇은 유리판(Glass Plate) 재질 및 라이팅 복원**: 카드의 유리 질감을 진짜 유리처럼 보이기 위해 거칠기(roughness)를 0.02~0.04 수준으로 극소화하고, clearcoat를 1.0, clearcoatRoughness를 0.03으로 튜닝해 표면 반사 하이라이트를 극대화했습니다. 또한, 맑은 유리의 입체감과 굴절을 극적으로 돋보이게 하기 위해 기존의 무대비 라이팅 설정을 걷어내고, AmbientLight를 0.8로 낮추어 기저 명암을 확보하는 동시에, DirectionalLight(0.45) 및 포인트 광원(Cyan 1.2, Gold 0.9)을 복원하여 은은한 입체적 반사 윤곽선과 하이라이트가 투명한 유리에 맺히도록 개선했습니다.
* **HalfFloatType 최적화 및 리소스 해제**: VRAM 용량을 대폭 줄이고 모바일 기기 호환성을 높이기 위해 `THREE.HalfFloatType` 데이터 구조로 텍스처를 로드하였으며, 컴포넌트 해제(`cleanup`) 시 원본 텍스처와 반사용 환경 맵을 각각 명시적으로 `dispose()`하여 메모리 누수를 완전히 차단했습니다.
* **프리미엄 Glassmorphic 로딩 오버레이 & 노출 페이드인**: 4.98MB의 로딩 틱 동안 깜빡임 현상이나 멈춘 듯한 느낌을 없애고자, 실시간 파일 다운로드 진행률(%)과 현재 다운로드 크기를 시각화하는 다크 글래스모피즘 로딩 스크린을 구현했습니다. 스피너는 CSS 키프레임 대신 `GSAP` 무한 회전 트윈으로 제어하여 브라우저 컴파일 리스크를 없앴으며, 로드가 완료되면 오버레이가 페이드아웃 됨과 동시에 카메라 노출(`toneMappingExposure`)을 `0.1`에서 `0.80`으로 1.2초간 매끄럽게 상승시켜 우주 밤하늘이 눈앞에 서서히 펼쳐지는 웅장한 연출을 유도했습니다.
* **하단 중앙 통합 대시보드 HUD**: 흩어져 있던 버튼과 스탯 정보들을 하단 중앙 통합 Glassmorphism 대시보드로 통일하고 30% 스케일업하여 뛰어난 시인성을 확보했습니다.
* **정갈한 흰색 테두리 에지 가이드**: 카드 영역 가이드라인 박스의 대각선 X자 꼬임 와이어프레임을 배제하기 위해, `PlaneGeometry`와 `EdgesGeometry`를 통해 **바깥 사각형 테두리 4면만 깔끔하게 흰색(`LineSegments`)으로 추출**했습니다. 불투명도를 `0.24`로 조율해 시야를 해치지 않으면서도 정밀한 테이블 가이드를 구현했습니다.
* **왜곡 필터 해제 및 프리텐다드(Pretendard) 폰트 전환**: 게임 인터페이스 텍스트 및 UI의 가독성과 WebGL 렌더러의 선명도를 확보하기 위해, 본 작업물 페이지에서는 CSS 왜곡 필터(`crayon-texture`, `static-paper-edge`)를 전면 해제했습니다. 기존 가독성이 떨어지던 손글씨 서체 대신 한국어/숫자 시인성이 검증된 현대적 고딕 서체인 **`Pretendard` 웹 폰트를 루트 레이아웃([layout.tsx](file:///c:/Users/SOGANG/portfolio/app/layout.tsx))의 `<head>` 영역에 직접 `<link>` 태그로 주입**하여 PostCSS 파서 최적화 경고 및 에러를 예방하고 UI 전반의 가독성을 대폭 끌어올렸습니다.
* **불완전성의 물리적 재현:** 유리판 내부의 미세한 기포(Bubble)나 스크래치를 표현하는 미세한 노멀 노이즈 맵 사용.
* **묵직한 관성:** 카드가 날아올 때 바닥과의 마찰로 미끄러지는 미세 댐핑 처리 및 둔탁하고 맑은 유리 부딪힘 음향 효과 연출.
* **손그림 폰트와의 조화:** 3D 카드 위에 렌더링되는 앞면의 숫자와 문양은 전형적인 벡터 폰트 대신 손으로 잉크를 꾹 눌러 쓴 듯한 번진 느낌의 스텐실 패턴 텍스처를 적용.
