/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        아기도구함 — Analytics Tracker (Apps Script)      ║
 * ║                      tracker.gs                         ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  배포 방법:                                               ║
 * ║  1. script.google.com → 새 프로젝트                       ║
 * ║  2. 이 코드 전체를 Code.gs에 붙여넣기                      ║
 * ║  3. 배포 → 새 배포 → 웹앱                                 ║
 * ║     - 다음 사용자로 실행: 나                               ║
 * ║     - 액세스 권한: 모든 사용자                             ║
 * ║  4. 배포 URL을 config.js의 TRACKER_URL에 입력             ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── 시트 이름 상수 ──────────────────────────────────────
const SHEET_PAGEVIEWS = 'pageviews';
const SHEET_EVENTS    = 'events';
const SHEET_DAILY     = 'daily_summary';
const SHEET_TOOLS     = 'tool_stats';
const SHEET_ERRORS    = 'js_errors';

// ── 메인 엔드포인트 (POST) ──────────────────────────────
function doPost(e) {
  try {
    // no-cors 모드에서 Content-Type이 text/plain으로 오므로 둘 다 처리
    var raw = (e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(raw);
    var type = body.type;
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (type === 'batch') {
      var items = body.items || [];
      items.forEach(function(item) { processItem(ss, item); });
    } else {
      processItem(ss, body);
    }

    return buildResponse({ ok: true });

  } catch (err) {
    try { logError(err.message, 'doPost'); } catch(_) {}
    return buildResponse({ ok: false, error: err.message });
  }
}

// GET 엔드포인트: ?action=ping|stats|raw
function doGet(e) {
  var p      = (e && e.parameter) ? e.parameter : {};
  var action = p.action || 'ping';
  var days   = parseInt(p.days || '7');
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  try {
    if (action === 'stats') return buildResponse(getDashboardStats(ss, days));
    if (action === 'raw')   return buildResponse(getRawData(ss, p.sheet || 'events', parseInt(p.limit || '50')));
    return buildResponse({ status: 'ok', message: '아기도구함 Analytics Tracker', ts: new Date().toISOString() });
  } catch(err) {
    return buildResponse({ error: err.message });
  }
}

// ── 아이템 처리 ─────────────────────────────────────────
function processItem(ss, item) {
  const type = item.type;

  switch (type) {
    case 'pageview': writePageview(ss, item);  break;
    case 'event':    writeEvent(ss, item);     break;
    default:         writeEvent(ss, item);     break;
  }

  // 일별 집계 업데이트
  updateDailySummary(ss, item);

  // 툴 계산 이벤트면 tool_stats도 업데이트
  if (item.event_name === 'tool_calculate') {
    updateToolStats(ss, item);
  }
}

// ── 페이지뷰 기록 ────────────────────────────────────────
function writePageview(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_PAGEVIEWS, [
    'timestamp', 'date', 'time', 'page_name', 'page_path',
    'referrer', 'referrer_domain', 'utm_source', 'utm_medium', 'utm_campaign',
    'device', 'os', 'browser', 'screen_width', 'country', 'session_id', 'user_id',
  ]);

  const now = new Date();
  const ref = data.referrer || '';
  let refDomain = '';
  try { refDomain = ref ? new URL(ref).hostname : 'direct'; } catch(_) { refDomain = ref || 'direct'; }

  sheet.appendRow([
    now.toISOString(),
    formatDate(now),
    formatTime(now),
    data.page_name     || '',
    data.page_path     || '',
    ref,
    refDomain,
    data.utm_source    || '',
    data.utm_medium    || '',
    data.utm_campaign  || '',
    data.device        || '',
    data.os            || '',
    data.browser       || '',
    data.screen_width  || '',
    data.country       || '',
    data.session_id    || '',
    data.user_id       || '',
  ]);
}

