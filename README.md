# 🍼 아기도구함 (noriya.kr)

육아 계산기·체크리스트 18종 + 놀이 추천(`play.html`) + 육아 꿀팁(`tips.html`)을 제공하는
**정적 사이트**입니다. 빌드 도구 없이 순수 HTML/CSS/JS로 동작하며,
**GitHub Pages**로 호스팅하고 **Cloudflare**로 DNS/CDN을, **Google Sheets + Apps Script**를
간이 백엔드(콘텐츠 CMS + 방문 로그 수집)로 사용합니다.

이 문서는 2026-07 리뉴얼(전역 메뉴바 추가, SEO 개편, `play.html` 성능 개선),
**2026-07 UI/UX 리디자인**(토스·당근 스타일의 간결함 + 육아 서비스만의 따뜻함, 세이지 그린/샌드
옐로우 디자인 시스템, 하단 탭바, 한 손 조작형 입력 UI 등), 그리고 **2026-07 공통 컴포넌트
중앙화 리팩터링**(`partials.js` 도입으로 내비게이션·푸터·홈 도구 그리드를 단일 소스로 통합) 내용을
포함해 프로젝트 전체 구조와 운영 방법을 정리한 것입니다.

> **최신 작업(공통 컴포넌트 중앙화)은 바로 아래 [0. 공통 컴포넌트 중앙화](#0-공통-컴포넌트-중앙화-partialsjs-2026-07) 섹션을,**
> **UI/UX 리디자인 작업은 [0-B. UI/UX 리디자인 업데이트](#0-b-uiux-리디자인-업데이트-2026-07) 섹션을 참고하세요.**
> 그 이하(1번부터)는 이전 리뉴얼(메뉴바/SEO/성능/개인화 시스템) 문서로, 기능 자체는 이번 작업에서
> 그대로 유지되었습니다.

---

## 0. 공통 컴포넌트 중앙화 (`partials.js`, 2026-07)

### 0-1. 무엇이 문제였나

리디자인 이전 구조는 상단 내비게이션(로고·메뉴·메가메뉴 18개 도구 링크), 모바일 슬라이드
메뉴(동일한 18개 링크), 검색 오버레이, 하단 탭바, 푸터, 그리고 **홈 화면의 18개 도구 카드
전체**가 **22개 HTML 파일에 그대로 복사·붙여넣기** 되어 있었습니다.

즉 "도구 이름을 하나 바꾸거나, 도구를 하나 추가/삭제하려면" 최대 **22개 파일을 전부 손으로
고쳐야** 했고, 실제로 그 결과 `tools/*.html` 푸터의 저작권 연도가 파일마다 `© 2024`/`© 2026`으로
제각각인 것도 발견했습니다(대표적인 "따로 관리해서 생기는 불일치" 사례).

### 0-2. 어떻게 고쳤나 — `partials.js` 단일 소스

새로 추가한 **`partials.js`** 한 파일에 다음을 전부 모았습니다.

1. **`TOOL_CATEGORIES` 배열** — 18개 도구의 유일한 원본 데이터(카테고리, 이모지, 이름, 설명,
   배지, 검색 키워드). 이 배열 하나만 고치면:
   - 상단 메가메뉴
   - 모바일 슬라이드 메뉴
   - 홈 화면 카테고리 칩 스크롤
   - 홈 화면 18개 도구 카드 전체 그리드(+카테고리 사이 인피드 광고 위치)
   - 검색 필터링(`data-name` 키워드)
   
   **다섯 곳이 전부 동시에 자동으로 업데이트됩니다.**
2. **공통 마크업 빌더 함수** — `buildSiteNav()`, `buildMobileNav()`, `buildSearchOverlay()`,
   `buildBottomNav()`, `buildToolFooter()`, `buildSiteFooter()` 등. 각 페이지의
   `data-root-prefix`(`""` 또는 `"../"`)를 읽어 상대경로를 자동으로 맞춰 줍니다.
3. **`mount()` 함수** — 페이지에 남겨둔 자리표시자(placeholder) `<div>`를 찾아 위 함수들이
   만든 실제 마크업으로 교체합니다. 하단 탭바는 자리표시자 없이 항상 자동으로 붙습니다.

### 0-3. 페이지 쪽 마크업이 어떻게 바뀌었나

기존에 수백 줄이던 반복 블록이 각 페이지에서 아래처럼 짧은 자리표시자로 대체됐습니다.

```html
<!-- 이전: <nav class="site-nav">...(메가메뉴 18개 링크)...</nav>
          <div class="mobile-nav">...(동일한 18개 링크 반복)...</div>
          <div class="nav-search-overlay">...</div>
          → 도구 페이지 기준 약 110줄 -->

<!-- 이후 -->
<div id="siteHeader"></div>
```

```html
<!-- 이전: <footer>© 2026 아기도구함 · <a href="../index.html">전체 도구 보기</a></footer> -->
<!-- 이후 (도구 페이지) -->
<div id="siteFooter" data-footer="tool"></div>

<!-- 이후 (홈/놀이/꿀팁/성장기록처럼 안내문+정책링크가 있는 페이지) -->
<div id="siteFooter" data-footer="site" data-home-label="홈으로"></div>
```

`index.html`의 홈 화면 18개 도구 그리드(카테고리 6개 + 도구 카드 18개 + 인피드 광고 2개, 약
210줄)도 아래 한 줄로 대체되고, `partials.js`가 `TOOL_CATEGORIES`로부터 그 자리에서 생성합니다.

```html
<div class="cat-section" id="toolHub"></div>
```

하단 탭바는 별도 자리표시자 없이 모든 페이지의 `</body>` 직전에 `partials.js`가 자동으로
삽입합니다(더 이상 22개 파일에 각각 하드코딩돼 있지 않습니다).

### 0-4. 스크립트 로딩 순서 (중요)

각 페이지 `<head>`에 `partials.js`를 **`nav.js`보다 먼저** 추가했습니다. 모두 `defer`이므로
문서 순서대로 실행되고, `DOMContentLoaded`보다 먼저 끝납니다 — 즉 `nav.js`(메뉴 열기/닫기,
현재 페이지 강조)와 `baby.js`(`[data-baby-badge]` 배지 렌더링)가 동작할 때는 이미
`partials.js`가 실제 마크업을 심어놓은 뒤입니다.

```html
<script src="config.js"></script>
<script src="analytics.js"></script>
<script src="partials.js" defer></script>  <!-- ← 신규, nav.js보다 먼저 -->
<script src="nav.js" defer></script>
<script src="baby.js" defer></script>
```

### 0-5. 도구를 추가·수정·삭제하는 방법 (이제는 한 곳만 고치면 됩니다)

`partials.js` 안의 `TOOL_CATEGORIES` 배열에서 해당 카테고리를 찾아 `tools` 배열 항목을
추가/수정/삭제하면 끝입니다.

```js
{ href: 'tools/new-tool.html', emoji: '🧷', name: '새 도구 이름',
  desc: '카드에 보일 한 줄 설명', badge: 'new', keywords: '검색될 키워드 나열' }
```

- `badge`는 `'hot'`(인기) · `'new'`(NEW) · `'popular'`(추천) · 생략(배지 없음) 중 선택합니다.
- 카테고리 사이 인피드 광고 위치를 옮기고 싶으면 카테고리 객체의 `adSlotAfter: 'INFEED_1'` 값을
  다른 카테고리로 옮기면 됩니다.
- 새 도구 페이지 파일(`tools/new-tool.html`)은 기존 도구 파일을 복사해 헤더/본문만 바꾸면 되고,
  `<div id="siteHeader"></div>` · `<div id="siteFooter" data-footer="tool"></div>` ·
  `partials.js`/`nav.js`/`baby.js` 스크립트 태그만 그대로 유지하면 메뉴에 자동으로 나타납니다.

### 0-6. 검증한 내용

정적 분석(정규식 기반 마크업 무결성 검사) 외에, **실제로 페이지를 로컬 서버에 띄우고
`jsdom`으로 스크립트를 전부 실행**해 다음을 직접 확인했습니다.

| 확인 항목 | 결과 |
|---|---|
| 홈 화면 메가메뉴 도구 링크 수 | 18개 (+ 카테고리 타이틀 링크 6개) 정상 생성 |
| 모바일 메뉴 도구 링크 수 | 18개 정상 생성 |
| 홈 화면 도구 카드 수 / 카테고리 블록 수 | 18개 카드 / 6개 카테고리 정상 생성 |
| 홈 화면 카테고리 칩 수 | 6개 정상 생성 |
| 하단 탭바 | 4개 항목 정상 생성 (홈/놀이/꿀팁/내 아이) |
| 푸터 | 페이지 타입별로 올바른 내용 렌더링 |
| `data-baby-badge` 슬롯 | 상단 nav + 모바일 메뉴 2곳 정상 생성 |
| 도구 검색(`filterTools()`) | "해열제" 검색 시 생성된 카드 중 관련 2개만 정확히 필터링됨 |
| 현재 페이지 강조 (`nav.js`) | `play.html` 접속 시 상단 "놀이 추천"·하단 "놀이" 탭 모두 정확히 활성화 |
| 전 22개 파일 구조 무결성 | `<body>`/`</body>` 1개씩, 자리표시자 1개씩, 구 마크업 잔존 0건 |

### 0-7. 변경/신규 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `partials.js` (신규) | 내비게이션·푸터·홈 카테고리 칩·홈 도구 그리드의 단일 소스. 이 저장소에서 **가장 자주 수정하게 될 파일**입니다 |
| `index.html` | 메가메뉴/모바일메뉴/검색오버레이/카테고리칩/18개 도구 그리드/푸터를 자리표시자로 교체 |
| `growth.html`, `play.html`, `tips.html` | 메가메뉴/모바일메뉴/검색오버레이/푸터를 자리표시자로 교체 (`growth.html`은 기존에 없던 공통 푸터를 새로 추가해 다른 페이지와 통일) |
| `tools/*.html` (18개) | 메가메뉴/모바일메뉴/검색오버레이/푸터를 자리표시자로 교체. 계산 로직·페이지 고유 콘텐츠(브레드크럼, 도구 히어로, 결과 계산 스크립트)는 변경 없음 |
| `nav.js`, `baby.js` | **변경 없음** — `partials.js`가 만든 마크업이 기존과 동일한 클래스/ID/`data-*` 속성을 쓰므로 그대로 호환됩니다 |

### 0-8. 참고 — 이번에 중앙화하지 않은 부분

- **브레드크럼**(페이지 상단 "홈 › 카테고리 › 현재 페이지")과 **`<title>`/메타 태그/JSON-LD**는
  페이지마다 고유한 내용이라 중앙화 대상에서 제외했습니다. 다만 브레드크럼의 카테고리 링크는
  `TOOL_CATEGORIES`에 이미 있는 정보이므로, 향후 원하시면 `partials.js`에
  `buildBreadcrumb(prefix, categoryId, currentTitle)` 함수를 추가해 마저 자동화할 수 있습니다.
- **상단/인피드/결과/푸터 광고 슬롯**은 각 위치가 페이지 흐름 속에 끼워지는 형태라 개별
  마크업은 유지했습니다(단, 홈 화면 인피드 광고 2개는 `TOOL_CATEGORIES`의 `adSlotAfter`로
  이미 중앙화되어 있습니다).

---

## 0-B. UI/UX 리디자인 업데이트 (2026-07)

### 0-1. 작업 범위 & 원칙

기획·디자인 지시서(`noriya.kr UI/UX 기획 및 디자인 지시서`)에 따라 **기존 HTML/CSS/JS 정적
구조와 18종 도구·콘텐츠 기능은 100% 유지**한 채, 시각 디자인/인터랙션만 전면 개편했습니다.

- ✅ **로직 변경 없음**: 계산 함수, `localStorage` 스키마, Google Sheets 연동, 라우팅 구조는
  손대지 않았습니다. 모든 변경은 CSS 토큰·마크업 추가·순수 시각적 JS(타이머 렌더링 등)로 한정했습니다.
- ✅ **디자인 시스템 우선 적용**: 이 프로젝트는 원래부터 `style.css`의 CSS 변수(`--primary`,
  `--radius`, `--shadow` 등)로 색상·형태를 제어하도록 설계돼 있었기 때문에, **루트 토큰을
  교체하는 것만으로 18개 도구 페이지 전체에 새 톤앤매너가 자동 반영**되도록 작업했습니다.
  (도구 페이지마다 흩어져 있던 `<style>`도 모두 같은 `var(--primary)` 등을 참조합니다.)
- ✅ **전 파일 색상 값 일괄 치환**: 기존에 하드코딩돼 있던 舊 팔레트 hex 값(`#3d7a5e`, `#275040`,
  `#c87f1a`, `#7a4d0a` 등 — `meta[theme-color]`, 인라인 `<style>`, `growth.html`의 Chart.js
  색상, `analytics.js` 콘솔 로그 스타일까지 포함)을 새 팔레트로 스크립트 일괄 치환해 사이트
  전체의 색상 일관성을 보장했습니다.

### 0-2. 새 디자인 시스템 (컬러 · 라운딩 · 타이포)

`style.css`의 `:root` 토큰을 지시서 기준으로 전면 교체했습니다.

| 토큰 | 이전 | 변경 후 | 의미 |
|---|---|---|---|
| `--primary` | `#3d7a5e` (신뢰의 초록) | **`#4A7C59`** (포근한 세이지 그린) | 브랜드 메인 컬러 |
| `--primary-dark` / `--primary-mid` / `--primary-light` | — | `#33573F` / `#CFE6D9` / `#EEF5F0` | 세이지 그린 파생 톤 |
| `--amber` | `#c87f1a` | **`#E9A825`** (따뜻한 샌드 옐로우) | D-day·추천 배지 강조색 |
| `--amber-light` / `--amber-mid` | — | `#FBF4E4` / `#F4E8C1` | 샌드 옐로우 파생 톤 |
| `--page-bg` (신규) | `--bg:#fff` | **`#F9F9F6`** (오프 화이트) | 페이지 배경 — 눈의 피로도 최소화 |
| `--surface` | `#f8f8f6` | `#F0F0EA` (소프트 크림) | 카드 내부 보조 배경 |
| `--radius` / `--radius-sm` | `12px` / `7px` | **`20px` / `14px`** (+`--radius-lg:24px`) | 카드 라운딩 확대 |
| 폰트 | 시스템 폰트 우선 | **Pretendard**(CDN) 우선, `Noto Sans KR` 폴백 | 동글동글하고 가독성 높은 국문 서체 |

카피(문구) 톤은 기존에 이미 "민준이의 120일 차, 오늘 권장 수유량이에요" 같은 위로형 말투가
`baby.js`/각 도구 페이지에 적용돼 있어 유지했고, 새로 추가한 홈 추천 배너에도 동일한 톤(`오늘의
추천`, `〜해보세요`)을 사용했습니다.

### 0-3. 새로 추가된 컴포넌트 (`style.css`)

| 컴포넌트 | 설명 | 적용 위치 |
|---|---|---|
| **하단 탭 네비게이션** `.bottom-nav` / `.bn-item` | 모바일(860px 이하)에서 화면 하단에 고정되는 `[🏠 홈] [🧸 놀이] [💡 꿀팁] [👶 내 아이]` 4탭. `nav.js`가 현재 경로를 감지해 `.active` 클래스 부여 | **전 페이지 22개** (`index/growth/play/tips.html` + `tools/*.html` 18개) 공통 스니펫 삽입 |
| **마이크로 인터랙션** (Active Scale) | 카드·버튼·칩을 탭하면 `transform:scale(.97)`로 눌리는 느낌 제공 | 전역 (`.tool-card`, `.tip-card`, `.pill-btn`, `.calc-btn`, `.bn-item` 등) |
| **스켈레톤 로더** `.skeleton` | 반짝이는 shine 애니메이션 | 전역 유틸리티 클래스로 추가 (필요 시 로딩 요소에 부착) |
| **카테고리 칩 스크롤** `.cat-chip-scroll` | 홈 화면 검색창 바로 아래, 6개 카테고리로 가로 스크롤 바로가기 | `index.html` |
| **Sticky 필터 칩바** `.cat-filter` | 놀이/꿀팁 목록 상단에 카테고리 필터가 스크롤해도 고정 | `play.html`, `tips.html` |
| **원형 프로그레스 타이머** `.radial-timer` | conic-gradient 기반 원형 진행률 표시. 해열제 교차 투약 카운트다운을 원형 게이지로 시각화 | `tools/fever-medicine.html` (다른 타이머형 도구에도 동일 클래스로 확장 가능) |
| **퀵 조절 칩 / 스텝퍼** `.quick-chip`, `.stepper-btn` | `+10ml`, `+1시간` 같은 빠른 수치 조절용 컴포넌트 (범용 유틸리티로 추가, 필요한 도구에서 바로 사용 가능) | 전역 유틸리티 |
| **하단 시트 슬라이드업** `.detail-wrap { animation:sheet-up }` | 놀이/꿀팁 상세 보기 전환 시 아래→위로 슬라이드되는 모션 | `play.html`, `tips.html` (기존 SPA 상세뷰 요소에 애니메이션만 추가) |
| **뱃지 팝 모션** `.badge-item` | 스트릭 뱃지 카드에 통통 튀는 등장 애니메이션 | `growth.html` |
| **오늘의 추천 배너** `.bd-reco` | 홈 히어로 카드 상단에 아이 월령 기반 "오늘 OO는 ~가 필요해요" 개인화 문구 + 바로가기 | `index.html` (`baby.js`의 `renderHomeDashboard()`에 로직 추가) |

### 0-4. 화면별 변경 요약

- **홈 (`index.html`)**: 검색창 아래 카테고리 칩 스크롤 추가, 히어로 대시보드 카드 상단에
  월령 기반 "오늘의 추천" 배너 노출(신규 등록 아동 로직은 `baby.js`), 기존 도구 그리드·꿀팁/놀이
  프리뷰 섹션은 새 카드 라운딩·그림자·컬러로 자동 반영.
- **도구 18종 (`tools/*.html`)**: 입력 필드가 더 커지고(최소 높이 52px, 폰트 17px) 라운딩이
  커진 버튼(`calc-btn`)으로 한 손 조작성을 강화. 결과 카드(`result-box`)는 상태 컬러(세이지=안전,
  샌드=주의, 레드=경고) 유지하되 전체 라운딩 카드형으로 개편. `fever-medicine.html`은 교차 투약
  타이머를 원형 프로그레스 게이지로 고도화(쇼케이스 — 동일 패턴을 다른 타이머형 도구에도
  `.radial-timer` 클래스로 손쉽게 확장 가능).
- **놀이/꿀팁 (`play.html`, `tips.html`)**: 카테고리 필터 칩을 상단 고정(Sticky)으로 전환, 꿀팁
  카드에 "⏱️ N분 컷" 읽는 시간 배지 추가, 상세 보기 전환 시 슬라이드업 모션 적용.
- **내 아이 (`growth.html`)**: 성장 그래프(Chart.js) 색상을 새 팔레트로 교체, 뱃지 카드에 팝
  애니메이션 추가. 기존 프로필/예방접종/그래프/뱃지 로직은 그대로 유지됩니다.
- **전 페이지 공통**: 하단 4탭 네비게이션 바 신설로 엄지손가락만으로 홈/놀이/꿀팁/내 아이 이동 가능.
  18종 도구 접근은 지시서대로 홈 화면 그리드를 통해 이루어집니다.

### 0-5. 변경/미변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `style.css` | 전면 재작성 (디자인 토큰, 신규 컴포넌트 다수 추가) |
| `nav.js` | 하단 탭바 active 상태 하이라이트 로직 추가 (기존 메가메뉴/모바일메뉴/검색 로직은 그대로) |
| `baby.js` | `renderHomeDashboard()`에 월령 기반 추천 배너(`bd-reco`) 로직 추가. 그 외 CRUD/D-day/스트릭 로직은 변경 없음 |
| `index.html` | 카테고리 칩 스크롤 마크업 추가 + 하단 탭바 삽입 |
| `play.html` / `tips.html` | 읽는 시간 배지(꿀팁), Sticky 필터, 하단 탭바 삽입 (목록/상세 SPA 로직 변경 없음) |
| `growth.html` | 하단 탭바 삽입 (프로필/그래프/뱃지 로직 변경 없음) |
| `tools/*.html` (18개) | 하단 탭바 삽입 + 전역 컬러 토큰 자동 반영. `fever-medicine.html`만 원형 타이머 마크업/JS 추가, 나머지는 계산 로직 변경 없이 새 디자인 시스템만 상속 |
| `admin/*` | **변경 없음** (내부 전용 대시보드로 지시서 범위 밖) |
| `config.js`, `analytics.js`, `sitemap.xml`, `robots.txt`, `ads.txt`, `CNAME` | 색상 hex 값(로그 스타일 등)만 일괄 치환, 기능 변경 없음 |

### 0-6. 로컬에서 확인하는 법

```bash
python3 -m http.server 8000
# http://localhost:8000/index.html 접속 후
# 1) 브라우저 폭을 375px(모바일) 로 줄여 하단 탭바 노출 확인
# 2) 홈 화면 카테고리 칩을 눌러 해당 섹션으로 스크롤되는지 확인
# 3) growth.html에서 아이 등록 후 index.html에서 "오늘의 추천" 배너가 뜨는지 확인
# 4) tools/fever-medicine.html에서 체중 입력 → "지금 먹임" 클릭 → 원형 타이머가 채워지는지 확인
# 5) play.html / tips.html 카테고리 필터를 스크롤해도 상단에 고정되는지 확인
```

### 0-7. 향후 확장 제안 (이번 범위 밖)

- `.quick-chip`, `.stepper-btn`, `.radial-timer`는 전역 유틸리티로 준비만 해두었습니다. 지시서의
  "18개 도구 전체에 퀵 조절 버튼/원형 타이머 적용"까지 확장하려면, 각 도구의 계산 로직(JS)에
  맞춰 도구별로 마크업을 연결하는 추가 작업이 필요합니다 (`fever-medicine.html`을 참고 구현으로 사용).
- 놀이/꿀팁의 "월령 필터"는 현재 기존 **카테고리 필터**를 스티키 UI로 개편한 것입니다. 지시서가
  의도한 "0~3개월/4~6개월…" 형태의 **월령 구간 필터**로 바꾸려면 Google Sheets 데이터에 월령
  구간 필드를 추가하고 `play.html`/`tips.html`의 필터링 JS 로직을 함께 수정해야 합니다.

---

## 목차

1. [이번 업데이트 요약](#1-이번-업데이트-요약)
2. [디렉토리 구조](#2-디렉토리-구조)
3. [기술 스택 & 아키텍처](#3-기술-스택--아키텍처)
4. [로컬 개발 · 테스트 방법](#4-로컬-개발--테스트-방법)
5. [배포 방법 (GitHub Pages + Cloudflare)](#5-배포-방법-github-pages--cloudflare)
6. [Google Sheets / Apps Script 연동](#6-google-sheets--apps-script-연동)
7. [전역 메뉴바(내비게이션) 구조](#7-전역-메뉴바내비게이션-구조)
8. [SEO 체크리스트](#8-seo-체크리스트)
9. [`play.html` 성능 개선 상세](#9-playhtml-성능-개선-상세)
10. [새 도구(계산기) 추가하는 법](#10-새-도구계산기-추가하는-법)
11. [Admin 대시보드](#11-admin-대시보드)
12. [알려진 제약 & 다음 단계 제안](#12-알려진-제약--다음-단계-제안)
13. [내 아이 시스템(개인화·재방문) 상세](#13-내-아이-시스템개인화재방문-상세)

---

## 1. 이번 업데이트 요약

| 영역 | 내용 |
|---|---|
| **전역 메뉴바** | 모든 페이지(홈/놀이/꿀팁/도구 18개) 상단에 고정 내비게이션 추가. 데스크톱은 "도구 모음" 메가 메뉴(6개 카테고리 드롭다운), 모바일은 햄버거 + 아코디언 메뉴. 검색 아이콘으로 어디서든 도구 검색 가능 |
| **UX 개선** | 도구 상세 페이지에 브레드크럼(홈 › 카테고리 › 도구) 추가, 홈 카테고리 블록에 앵커 ID 부여(메가 메뉴에서 바로 이동), 홈 상단 배지 "도구 12개" → 실제 개수(18개)로 수정 |
| **SEO** | 전 페이지에 `canonical`, Open Graph/Twitter 카드 보강, `robots` 메타, `JSON-LD` 구조화 데이터(WebSite/Organization/BreadcrumbList/ItemList/WebApplication/CollectionPage) 추가. `sitemap.xml`에 누락돼 있던 `play.html`/`tips.html`/`growth.html` 추가 및 `lastmod` 갱신. `robots.txt`에 `/admin/` 차단 추가 |
| **`play.html` 속도 개선** | ① Apps Script 응답을 `localStorage`에 캐시(stale-while-revalidate)해 재방문 시 즉시 렌더링 ② 카카오맵 지오코딩 결과를 `localStorage`에 캐시(7일)해 동일 주소 재조회 방지 ③ 지도 섹션을 `IntersectionObserver`로 **스크롤 시 지연 로딩**하도록 변경(첫 화면 렌더링이 지도/지오코딩을 기다리지 않음) ④ 지오코딩 대상 주소 수 상한(24개)으로 최초 방문 시 응답 지연 최소화 ⑤ `dapi.kakao.com` 등 `preconnect` 추가 |
| **재방문·체류시간 강화 (내 아이 시스템)** | `growth.html`을 새로 추가하고 `baby.js` 개인화 엔진으로 ① 아이 프로필(이름·생일·성별)을 브라우저에 저장해 18개 도구에 자동 입력 ② 예방접종 D-day 체크리스트 ③ 성장 기록(몸무게·키) + 추이 그래프 ④ 연속 방문 스트릭 + 뱃지(3/7/14/30/100/365일, 방문·기록 횟수)를 제공. 상단 메뉴바에 아이 나이/스트릭이 항상 노출됨 |

> 자세한 원리는 [9. `play.html` 성능 개선 상세](#9-playhtml-성능-개선-상세)와 [13. 내 아이 시스템(개인화·재방문) 상세](#13-내-아이-시스템개인화재방문-상세) 참고.

---

## 2. 디렉토리 구조

```
.
├── index.html               # 홈 — 도구 18종 그리드, 카테고리별 정리, 검색, 내 아이 대시보드 카드
├── play.html                 # 놀이 추천 — 목록/상세 SPA형 페이지 (Sheet2 연동)
├── tips.html                 # 육아 꿀팁 — 목록/상세 SPA형 페이지 (Sheet1 연동)
├── growth.html                # 내 아이 — 프로필 등록, 예방접종 D-day, 성장 기록+그래프, 스트릭/뱃지
├── style.css                  # 전역 스타일시트 (홈/놀이/꿀팁/성장기록 공통, 도구 페이지는 자체 <style> 포함)
├── nav.js                     # 전역 메뉴바 동작 스크립트 (메가 메뉴 / 모바일 메뉴 / 검색 오버레이)
├── baby.js                     # 개인화 엔진 — 아이 프로필/성장기록/예방접종 D-day/방문 스트릭 (localStorage 전용)
├── config.js                  # 사이트 설정값 (AdSense, 시트 URL, GA, 카카오맵 키 등) — 배포 전 값 교체 필요
├── analytics.js               # 자체 방문 로그 수집 (배치 전송, Apps Script 트래커로 GET 전송)
├── CNAME                      # GitHub Pages 커스텀 도메인 설정 (noriya.kr)
├── robots.txt                 # 크롤러 정책 (/admin/ 차단)
├── sitemap.xml                 # 검색엔진 제출용 사이트맵 (전 페이지 포함)
├── ads.txt                     # Google AdSense 인증 파일
│
├── tools/                      # 도구(계산기/체크리스트) 18개 — 카테고리별 정리
│   ├── sleep-calculator.html      # 🌙 수유·수면 — 아기 수면 사이클 계산기
│   ├── feeding-tracker.html       # 🌙 수유·수면 — 수유 간격 타이머 & 일지
│   ├── colic-checker.html         # 🌙 수유·수면 — 영아산통 체크 & 달래기
│   ├── weaning-checker.html       # 🥣 이유식·영양 — 이유식 재료 월령 체커
│   ├── milk-calculator.html       # 🥣 이유식·영양 — 분유·수유량 계산기
│   ├── weaning-planner.html       # 🥣 이유식·영양 — 이유식 스케줄 플래너
│   ├── growth-percentile.html     # 📏 성장·발달 — 성장 백분위수 계산기
│   ├── milestone-checker.html     # 📏 성장·발달 — 발달 마일스톤 체크리스트
│   ├── tooth-checker.html         # 📏 성장·발달 — 유치 발육 시기 체커
│   ├── fever-medicine.html        # 💊 건강·응급 — 소아 해열제 용량 계산기
│   ├── fever-tracker.html         # 💊 건강·응급 — 체온 기록 & 해열제 교차 타이머
│   ├── medicine-guide.html        # 💊 건강·응급 — 소아 약 종류별 복용 가이드
│   ├── school-date.html           # 🏫 입학·지원금 — 입소·입학 날짜 계산기
│   ├── subsidy-calculator.html    # 🏫 입학·지원금 — 육아 지원금 총정리 계산기
│   ├── parental-leave.html        # 🏫 입학·지원금 — 육아휴직 급여 계산기
│   ├── pregnancy-week.html        # 🤰 임신·준비 — 임신 주수 & 출산 예정일 계산기
│   ├── baby-name.html             # 🤰 임신·준비 — 아기 이름 짓기 도우미
│   └── birth-checklist.html       # 🤰 임신·준비 — 출산 준비물 체크리스트
│
└── admin/                       # 내부 전용 관리자 대시보드 (검색엔진 차단, 비공개 URL로만 접근 권장)
    ├── index.html                  # 방문 통계/이벤트 대시보드 (Chart.js), CONFIG.ADMIN_PASSWORD로 잠금
    ├── tracker.gs                  # Google Sheets에 붙이는 Apps Script — 방문 이벤트 수집 엔드포인트
    └── GA_SETUP.md                 # GA4 + 서비스 계정 연동 절차 문서
```

**빌드 과정이 없습니다.** 모든 `.html` 파일은 그 자체로 최종 배포물이며, 저장 즉시 브라우저에서 열어 확인할 수 있습니다.

---

## 3. 기술 스택 & 아키텍처

- **프론트엔드**: 순수 HTML5 + CSS3 + Vanilla JS (프레임워크/번들러 없음)
- **콘텐츠 CMS**: Google Sheets 2개 시트를 Apps Script 웹앱으로 JSON API화
  - `tips.html` → `CONFIG.SHEET_JSON_URL` (Sheet1, 꿀팁)
  - `play.html` → `CONFIG.PLAY_SHEET_URL` (Sheet2, 놀이 활동)
- **지도**: 카카오맵 JS SDK (`CONFIG.KAKAO_MAP_KEY`) — `play.html`의 "내 주변" 지도에서만 동적 로드
- **광고**: Google AdSense (`CONFIG.ADSENSE_CLIENT`) — `config.js`가 자동으로 `<script>` 주입
- **분석**: 자체 `analytics.js`(배치 GET 전송) + 선택적 GA4(`CONFIG.GA_ID`)
- **호스팅**: GitHub Pages (정적 파일 서빙) + `CNAME`으로 커스텀 도메인 `noriya.kr` 연결
- **DNS/CDN**: Cloudflare (프록시 On 상태에서 캐싱·HTTPS·방화벽 등을 담당— Cloudflare 설정 자체는 이 저장소 밖에서 관리)
- **관리자 대시보드**: `admin/index.html`이 GA4 Data API를 Apps Script 프록시로 호출해 시각화

```
방문자 브라우저
   ├─ 정적 HTML/CSS/JS ← GitHub Pages (Cloudflare 프록시 경유)
   ├─ 꿀팁/놀이 데이터 ← Google Sheets → Apps Script(JSON) → fetch()
   ├─ 지도/주소 변환   ← 카카오맵 SDK + Geocoder API
   ├─ 광고             ← Google AdSense
   └─ 방문 로그         ← analytics.js → Apps Script(tracker.gs) → Google Sheets
                                              ↓
                                    admin/index.html (내부 대시보드)
```

---

## 4. 로컬 개발 · 테스트 방법

빌드 과정이 없으므로 **정적 파일 서버만 있으면** 됩니다. `file://`로 직접 여는 것은 `fetch()`가
CORS로 막힐 수 있어 권장하지 않습니다.

### 4-1. 로컬 서버 실행

```bash
# 프로젝트 루트에서
python3 -m http.server 8000
# 또는
npx serve .
```

브라우저에서 `http://localhost:8000/index.html` 접속.

### 4-2. 페이지별 확인 포인트

| 페이지 | 확인할 것 |
|---|---|
| `index.html` | 카테고리 6개 × 도구 3개(총 18개) 정상 노출, 검색창 입력 시 실시간 필터링, 상단 메뉴바 "도구 모음" 메가 메뉴에서 각 카테고리 클릭 시 홈 해당 섹션(`#cat-...`)으로 스크롤 |
| `tools/*.html` | 상단에 브레드크럼(홈 › 카테고리 › 도구명) 노출, 계산 로직 정상 동작, 모바일 폭(375px)에서 햄버거 메뉴 정상 |
| `play.html` | 목록이 빠르게 뜨는지(카드/랭킹/연령별 먼저), 지도 섹션까지 스크롤했을 때만 카카오맵이 로드되는지(개발자 도구 Network 탭에서 `dapi.kakao.com` 요청이 스크롤 전에는 안 나가는지 확인) |
| `tips.html` | 꿀팁 목록/상세 전환, `config.js`의 `SHEET_JSON_URL` 미설정 시 샘플 데이터로 폴백되는지 |
| `admin/index.html` | `CONFIG.ADMIN_PASSWORD` 입력 후 대시보드 진입 (검색엔진에는 절대 노출되지 않아야 함 — `robots.txt`/`noindex` 확인) |

### 4-3. 자동 점검 스크립트 (선택)

내부 링크 깨짐 여부, 인라인 JS 문법 오류를 빠르게 점검하고 싶다면:

```bash
# 1) 모든 인라인 <script> 블록 문법 검사 (Node 필요)
for f in index.html play.html tips.html tools/*.html; do
  node -e "
    const fs = require('fs');
    const html = fs.readFileSync('$f', 'utf8');
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    scripts.forEach((m, i) => {
      try { new Function(m[1]); }
      catch (e) { console.error('$f block'+i, e.message); process.exitCode = 1; }
    });
  "
done

# 2) 로컬 서버 구동 후 내부 링크(href/src) 200 응답 확인
python3 -m http.server 8000 &
sleep 1
python3 - <<'PY'
import re, urllib.request, posixpath, os
base = "http://localhost:8000/"
files = ["index.html","play.html","tips.html"] + [f"tools/{f}" for f in os.listdir("tools") if f.endswith(".html")]
for fname in files:
    html = open(fname, encoding="utf-8").read()
    for h in re.findall(r'href="([^"]+)"', html) + re.findall(r'src="([^"]+)"', html):
        if h.startswith(("http","#","mailto")) or "${" in h:
            continue
        rel = posixpath.normpath(posixpath.join(posixpath.dirname(fname), h.split("#")[0]))
        try:
            r = urllib.request.urlopen(base+rel, timeout=3)
            assert r.status == 200
        except Exception as e:
            print("BROKEN:", fname, "->", h, e)
PY
```

### 4-4. Lighthouse로 성능/SEO 점검

Chrome 개발자 도구 → Lighthouse 탭 → `play.html`에서 **Performance + SEO** 카테고리 실행을 권장합니다.
`play.html`은 이번 업데이트로 초기 로드시 카카오맵을 부르지 않으므로, 이전 대비 LCP(최대 콘텐츠풀 페인트)가
크게 개선되어야 합니다. Network 탭에서 `dapi.kakao.com` 요청이 스크롤 이전에는 발생하지 않는지도 함께 확인하세요.

---

## 5. 배포 방법 (GitHub Pages + Cloudflare)

### 5-1. GitHub Pages

1. 이 저장소의 `main`(또는 지정 브랜치)에 push
2. 저장소 **Settings → Pages** → Source를 해당 브랜치 `/ (root)`로 설정
3. `CNAME` 파일에 `noriya.kr`이 이미 들어 있으므로, GitHub가 자동으로 커스텀 도메인을 인식
4. **Settings → Pages → Enforce HTTPS** 체크 (Cloudflare 프록시를 켠 상태라면 SSL/TLS 모드를 "Full" 이상으로 맞춰야 인증서 오류가 나지 않습니다)

### 5-2. Cloudflare

1. `noriya.kr` 도메인의 네임서버를 Cloudflare로 이전
2. DNS 레코드: `A`/`ALIAS` 또는 `CNAME`으로 GitHub Pages IP(`185.199.108.153` 등 4개) 또는
   `<github-username>.github.io`를 가리키도록 설정, 프록시(주황 구름) **On**
3. **SSL/TLS → 개요**: `Full` 이상으로 설정 (GitHub Pages가 자체 인증서를 발급하므로 `Flexible`은 리다이렉트 루프 위험)
4. **캐싱**: 정적 자산(`*.css`, `*.js`)에 Cache Rules로 장기 캐시(`Cache-Control: max-age`) 적용 권장.
   단, `index.html`/`play.html`/`tips.html`은 배포 직후 반영이 늦어지지 않도록 캐시 TTL을 짧게 유지하거나
   "Purge Cache"를 배포 스크립트에 포함하는 것을 권장합니다.
5. **Page Rules / Speed**: Auto Minify(HTML/CSS/JS), Brotli 압축 활성화

---

## 6. Google Sheets / Apps Script 연동

`config.js`에 다음 3개의 Apps Script 웹앱 URL이 필요합니다.

| 설정 키 | 용도 | 대응 시트 |
|---|---|---|
| `SHEET_JSON_URL` | 육아 꿀팁 콘텐츠 | Sheet1 |
| `PLAY_SHEET_URL` | 놀이 추천 활동 콘텐츠 | Sheet2 |
| `TRACKER_URL` | 방문 이벤트 수집 (`admin/tracker.gs` 배포 URL) | 별도 로그 시트 |

### 배포 절차 (요약)

1. Google Sheets에서 **확장 프로그램 → Apps Script**
2. `doGet(e)` 함수로 해당 시트를 JSON 배열로 반환하는 스크립트 작성 (Sheet2 연동 시
   `SpreadsheetApp.getActiveSpreadsheet().getSheets()[1]`처럼 시트 인덱스 지정 필요 — `config.js` 주석 참고)
3. **배포 → 새 배포 → 웹 앱**: 액세스 권한 "모든 사용자"로 설정 후 배포
4. 발급된 URL을 `config.js`의 해당 키에 붙여넣기
5. `admin/tracker.gs`는 별도 시트에 붙여 넣고 동일하게 웹앱으로 배포 → `TRACKER_URL`에 입력

> **주의**: `config.js`에는 실제 Apps Script URL, 카카오맵 키, 관리자 비밀번호 등 민감한 값이 포함됩니다.
> 공개 저장소라면 `config.js`를 `.gitignore`에 추가하고 배포 파이프라인에서 주입하는 방식을 권장합니다
> (파일 상단 주석에도 안내되어 있습니다). `ADMIN_PASSWORD`는 반드시 기본값에서 변경하세요.

GA4/서비스 계정 연동은 `admin/GA_SETUP.md`에 단계별로 정리되어 있습니다.

---

## 7. 전역 메뉴바(내비게이션) 구조

이번 업데이트로 모든 페이지(`index.html`, `play.html`, `tips.html`, `tools/*.html`)에
동일한 상단 메뉴바가 삽입되었습니다.

- **로고** → 항상 홈으로
- **홈 / 놀이 추천 / 육아 꿀팁**: 1뎁스 메뉴
- **도구 모음**: 클릭 시 6개 카테고리(수유·수면 / 이유식·영양 / 성장·발달 / 건강·응급 / 입학·지원금 / 임신·준비)를
  2열 그리드로 보여주는 메가 메뉴. 각 카테고리 제목을 클릭하면 홈의 해당 섹션(`#cat-수면수유` 등)으로 이동
- **검색 아이콘(🔍)**: 오버레이로 검색창을 띄우고, 제출 시 `index.html?q=검색어`로 이동 →
  홈 페이지 로드시 자동으로 검색창에 값이 채워지고 결과가 필터링됨 (`index.html`의 `applyQueryFromNav()` 참고)
- **모바일(≤860px)**: 햄버거 버튼(☰) → 전체화면 메뉴, 카테고리는 아코디언(첫 번째만 기본 펼침)

구현 파일:
- 마크업: 각 HTML 파일 상단 `<nav class="site-nav">…</nav>` + `.mobile-nav` + `.nav-search-overlay`
- 스타일: `style.css`의 `PRIMARY NAV LINKS` / `MEGA MENU` / `MOBILE HAMBURGER` / `BREADCRUMB` 섹션
- 동작: `nav.js` (메가 메뉴 토글, 모바일 메뉴 토글, 검색 오버레이, 현재 페이지 하이라이트)

메뉴 항목이나 카테고리 구성을 바꾸려면 `tools/*.html`을 하나하나 고치는 대신, 향후에는
`nav.js`가 데이터 기반으로 마크업까지 생성하도록 리팩터링하는 것을 권장합니다 (현재는 SEO를 위해
각 HTML 파일에 정적 마크업으로 직접 삽입되어 있어 일괄 변경 시 스크립트 재실행이 필요합니다 — 아래 참고).

> 내비게이션 구조를 다시 일괄 생성해야 한다면(카테고리 추가/도구 추가 등), 이 리뉴얼 작업 시 사용한
> 생성 스크립트 로직(카테고리 → 메가 메뉴/모바일 메뉴 HTML 생성 후 각 파일의 `<nav class="site-nav">…</nav>`
> 블록을 치환)을 참고해 유사한 스크립트를 다시 작성해 사용하세요.

---

## 8. SEO 체크리스트

이번 업데이트에서 반영된 항목:

- [x] 전 페이지 `<link rel="canonical">` 추가 (중복 콘텐츠 방지)
- [x] Open Graph(`og:type`, `og:url`, `og:site_name`, `og:locale`, `og:image`) + Twitter Card 보강
- [x] `<meta name="robots" content="index, follow, max-image-preview:large">` 명시
- [x] `admin/`은 `robots.txt` 차단 + `noindex, nofollow` 유지
- [x] JSON-LD 구조화 데이터
  - `index.html`: `WebSite`(사이트 내 검색 기능 포함) + `Organization` + `ItemList`(도구 18개)
  - `play.html` / `tips.html`: `CollectionPage` + `BreadcrumbList`
  - `tools/*.html`: `WebApplication`(무료 웹앱으로 표시) + `BreadcrumbList`(홈 › 카테고리 › 도구명)
- [x] `sitemap.xml`에 `play.html`/`tips.html` 누락 문제 수정, 전체 `lastmod` 최신화
- [x] 카테고리 블록에 고유 앵커(`#cat-수면수유` 등) 부여 → 내부 링크 구조 강화
- [x] 홈 상단 배지 등 실제 콘텐츠 수와 불일치하던 문구 수정(신뢰도/체류시간에 영향)
- [x] `play.html` 로딩 속도 개선 → Core Web Vitals(LCP) 개선은 검색 순위에도 직접 반영되는 요소

### 배포 후 추가로 해야 할 것 (저장소 밖 작업)

1. **Google Search Console**에 `https://noriya.kr` 속성 등록 → `sitemap.xml` 제출
2. `og:image`로 지정한 `https://noriya.kr/og-default.png` 실제 이미지 파일 업로드 (현재는 경로만 지정된 상태이므로,
   1200×630px 크기의 대표 이미지를 만들어 루트에 추가해야 링크 미리보기가 정상 표시됩니다)
3. 각 도구 페이지의 `<title>`/`meta description`이 **핵심 키워드 + 사용자 의도**를 담고 있는지 주기적으로 재검토
   (예: "아기 수면 사이클 계산기" → "생후 3개월 아기 낮잠 시간표" 같은 롱테일 키워드 실험)
4. Search Console의 "페이지 색인 생성 상태"에서 `admin/`이 실제로 제외되는지 확인

---

## 9. `play.html` 성능 개선 상세

기존에 `play.html`(`https://noriya.kr/play.html`)이 느렸던 핵심 원인과 이번 개선 내용입니다.

### 문제 1 — Google Apps Script 콜드 스타트
Sheet2 데이터를 가져오는 Apps Script 웹앱은 트래픽이 뜸하면 콜드 스타트로 응답까지 수 초가 걸릴 수 있습니다.
방문할 때마다 이 응답을 기다려야 했습니다.

**개선**: `localStorage`에 최근 응답을 캐시하고, **stale-while-revalidate** 전략을 적용했습니다.
- 캐시가 있으면 즉시 화면에 반영 (체감 로딩 시간 0에 가까움)
- 캐시가 5분 이상 지났으면 화면은 그대로 둔 채 백그라운드에서 최신 데이터로 조용히 갱신
- 캐시가 24시간 넘게 지나면 폐기 (콘텐츠가 아예 오래된 채로 남지 않도록)
- 캐시가 전혀 없는 최초 방문자만 실제 네트워크 응답을 기다림 (구조적으로 불가피)

### 문제 2 — "내 주변" 지도의 실시간 지오코딩
페이지가 열릴 때마다 시트에 있는 **모든 활동의 주소**를 카카오 Geocoder API로 하나씩 좌표 변환했습니다.
항목 수만큼 API 왕복이 발생해 가장 큰 지연 요인이었습니다.

**개선**:
1. 주소별 좌표 변환 결과를 `localStorage`에 7일간 캐시 → 동일 주소는 두 번 다시 API를 호출하지 않음
2. 지오코딩 대상을 상위 24개로 상한 설정 → 어차피 "가까운 5곳"만 보여주므로 과도한 호출 방지
3. **지도 섹션을 `IntersectionObserver`로 지연 로딩**으로 전환 — 카카오맵 SDK 로드 + 지오코딩 자체를
   사용자가 그 섹션에 스크롤해서 도달했을 때(정확히는 400px 앞서서) 시작하도록 변경.
   즉 대부분의 방문자가 먼저 보게 되는 **랭킹/연령별 추천/실시간 인기/최저가** 섹션은
   지도와 무관하게 즉시 렌더링됩니다.

### 문제 3 — 리소스 힌트 부재
`dapi.kakao.com`, `script.google.com`, `pagead2.googlesyndication.com`에 대한 `preconnect`가 없어
실제 요청이 발생할 때 DNS/TLS 핸드셰이크부터 새로 시작했습니다. → `<link rel="preconnect">` 추가.

### 검증 방법
1. 로컬 서버로 `play.html` 접속 → 개발자 도구 Network 탭에서 `dapi.kakao.com`,
   `maps.google.com` 관련 요청이 **최초 로드 시점에는 발생하지 않고**, 지도 섹션까지 스크롤했을 때만
   발생하는지 확인
2. 같은 페이지를 새로고침 → Application 탭 → Local Storage에 `playDataCache_v1`,
   `kakaoGeocodeCache_v1` 키가 쌓이는지, 두 번째 방문부터 목록이 훨씬 빨리 뜨는지 확인
3. Lighthouse Performance 점수 및 LCP 지표 비교 (지도 스크립트 지연 로딩 전/후)

---

## 10. 새 도구(계산기) 추가하는 법

1. `tools/` 안의 기존 파일(예: `sleep-calculator.html`) 하나를 복사해 새 파일명으로 저장
2. `<title>`, `meta description`, `<h1>` 등 콘텐츠 교체
3. 상단 `<nav class="site-nav">…</nav>` ~ `.nav-search-overlay` 블록은 다른 도구 페이지와
   동일한 구조를 유지하되, 실제로는 **메가 메뉴/모바일 메뉴에 새 도구 링크를 추가**해야 하므로
   아래 두 곳을 함께 갱신하는 것을 권장합니다.
   - `index.html`의 해당 `.cat-block`에 카드 추가
   - 전 페이지 상단 메뉴바의 메가 메뉴 / 모바일 메뉴에 새 링크 추가 (7번 항목 참고 — 스크립트 기반 일괄 반영 권장)
4. 새 파일 상단에 브레드크럼 삽입: `홈 › {카테고리} › {새 도구명}`
5. `sitemap.xml`에 새 URL 추가 (`<changefreq>monthly</changefreq>` 등 기존 패턴 참고)
6. 로컬 서버로 열어 계산 로직 및 반응형 레이아웃 확인 (4번 항목 테스트 방법 참고)

---

## 11. Admin 대시보드

- 경로: `/admin/index.html` — **검색엔진에는 노출되지 않도록** `robots.txt`에서 차단, `noindex, nofollow` 적용됨
- 접근 시 `config.js`의 `ADMIN_PASSWORD`를 입력해야 진입 가능 (배포 전 반드시 변경)
- GA4 연동 방법은 `admin/GA_SETUP.md` 참고
- 자체 방문 로그(`analytics.js` → `admin/tracker.gs`)는 GA4와 별개로 동작하며, GA4 없이도
  기본적인 방문/이벤트 통계를 볼 수 있도록 설계되어 있습니다

> 추가 보안이 필요하다면 비밀번호 방식 대신 Cloudflare Access(사내 이메일 인증 등)로
> `/admin/*` 경로 자체를 원천 차단하는 것을 권장합니다.

---

## 12. 알려진 제약 & 다음 단계 제안

- **빌드 시스템 없음**: 18개 도구 페이지가 각자 `<style>`을 인라인으로 갖고 있어 공통 스타일 변경 시
  파일을 일일이 수정해야 합니다. 장기적으로는 공통 CSS로 통합하거나 간단한 정적 사이트 생성기 도입을
  고려할 수 있습니다.
- **메뉴바가 각 HTML에 정적으로 중복 삽입**되어 있음(SEO/성능을 위한 의도적 선택). 메뉴 구조를
  자주 바꿀 계획이라면, 지금처럼 스크립트로 일괄 치환하는 절차를 유지·문서화하거나, 서버사이드
  include가 가능한 다른 호스팅(예: Cloudflare Pages + 빌드 스텝)으로 이전하는 것도 검토해볼 수 있습니다.
- **`og-default.png`는 임시 플레이스홀더입니다**: 이번 업데이트에서 기본 이미지를 하나 생성해 넣었지만,
  실제 브랜드 톤에 맞는 대표 이미지(1200×630px)로 교체하는 것을 권장합니다.
- **`config.js`에 민감한 값이 평문으로 포함**되어 있습니다. 공개 저장소라면 `.gitignore` 처리 후
  배포 환경에서 값을 주입하는 방식으로 전환을 권장합니다.

---

## 13. 내 아이 시스템(개인화·재방문) 상세

재방문율·체류시간을 늘리기 위해 추가한 기능입니다. **서버 없이 브라우저 `localStorage`만으로 동작**하며,
`baby.js` 하나가 모든 페이지에서 공통으로 로드되어 개인화 데이터를 관리합니다.

### 왜 이 기능인가
계산기형 사이트는 구조적으로 "한 번 답 보고 이탈"하는 방문이 많습니다. 가장 효과적인 개선은
① 매번 생년월일을 다시 입력하는 마찰을 없애는 것, ② 시간이 지나면 값이 바뀌는(나이, 예방접종 D-day,
성장 기록) "돌아올 이유"를 만드는 것, ③ 습관을 시각화하는 것(연속 방문 스트릭) 이 세 가지입니다.
이번 업데이트는 이 세 가지를 하나의 엔진(`baby.js`)과 하나의 허브 페이지(`growth.html`)로 구현했습니다.

### 구성 요소

| 파일/요소 | 역할 |
|---|---|
| `baby.js` | 프로필 CRUD, 나이 계산, 성장 기록 CRUD, 예방접종 D-day 계산, 방문 스트릭·뱃지 로직을 `window.BabyProfile`로 공개 |
| `growth.html` | 프로필 등록/수정, 오늘의 요약(나이·이유식 단계), 예방접종 체크리스트, 성장 기록 입력 + Chart.js 그래프, 스트릭·뱃지 컬렉션을 한 페이지에서 제공 |
| 전 페이지 상단 메뉴바 `[data-baby-badge]` | 프로필이 있으면 "이름 · 나이(+스트릭)", 없으면 "내 아이 등록" CTA를 항상 노출 (→ `growth.html`로 연결) |
| `index.html`의 `#babyDashboard` | 홈 최상단에 오늘 요약 카드(또는 등록 유도 카드)를 렌더링 |
| 도구 페이지의 `autofillAgeInputs()` | `birthDate`, `ageMonth`, `genderSel`, `monthSel`, `monthBtns` id/구조를 가진 입력을 자동으로 채우고 토스트로 안내 |

### localStorage 키

| 키 | 내용 |
|---|---|
| `babyProfile_v1` | `{ name, birthdate, gender, createdAt }` |
| `growthRecords_v1` | `[{ id, date, weight, height, note }]` |
| `vaccineDone_v1` | `{ [vaccineKey]: true }` — 체크된 접종 |
| `visitStreak_v1` | `{ lastVisit, current, longest, totalDays, badges: [] }` |

모두 이 브라우저(기기)에만 저장되며 서버로 전송되지 않습니다. 브랜드/도메인 단위로 스코프가 잡히므로
같은 브라우저에서는 어느 페이지를 가든 동일한 프로필이 유지됩니다.

### 자동 입력이 적용된 도구

현재 다음 6개 도구가 프로필의 생년월일/성별을 자동으로 인식합니다 (해당 id가 없는 도구는 조용히 무시됨):

- `birthDate` (date input): `school-date.html`, `subsidy-calculator.html`
- `ageMonth` (number input): `fever-medicine.html`, `growth-percentile.html`
- `monthSel` (select): `milk-calculator.html`
- `monthBtns` (버튼 그룹) + `genderSel`: `tooth-checker.html`, `milestone-checker.html`, `weaning-checker.html`, `weaning-planner.html`, `growth-percentile.html`

새 도구를 만들면서 자동 입력을 지원하고 싶다면, 입력 요소에 위 id 규칙을 그대로 맞추면
`baby.js` 수정 없이 자동으로 동작합니다. 다른 패턴이 필요하면 `baby.js`의 `autofillAgeInputs()`에
분기를 추가하세요.

### 예방접종 일정 데이터의 성격

`baby.js`의 `VACCINE_SCHEDULE`은 질병관리청 국가필수예방접종 표준 일정을 **간소화한 참고용 정보**입니다.
개별 아동의 건강 상태·지역·의료기관에 따라 실제 접종 시기는 달라질 수 있으므로, 페이지에도
"정확한 일정은 소아청소년과 진료 시 확인하세요"라는 안내 문구를 명시해 두었습니다. 이 스케줄을
수정하거나 최신화할 때는 `growth.html`의 문구도 함께 검토하세요.

### 테스트 체크리스트

1. `growth.html` 접속 → 이름/생년월일 입력 후 저장 → 오늘 요약, 예방접종 목록, 뱃지 그리드가 즉시 갱신되는지
2. 아무 도구 페이지(`tools/fever-medicine.html` 등) 접속 → 월령 입력란이 자동으로 채워지고 하단에
   "○○의 정보로 자동 입력했어요" 토스트가 뜨는지
3. 상단 메뉴바의 아기 뱃지(`nav-baby-badge`)가 모든 페이지에서 동일하게 나이/스트릭을 보여주는지
4. 브라우저를 하루 이상 열지 않다가 다시 접속 → 스트릭이 리셋되지 않고 "어제 방문"이었다면 이어지는지
   (연속 3/7/14/30/100/365일 뱃지 토스트는 조건 충족 시 자동으로 뜸)
5. 성장 기록을 2건 이상 추가 → `growth.html`의 그래프(Chart.js)에 몸무게/키 라인이 표시되는지
6. `growth.html`에서 "정보 삭제"를 눌렀을 때 프로필·기록·접종 체크가 모두 초기화되고, 다른 페이지의
   뱃지도 "내 아이 등록" 상태로 돌아오는지
