# 아기도구함 — GA4 & Admin 대시보드 연동 가이드

## 전체 구조

```
방문자 브라우저
  → analytics.js (이벤트 수집)
  → Google Analytics 4
  → Apps Script 프록시 (서버사이드 인증)
  → Admin 대시보드 (시각화)
```

---

## Step 1 — GA4 설정 (15분)

1. [analytics.google.com](https://analytics.google.com) 접속
2. 관리 → 속성 만들기 → 사이트 URL 입력
3. **측정 ID** 복사 (`G-XXXXXXXXXX` 형태)
4. **Property ID** 복사 (관리 → 속성 설정 → 숫자만, 예: `123456789`)
5. `config.js` 에 입력:
   ```js
   GA_ID: 'G-XXXXXXXXXX',
   GA_PROPERTY_ID: '123456789',
   ```

---

## Step 2 — Google Cloud 서비스 계정 (20분)

1. [console.cloud.google.com](https://console.cloud.google.com) → 새 프로젝트 생성
2. **API 및 서비스 → 라이브러리** → `Google Analytics Data API` 검색 → 사용 설정
3. **IAM 및 관리자 → 서비스 계정** → 서비스 계정 만들기
   - 이름: `babytools-analytics`
   - 역할: 뷰어
4. 생성된 계정 클릭 → **키 탭 → 키 추가 → JSON** 다운로드
5. JSON 파일에서 아래 값 복사:
   ```json
   {
     "client_email": "babytools-analytics@....iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   }
   ```

---

## Step 3 — GA4에 서비스 계정 권한 부여 (5분)

1. Google Analytics → 관리 → **속성 액세스 관리**
2. `+` 버튼 → 사용자 추가
3. 이메일: 서비스 계정의 `client_email` 붙여넣기
4. 역할: **뷰어** 선택 → 추가

---

## Step 4 — Apps Script 프록시 배포 (15분)

> 비공개 키를 브라우저에 노출하지 않기 위해 Apps Script를 중간 서버로 사용합니다.

1. [script.google.com](https://script.google.com) → 새 프로젝트
2. 아래 코드를 `Code.gs`에 붙여넣기:

```javascript
// ── Apps Script GA4 프록시 ──
// appsscript.json에 아래 추가:
// "oauthScopes": ["https://www.googleapis.com/auth/analytics.readonly"]

const SERVICE_ACCOUNT_EMAIL = 'YOUR_CLIENT_EMAIL';  // ← 교체
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY';              // ← 교체 (\n 유지)
const GA_PROPERTY_ID = 'YOUR_PROPERTY_ID';           // ← 교체

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const token = getServiceAccountToken();
    const { metrics, dimensions, dateRange, limit } = body;

    const payload = {
      dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
      metrics: metrics.map(m => ({ name: m })),
      dimensions: dimensions.map(d => ({ name: d })),
      limit: limit || 50,
    };

    const res = UrlFetchApp.fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`,
      {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      }
    );

    return ContentService
      .createTextOutput(res.getContentText())
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const key = PRIVATE_KEY.replace(/\\n/g, '\n');
  const signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(`${header}.${claim}`, key)
  );
  const jwt = `${header}.${claim}.${signature}`;
  const tokenRes = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
  });
  return JSON.parse(tokenRes.getContentText()).access_token;
}

// CORS 처리용
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. **배포 → 새 배포** → 유형: **웹 앱**
   - 설명: GA4 Proxy
   - 다음 사용자로 실행: **나**
   - 액세스 권한: **모든 사용자**
4. 배포 URL 복사 (`https://script.google.com/macros/s/.../exec`)
5. `config.js`에 입력:
   ```js
   GA_PROXY_URL: 'https://script.google.com/macros/s/XXXX/exec',
   ```

---

## Step 5 — analytics.js 각 페이지에 추가

`config.js` 다음 줄에 삽입하세요.

**루트 페이지** (`index.html`, `tips.html`, `play.html`):
```html
<script src="config.js"></script>
<script src="analytics.js"></script>
```

**tools/ 하위 페이지** (모든 툴):
```html
<script src="../config.js"></script>
<script src="../analytics.js"></script>
```

---

## Step 6 — Admin 접속

```
https://yourdomain.com/admin/
```

- 비밀번호: `config.js`의 `ADMIN_PASSWORD` 값
- **반드시 기본값(`babytools2024!`)에서 변경하세요**

---

## 수집되는 이벤트 목록

| 이벤트명 | 설명 | 주요 파라미터 |
|---|---|---|
| `page_view_custom` | 페이지 진입 | `page_name`, `referrer` |
| `scroll_depth` | 스크롤 깊이 | `depth_percent` (25/50/75/100) |
| `tool_calculate` | 계산 버튼 클릭 | `page_name`, `button_text` |
| `tool_filter` | 필터 버튼 클릭 | `filter_value` |
| `card_click` | 카드 클릭 | `card_name` |
| `outbound_click` | 외부 링크 클릭 | `link_domain`, `is_affiliate` |
| `ad_impression` | 광고 슬롯 노출 | `ad_slot` |
| `time_on_page` | 체류 시간 | `seconds`, `max_scroll` |
| `site_search` | 내부 검색 | `search_term` |
| `js_error` | JS 오류 | `message` |

---

## 보안 주의사항

- `config.js`는 `.gitignore`에 등록해서 GitHub에 올리지 마세요
- `ADMIN_PASSWORD`는 반드시 강력한 비밀번호로 변경하세요
- Apps Script의 `SERVICE_ACCOUNT_EMAIL`, `PRIVATE_KEY`는 Apps Script 내부에만 보관하세요
- Admin 페이지(`/admin/`)는 Cloudflare Access로 추가 보호하는 것을 권장해요