// ── 이벤트 기록 ──────────────────────────────────────────
function writeEvent(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_EVENTS, [
    'timestamp', 'date', 'time', 'event_name', 'page_name', 'page_path',
    'param1_key', 'param1_value', 'param2_key', 'param2_value',
    'session_id', 'user_id', 'value',
  ]);

  const now    = new Date();
  const params = data.params || {};
  const keys   = Object.keys(params);

  sheet.appendRow([
    now.toISOString(),
    formatDate(now),
    formatTime(now),
    data.event_name    || '',
    data.page_name     || '',
    data.page_path     || '',
    keys[0]            || '',
    params[keys[0]]    || '',
    keys[1]            || '',
    params[keys[1]]    || '',
    data.session_id    || '',
    data.user_id       || '',
    data.value         || '',
  ]);
}

// ── 일별 집계 ────────────────────────────────────────────
function updateDailySummary(ss, data) {
  const sheet   = getOrCreateSheet(ss, SHEET_DAILY, [
    'date', 'pageviews', 'unique_sessions', 'tool_calculates',
    'ad_impressions', 'affiliate_clicks', 'avg_scroll_depth',
    'js_errors', 'last_updated',
  ]);

  const today   = formatDate(new Date());
  const values  = sheet.getDataRange().getValues();
  const headers = values[0];
  const dateCol = 0; // date 컬럼 인덱스

  // 오늘 행 찾기
  let rowIndex  = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][dateCol] === today) { rowIndex = i + 1; break; } // 1-indexed
  }

  // 없으면 새 행 추가
  if (rowIndex === -1) {
    sheet.appendRow([today, 0, 0, 0, 0, 0, 0, 0, new Date().toISOString()]);
    rowIndex = sheet.getLastRow();
  }

  // 해당 컬럼 증가
  const colMap = {
    'pageview':        2,  // pageviews
    'tool_calculate':  4,  // tool_calculates
    'ad_impression':   5,  // ad_impressions
    'outbound_click':  6,  // affiliate_clicks (is_affiliate 체크)
    'js_error':        8,  // js_errors
  };

  const eName = data.event_name || data.type;

  if (eName === 'pageview') {
    // 페이지뷰 + 세션
    const pvCell = sheet.getRange(rowIndex, 2);
    pvCell.setValue((pvCell.getValue() || 0) + 1);
    // 세션은 새 session_id면 증가 (간소화: pageview당 1)
    const sessCell = sheet.getRange(rowIndex, 3);
    sessCell.setValue((sessCell.getValue() || 0) + 1);
  }

  if (colMap[eName]) {
    // outbound_click은 어필리에이트 클릭만
    if (eName === 'outbound_click' && (data.params || {}).is_affiliate !== 'yes') return;
    const cell = sheet.getRange(rowIndex, colMap[eName]);
    cell.setValue((cell.getValue() || 0) + 1);
  }

  // scroll_depth는 평균 갱신
  if (eName === 'scroll_depth') {
    const depth = parseInt((data.params || {}).depth_percent || 0);
    const scrollCell = sheet.getRange(rowIndex, 7);
    const cur = scrollCell.getValue() || 0;
    // 단순 최대값으로 업데이트 (정확한 평균은 별도 집계 필요)
    if (depth > cur) scrollCell.setValue(depth);
  }

  // last_updated
  sheet.getRange(rowIndex, 9).setValue(new Date().toISOString());
}

// ── 툴별 통계 ────────────────────────────────────────────
function updateToolStats(ss, data) {
  const sheet  = getOrCreateSheet(ss, SHEET_TOOLS, [
    'tool_name', 'total_uses', 'today_uses', 'last_used', 'first_used',
  ]);
  const today  = formatDate(new Date());
  const tool   = data.page_name || 'unknown';
  const values = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === tool) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) {
    sheet.appendRow([tool, 1, 1, new Date().toISOString(), new Date().toISOString()]);
  } else {
    sheet.getRange(rowIndex, 2).setValue((values[rowIndex-1][1] || 0) + 1); // total
    // today_uses: 날짜가 오늘이면 증가, 아니면 리셋
    const lastUsed = values[rowIndex-1][3] || '';
    const lastDate = lastUsed ? formatDate(new Date(lastUsed)) : '';
    const todayCell = sheet.getRange(rowIndex, 3);
    todayCell.setValue(lastDate === today ? (values[rowIndex-1][2] || 0) + 1 : 1);
    sheet.getRange(rowIndex, 4).setValue(new Date().toISOString());
  }
}

