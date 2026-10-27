# MomCare 육아 게시글 영역 설정 가이드

메인 페이지 하단의 육아 글 카드, `parenting-posts.html` 전체 목록, `parenting-post.html` 상세 페이지는 Google Sheets의 게시글을 읽어서 표시합니다. 데이터는 공개 조회 전용이며, 글 작성과 예약은 Google Sheets에서 관리합니다.

## 1. Google Sheets 만들기

1. 새 Google 스프레드시트를 만들고 시간대를 `대한민국 표준시(GMT+09:00)`로 설정합니다.
2. 첫 번째 시트 탭 이름을 정확히 `posts`로 설정합니다.
3. `parenting_posts_sheet_template.csv`의 첫 번째 행을 헤더로 사용합니다. 열 이름과 철자를 그대로 유지하세요.

| 열 | 용도 |
|---|---|
| `id` | 번역 행끼리 공유하는 게시글 ID. 예: `baby-sleep-001` |
| `lang` | 언어 코드 `ko`, `ja`, `en` |
| `category` | 분류. 예: `sleep`, `food`, `growth`, `health`, `subsidy`, `pregnancy` 또는 표시할 분류명 |
| `emoji` | 카드에 표시할 이모지 |
| `title` | 해당 언어의 제목 |
| `summary` | 카드와 상세 페이지 상단 요약 |
| `tags` | 쉼표로 구분한 태그. 예: `수면, 신생아, 루틴` |
| `date` | 글에 표시할 날짜. 권장 형식 `YYYY-MM-DD` |
| `content` | Markdown 본문. 제목, 목록, 굵은 글씨, 링크, 코드 블록 등을 사용할 수 있습니다. 셀 안에서 줄바꿈할 수 있습니다. |
| `link` | 선택 항목. 관련 원문/참고 링크의 `https://...` 주소. 상세 페이지 하단에 표시됩니다. |
| `status` | 발행 상태: `draft`, `scheduled`, `published`, `archived` |
| `publish_at` | 예약 공개 시각. 권장 입력 예: `2026-11-01 09:00` (한국 시간) |

### 언어별 행 구성

한 게시글을 한국어/일본어/영어로 제공하려면 **같은 `id`를 사용해 언어마다 한 행씩** 추가합니다. 각 행의 `lang`, `title`, `summary`, `content`는 해당 언어로 작성합니다.

예를 들어 `baby-sleep-001`의 한국어 행만 있다면 한국어 목록에만 표시됩니다. 일본어 행을 작성하기 전까지는 일본어 화면에 그 글이 나타나지 않습니다. 번역 행이 있어도 `title`, `summary`, `content` 중 하나라도 비어 있으면 공개 목록에서 제외됩니다.

## 2. 예약 발행 규칙

- `draft`: 비공개
- `scheduled`: `publish_at` 시각이 지나면 공개
- `published`: `publish_at`이 비어 있거나 현재 시각이 지났을 때 공개
- `archived`: 비공개

`publish_at`은 한국 시간으로 입력하세요. 예약 시각이 되면 API가 게시글을 공개 대상으로 반환합니다. 페이지에 이미 열려 있는 브라우저 화면이 정확히 예약 시각에 자동 갱신되는 방식은 아니므로, 시각이 지난 뒤 새로 열거나 새로고침하면 표시됩니다.

언어별 발행 상태는 각각 관리됩니다. 예를 들어 한국어 행을 `published`로 두더라도 일본어 번역 행을 만들지 않았거나 `draft`로 두었다면 일본어 화면에 노출되지 않습니다.

## 3. Google Apps Script API 배포

1. 위 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 편집기에 들어 있는 코드를 `google_apps_script_parenting_posts.gs`의 내용으로 교체한 뒤 저장합니다. 이 스크립트는 스프레드시트에 연결된(bound) 프로젝트에서 실행해야 합니다.
3. 우측 상단 **배포 → 새 배포 → 유형 선택 → 웹 앱**을 선택합니다.
4. **다음 사용자로 실행: 나**, **액세스 권한: 모든 사용자**로 지정하고 배포합니다. Google 계정에서 조직 정책상 공개 웹 앱 배포가 제한되어 있다면 관리자 정책을 확인해야 합니다.
5. 배포가 완료되면 `https://script.google.com/macros/s/.../exec` 형태의 웹 앱 URL을 복사합니다.
6. `parenting-posts.js` 상단의 다음 설정값을 방금 복사한 실제 URL로 바꿉니다.

```js
API_URL: 'https://script.google.com/macros/s/AKfycbyVwJiZafCdriwZLzcI7VrpZAkNzIVmGfWTl-yXt_yE3zNWJADdu1-rMEpOur_vlnN9Ww/exec'
```

