# 🍼 아기도구함 (noriya.kr)

육아 계산기·체크리스트 18종 + 놀이 추천(`play.html`) + 육아 꿀팁(`tips.html`)을 제공하는
**정적 사이트**입니다. 빌드 도구 없이 순수 HTML/CSS/JS로 동작하며,
**GitHub Pages**로 호스팅하고 **Cloudflare**로 DNS/CDN을, **Google Sheets + Apps Script**를
간이 백엔드(콘텐츠 CMS + 방문 로그 수집)로 사용합니다.

이 문서는 2026-07 리뉴얼(전역 메뉴바 추가, SEO 개편, `play.html` 성능 개선) 내용을 포함해
프로젝트 전체 구조와 운영 방법을 정리한 것입니다.

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