// ── JS 에러 기록 ─────────────────────────────────────────
function logError(message, source) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_ERRORS, [
      'timestamp', 'date', 'message', 'source', 'page_name',
    ]);
    sheet.appendRow([new Date().toISOString(), formatDate(new Date()), message, source || '', '']);
  } catch(_) {}
}

// ── 유틸 ─────────────────────────────────────────────────
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // 헤더 스타일
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#3d7a5e');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function formatTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 페이지별 집계 ─────────────────────────────────────────
function getPageStats(ss, cutoffStr) {
  const sheet = ss.getSheetByName(SHEET_PAGEVIEWS);
  if (!sheet) return [];

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const nameIdx = headers.indexOf('page_name');
  const pathIdx = headers.indexOf('page_path');
  const dateIdx = headers.indexOf('date');
  if (nameIdx < 0) return [];

  const map = {};
  rows.slice(1).forEach(function (r) {
    if (r[dateIdx] < cutoffStr) return;
    const key = r[pathIdx] || r[nameIdx] || 'unknown';
    if (!map[key]) map[key] = { path: r[pathIdx] || '', name: r[nameIdx] || '', pv: 0 };
    map[key].pv++;
  });

  return Object.values(map).sort((a, b) => b.pv - a.pv).slice(0, 20);
}

// ── 이벤트별 집계 ────────────────────────────────────────
function getEventStats(ss, cutoffStr, eventFilter) {
  const sheet = ss.getSheetByName(SHEET_EVENTS);
  if (!sheet) return [];

  const rows      = sheet.getDataRange().getValues();
  const headers   = rows[0];
  const evIdx     = headers.indexOf('event_name');
  const p1kIdx    = headers.indexOf('param1_key');
  const p1vIdx    = headers.indexOf('param1_value');
  const dateIdx   = headers.indexOf('date');
  const pageIdx   = headers.indexOf('page_name');
  if (evIdx < 0) return [];

  const map = {};
  rows.slice(1).forEach(function (r) {
    if (r[dateIdx] < cutoffStr) return;
    if (eventFilter && r[evIdx] !== eventFilter) return;
    const key = r[pageIdx] || r[p1vIdx] || 'unknown';
    map[key] = (map[key] || 0) + 1;
  });

  return Object.entries(map)
    .map(([k, v]) => ({ label: k, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// ── GET 엔드포인트 (?action=stats|raw|ping) ──────────────
function doGet(e) {
  const p      = e.parameter || {};
  const action = p.action || 'ping';
  const days   = parseInt(p.days || '7');
  const ss     = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action === 'stats') {
      return buildResponse(getDashboardStats(ss, days));
    }
    if (action === 'raw') {
      return buildResponse(getRawData(ss, p.sheet || 'events', parseInt(p.limit || '50')));
    }
    if (action === 'ping') {
      return buildResponse({ status: 'ok', message: '아기도구함 Analytics Tracker', ts: new Date().toISOString() });
    }
    return buildResponse({ error: 'unknown action' });
  } catch (err) {
    return buildResponse({ error: err.message });
  }
}

// ── 원본 데이터 반환 (raw 탭용) ──────────────────────────
function getRawData(ss, sheetName, limit) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { headers: [], rows: [], error: sheetName + ' 시트가 없어요' };

  const all     = sheet.getDataRange().getValues();
  const headers = all[0] || [];
  // 최신순으로 반환 (마지막 행부터)
  const rows    = all.slice(1).reverse().slice(0, limit);

  return { headers, rows, total: all.length - 1, sheet: sheetName };
}

function getDashboardStats(ss, days) {
  const dailySheet = ss.getSheetByName(SHEET_DAILY);
  const toolSheet  = ss.getSheetByName(SHEET_TOOLS);

  const result = { daily: [], tools: [], totals: {} };

  if (dailySheet) {
    const rows = dailySheet.getDataRange().getValues();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = formatDate(cutoff);

    // 최근 N일 데이터
    result.daily = rows.slice(1)
      .filter(r => r[0] >= cutoffStr)
      .map(r => ({
        date: r[0], pageviews: r[1], sessions: r[2],
        tool_calculates: r[3], ad_impressions: r[4],
        affiliate_clicks: r[5], avg_scroll: r[6], errors: r[7],
      }));

    // 합계
    result.totals = result.daily.reduce((acc, r) => ({
      pageviews:        (acc.pageviews||0)        + (r.pageviews||0),
      sessions:         (acc.sessions||0)         + (r.sessions||0),
      tool_calculates:  (acc.tool_calculates||0)  + (r.tool_calculates||0),
      ad_impressions:   (acc.ad_impressions||0)   + (r.ad_impressions||0),
      affiliate_clicks: (acc.affiliate_clicks||0) + (r.affiliate_clicks||0),
    }), {});
  }

  if (toolSheet) {
    const rows = toolSheet.getDataRange().getValues();
    result.tools = rows.slice(1)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 10)
      .map(r => ({ tool: r[0], total: r[1], today: r[2], last_used: r[3] }));
  }

  // 페이지별 집계
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDate(cutoff);
  result.pages     = getPageStats(ss, cutoffStr);
  result.searches  = getEventStats(ss, cutoffStr, 'site_search');
  result.outbounds = getEventStats(ss, cutoffStr, 'outbound_click');

  return result;
}