7. 수정한 파일을 사이트에 함께 배포합니다. `index.html`, `parenting-posts.html`, `parenting-post.html`, `parenting-posts.js`는 같은 사이트 경로에 있어야 합니다.

API는 공개 사이트가 읽을 수 있도록 게시글 데이터를 반환하므로, **비밀번호·개인정보·공개하면 안 되는 원고를 이 시트에 넣지 마세요.** 이 API에는 시트 수정 기능이 없습니다. 조회는 JSONP 방식으로 처리하여 정적 사이트에서 별도 서버 없이 불러오게 했습니다.

## 4. 페이지 동작

- 메인 페이지 하단: 언어별 공개 글 카드 20개씩 표시하고, 페이지 아래쪽에 도달하면 다음 20개를 불러옵니다.
- 전체 글 보기: `parenting-posts.html`에서 같은 방식으로 전체 게시글을 탐색할 수 있습니다.
- 상세 글: 메인/전체 목록의 카드 본문, 제목 또는 ‘글 읽기’를 누르면 `parenting-post.html?id=게시글ID&lang=언어`로 이동하고 Markdown 본문이 렌더링됩니다. 기존 `parenting-posts.html?id=...` 링크도 호환됩니다.
- 검색: 전체 목록 페이지에서 제목·요약·분류·태그·본문 텍스트를 검색할 수 있습니다.
- 언어: 메인 페이지의 언어 선택이 게시글 영역에도 적용되고 선택값은 페이지 이동 후에도 유지됩니다. 전체 목록/상세 페이지에도 별도 언어 선택기가 있습니다.
- 안전성: Markdown HTML은 DOMPurify로 정리한 뒤 표시합니다. `link` 열에는 `http://` 또는 `https://` 링크만 허용합니다.

## 5. 배포 전 확인

1. 스프레드시트 탭 이름이 `posts`인지 확인합니다.
2. 헤더 행에 12개 필수 열이 모두 있는지 확인합니다.
3. Apps Script 웹 앱 URL을 `parenting-posts.js`에 설정했는지 확인합니다.
4. 한 언어의 테스트 글을 `status=published`, `publish_at` 공란으로 입력해 메인과 전체 목록에 보이는지 확인합니다.
5. 같은 `id`로 `ja` 또는 `en` 행을 추가해 해당 언어에서만 보이는지 확인합니다.
6. 예약 테스트는 `status=scheduled`, 미래의 `publish_at`으로 저장한 뒤, 시각이 지난 후 새로고침해 확인합니다.

## 6. 403 / `nosniff` 오류 해결

브라우저에서 `/exec` 요청이 `403`을 반환하고, `Content-Type is not a script MIME type` 또는 `X-Content-Type-Options: nosniff`가 표시되면 프런트엔드의 JSONP 문법보다 먼저 Apps Script 웹 앱 접근 권한을 확인하세요. 서버가 JavaScript 대신 403 오류 페이지(HTML)를 반환하면 브라우저가 콜백 스크립트를 실행하지 못합니다.

1. Apps Script 편집기에서 **배포 → 배포 관리**로 이동해 현재 웹 앱 배포를 편집하거나 새 배포를 만듭니다.
2. 유형은 **웹 앱**, 실행 사용자는 **나(배포자)**, 접근 권한은 **로그인하지 않은 사용자도 접근 가능한 옵션(Anyone / 모든 사용자)** 으로 설정합니다. **Google 계정이 있는 사용자만** 허용하는 설정이면 공개 사이트의 익명 방문자는 실패할 수 있습니다.
3. 저장 후 새 버전으로 배포하고, 배포 화면에 표시된 활성 `/exec` URL을 `parenting-posts.js`의 `API_URL`과 일치시킵니다. `/dev` URL은 공개 운영용으로 사용하지 마세요.
4. URL을 시크릿 창에서 열어 확인합니다. 정상인 경우 JSON 텍스트가 보이거나, `?action=posts&lang=ko`를 붙였을 때 `ok: true`와 `posts` 배열이 반환됩니다.
5. 소유자 로그인 상태에서는 열리지만 시크릿 창에서 계속 403이면 Google Workspace 관리자의 외부/익명 접근 정책을 확인하거나, 정책상 공개 배포가 가능한 계정으로 배포해 보세요. 여러 Google 계정이 동시에 로그인된 브라우저에서도 다른 시크릿 창/브라우저로 재검증하세요.

현재 프런트엔드는 사용자께서 제공한 `/exec` URL을 설정해 두었습니다. 단, 해당 URL의 서버 권한이 403을 반환하는 상태라면 배포 접근 권한을 수정해야 실제 게시글이 로드됩니다.