// ══════════════════════════════════════════════════════════
// 샘플 데이터 삽입
// Apps Script 편집기에서 insertSampleData 함수를 선택 후
// ▶ 실행 버튼을 눌러주세요.
// ══════════════════════════════════════════════════════════
function insertSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) pageviews ─────────────────────────────────────────
  const pvSheet = getOrCreateSheet(ss, SHEET_PAGEVIEWS, [
    'timestamp','date','time','page_name','page_path',
    'referrer','referrer_domain','utm_source','utm_medium','utm_campaign',
    'device','os','browser','screen_width','country','session_id','user_id',
  ]);
  pvSheet.appendRow([
    '2024-01-10T09:23:11.000Z',
    '2024-01-10',
    '09:23:11',
    '해열제계산기',
    '/tools/fever-medicine.html',
    'https://www.google.com/search?q=소아+타이레놀+용량',
    'google.com',
    'google',
    'organic',
    '',
    'mobile',
    'Android',
    'Chrome',
    '390',
    'KR',
    'sid_abc123xyz',
    'uid_def456uvw',
  ]);

  // 2) events ────────────────────────────────────────────
  const evSheet = getOrCreateSheet(ss, SHEET_EVENTS, [
    'timestamp','date','time','event_name','page_name','page_path',
    'param1_key','param1_value','param2_key','param2_value',
    'session_id','user_id','value',
  ]);
  evSheet.appendRow([
    '2024-01-10T09:23:45.000Z',
    '2024-01-10',
    '09:23:45',
    'tool_calculate',
    '해열제계산기',
    '/tools/fever-medicine.html',
    'button_text',
    '🌡️ 용량 계산하기',
    '',
    '',
    'sid_abc123xyz',
    'uid_def456uvw',
    '',
  ]);

  // 3) daily_summary ─────────────────────────────────────
  const dsSheet = getOrCreateSheet(ss, SHEET_DAILY, [
    'date','pageviews','unique_sessions','tool_calculates',
    'ad_impressions','affiliate_clicks','avg_scroll_depth',
    'js_errors','last_updated',
  ]);
  dsSheet.appendRow([
    '2024-01-10',
    1,    // pageviews
    1,    // unique_sessions
    1,    // tool_calculates
    2,    // ad_impressions
    0,    // affiliate_clicks
    75,   // avg_scroll_depth
    0,    // js_errors
    '2024-01-10T09:23:45.000Z',
  ]);

  // 4) tool_stats ────────────────────────────────────────
  const tsSheet = getOrCreateSheet(ss, SHEET_TOOLS, [
    'tool_name','total_uses','today_uses','last_used','first_used',
  ]);
  tsSheet.appendRow([
    '해열제계산기',
    1,    // total_uses
    1,    // today_uses
    '2024-01-10T09:23:45.000Z',
    '2024-01-10T09:23:45.000Z',
  ]);

  SpreadsheetApp.getUi().alert('✅ 샘플 데이터 삽입 완료!\n\n4개 시트에 각 1행씩 추가됐어요.');
}
