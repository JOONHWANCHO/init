/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        아기도구함 — Analytics Tracker (Apps Script) v2   ║
 * ║                      tracker.gs                          ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  이 버전은 시트 구조가 완전히 바뀌었습니다 (v1과 호환 X).   ║
 * ║  기존 pageviews/events/daily_summary/tool_stats 시트는     ║
 * ║  더 이상 쓰지 않습니다. 새로 만든 시트(sessions/pageviews/  ║
 * ║  events)를 기반으로 모든 통계를 그때그때 집계합니다.        ║
 * ║                                                            ║
 * ║  배포 방법:                                                ║
 * ║  1. script.google.com → 새 프로젝트                        ║
 * ║  2. 이 코드 전체를 Code.gs에 붙여넣기                       ║
 * ║  3. 배포 → 새 배포 → 웹앱                                  ║
 * ║     - 다음 사용자로 실행: 나                                ║
 * ║     - 액세스 권한: 모든 사용자                              ║
 * ║  4. 배포 URL을 config.js의 TRACKER_URL에 입력              ║
 * ║  ⚠ 코드를 고칠 때마다 "새 버전"으로 재배포해야 반영됩니다.   ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── 시트 이름 상수 ──────────────────────────────────────
const SHEET_SESSIONS  = 'sessions';
const SHEET_PAGEVIEWS = 'pageviews';
const SHEET_EVENTS    = 'events';

const SESSIONS_HEADERS = [
  'session_id', 'user_id', 'started_at', 'last_seen_at',
  'entry_page', 'entry_title', 'referrer', 'ref_type', 'ref_source',
  'utm_source', 'utm_medium', 'utm_campaign',
  'device', 'os', 'browser', 'country', 'language',
  'page_count', 'duration_sec', 'exit_page',
];
const PAGEVIEWS_HEADERS = [
  'timestamp', 'date', 'time', 'session_id', 'user_id',
  'page_path', 'page_name', 'content_id', 'content_title', 'prev_page',
  'ref_type', 'device', 'os', 'browser', 'country', 'is_new_session',
  'time_on_page_sec', 'max_scroll_percent', 'exit_type',
];
const EVENTS_HEADERS = [
  'timestamp', 'date', 'time', 'session_id', 'user_id',
  'page_path', 'page_name', 'event_name', 'event_data',
  'device', 'os', 'browser', 'country',
];

// ── 메인 엔드포인트 (POST, 레거시 테스트용) ────────────────
// ⚠ 브라우저의 analytics.js는 더 이상 이 엔드포인트를 쓰지 않습니다.
// Apps Script 웹앱은 요청 시 302로 리다이렉트되는데, fetch가 이를 따라가면서
// POST body가 사라지고 GET으로 전환되어 버립니다 (브라우저 표준 동작).
// 그래서 실제 수집은 doGet의 ?d= 파라미터 방식으로 처리합니다.
// 이 doPost는 curl -L, Postman 등 리다이렉트를 메서드 유지한 채 처리하는
// 서버-투-서버 클라이언트로 테스트할 때를 위해 남겨둡니다.
function doPost(e) {
  try {
    var raw  = (e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(raw);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (body.type === 'batch') {
      (body.items || []).forEach(function (item) { processItem(ss, item); });
    } else {
      processItem(ss, body);
    }
    return buildResponse({ ok: true });
  } catch (err) {
    try { logError(err.message, 'doPost'); } catch (_) {}
    return buildResponse({ ok: false, error: err.message });
  }
}

// ── GET 엔드포인트 (?action=stats|raw|ping, ?d=... 데이터 수집) ──
function doGet(e) {
  const p      = e.parameter || {};
  const action = p.action || 'ping';
  const days   = parseInt(p.days || '7');
  const ss     = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 클라이언트 데이터 수집 (analytics.js가 ?d=인코딩된JSON 형태로 전송)
    if (p.d) {
      const item = JSON.parse(p.d);
      if (item.type === 'batch') {
        (item.items || []).forEach(function (it) { processItem(ss, it); });
      } else {
        processItem(ss, item);
      }
      return buildResponse({ ok: true });
    }
    if (action === 'stats') return buildResponse(getDashboardStats(ss, days));
    if (action === 'raw')   return buildResponse(getRawData(ss, p.sheet || 'events', parseInt(p.limit || '50')));
    if (action === 'ping')  return buildResponse({ status: 'ok', message: '아기도구함 Analytics Tracker v2', ts: new Date().toISOString() });
    return buildResponse({ error: 'unknown action' });
  } catch (err) {
    return buildResponse({ error: err.message });
  }
}

// ── 아이템 처리 (라우팅) ────────────────────────────────
function processItem(ss, item) {
  try {
    switch (item.type) {
      case 'pageview':  writePageview(ss, item);  break;
      case 'page_exit': writePageExit(ss, item);  break;
      case 'event':     writeEvent(ss, item);     break;
      default:          writeEvent(ss, item);     break;
    }
  } catch (err) {
    logError(err.message, item.type || 'unknown');
  }
}

// ── 세션 upsert ──────────────────────────────────────────
// sessions 시트에서 session_id로 기존 행을 찾아 갱신하거나, 없으면 새로 만듭니다.
function upsertSession(ss, item, isPageview) {
  const sheet = getOrCreateSheet(ss, SHEET_SESSIONS, SESSIONS_HEADERS);
  const now   = new Date();
  const last  = sheet.getLastRow();

  let rowIndex = -1;
  if (last > 1) {
    // 세션은 최근에 활동한 게 대부분 시트 하단 쪽에 있으므로 뒤에서부터 탐색
    const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (let i = ids.length - 1; i >= 0; i--) {
      if (ids[i][0] === item.session_id) { rowIndex = i + 2; break; }
    }
  }

  if (rowIndex === -1) {
    sheet.appendRow([
      item.session_id  || '',
      item.user_id     || '',
      now.toISOString(),
      now.toISOString(),
      item.page_path    || '',
      item.content_title || item.page_name || '',
      item.referrer     || '',
      item.ref_type      || 'direct',
      item.ref_source     || '',
      item.utm_source    || '',
      item.utm_medium    || '',
      item.utm_campaign  || '',
      item.device        || '',
      item.os            || '',
      item.browser       || '',
      item.country       || '',
      item.language       || '',
      isPageview ? 1 : 0,
      0,
      item.page_path || '',
    ]);
    return sheet.getLastRow();
  }

  // 기존 세션 갱신
  const row = sheet.getRange(rowIndex, 1, 1, SESSIONS_HEADERS.length).getValues()[0];
  const startedAt = new Date(row[2] || now);
  const durationSec = Math.max(0, Math.round((now - startedAt) / 1000));

  sheet.getRange(rowIndex, 4).setValue(now.toISOString());               // last_seen_at
  if (isPageview) {
    sheet.getRange(rowIndex, 18).setValue((row[17] || 0) + 1);           // page_count
    sheet.getRange(rowIndex, 20).setValue(item.page_path || row[19]);    // exit_page
  }
  sheet.getRange(rowIndex, 19).setValue(durationSec);                    // duration_sec
  // country/language는 뒤늦게 (지오IP 비동기 응답 이후) 채워질 수 있어 비어있을 때만 덮어씀
  if (!row[15] && item.country)  sheet.getRange(rowIndex, 16).setValue(item.country);
  if (!row[16] && item.language) sheet.getRange(rowIndex, 17).setValue(item.language);

  return rowIndex;
}

// ── 페이지뷰 기록 ────────────────────────────────────────
function writePageview(ss, data) {
  upsertSession(ss, data, true);

  const sheet = getOrCreateSheet(ss, SHEET_PAGEVIEWS, PAGEVIEWS_HEADERS);
  const now   = new Date();

  sheet.appendRow([
    now.toISOString(),
    formatDate(now),
    formatTime(now),
    data.session_id     || '',
    data.user_id        || '',
    data.page_path       || '',
    data.page_name       || '',
    data.content_id       || '',
    data.content_title     || '',
    data.prev_page        || '',
    data.ref_type          || 'direct',
    data.device            || '',
    data.os                || '',
    data.browser            || '',
    data.country             || '',
    data.is_new_session ? 'Y' : 'N',
    '',   // time_on_page_sec — page_exit 이벤트가 나중에 채움
    '',   // max_scroll_percent
    '',   // exit_type
  ]);
}

// ── 체류시간/이탈 기록 (해당 페이지뷰 행을 찾아 업데이트) ────
function writePageExit(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PAGEVIEWS);
  if (!sheet) return;

  const last = sheet.getLastRow();
  if (last <= 1) return;

  // 최근 300행 내에서 같은 session_id + page_path(+content_id)를 가진 마지막 행을 찾음
  const searchRows = Math.min(300, last - 1);
  const startRow = last - searchRows + 1;
  const values = sheet.getRange(startRow, 1, searchRows, PAGEVIEWS_HEADERS.length).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    const r = values[i];
    const sameSession = r[3] === data.session_id;
    const samePage     = r[5] === data.page_path;
    const sameContent  = (data.content_id || '') === (r[7] || '');
    if (sameSession && samePage && sameContent) {
      const rowIndex = startRow + i;
      sheet.getRange(rowIndex, 17).setValue(data.seconds || 0);       // time_on_page_sec
      sheet.getRange(rowIndex, 18).setValue(data.max_scroll || 0);    // max_scroll_percent
      sheet.getRange(rowIndex, 19).setValue(data.exit_type || 'exit');// exit_type
      break;
    }
  }

  // 세션도 갱신 (체류시간 누적, 이탈 페이지)
  upsertSession(ss, data, false);
}

// ── 이벤트 기록 ──────────────────────────────────────────
function writeEvent(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_EVENTS, EVENTS_HEADERS);
  const now   = new Date();

  sheet.appendRow([
    now.toISOString(),
    formatDate(now),
    formatTime(now),
    data.session_id  || '',
    data.user_id     || '',
    data.page_path    || '',
    data.page_name    || '',
    data.event_name    || data.type || '',
    JSON.stringify(data.params || {}),
    data.device         || '',
    data.os             || '',
    data.browser         || '',
    data.country          || '',
  ]);

  // 세션의 last_seen_at은 갱신하되 page_count는 늘리지 않음
  upsertSession(ss, data, false);
}

// ── JS 에러 로그 (내부 에러용, 시트 별도 안 만들고 events에 기록) ──
function logError(message, source) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_EVENTS, EVENTS_HEADERS);
    const now   = new Date();
    sheet.appendRow([
      now.toISOString(), formatDate(now), formatTime(now),
      '', '', '', '', 'server_error',
      JSON.stringify({ message: message, source: source || '' }),
      '', '', '', '',
    ]);
  } catch (_) {}
}

// ── 유틸 ─────────────────────────────────────────────────
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#3d7a5e');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function formatTime(d) {
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
function pad(n) { return String(n).padStart(2, '0'); }

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 원본 데이터 반환 (raw 탭용) ──────────────────────────
function getRawData(ss, sheetName, limit) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { headers: [], rows: [], error: sheetName + ' 시트가 없어요' };

  const all     = sheet.getDataRange().getValues();
  const headers = all[0] || [];
  const rows    = all.slice(1).reverse().slice(0, limit);

  return { headers, rows, total: all.length - 1, sheet: sheetName };
}

// ══════════════════════════════════════════════════════════
// 대시보드 통계 집계 (모든 원본 시트를 그때그때 집계)
// ══════════════════════════════════════════════════════════
function getDashboardStats(ss, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffTime = cutoff.getTime();
  const cutoffStr  = formatDate(cutoff);

  const sessionsSheet  = ss.getSheetByName(SHEET_SESSIONS);
  const pageviewsSheet = ss.getSheetByName(SHEET_PAGEVIEWS);
  const eventsSheet    = ss.getSheetByName(SHEET_EVENTS);

  const sessions  = sessionsSheet  ? readRows(sessionsSheet,  SESSIONS_HEADERS)  : [];
  const pageviews = pageviewsSheet ? readRows(pageviewsSheet, PAGEVIEWS_HEADERS) : [];
  const events    = eventsSheet    ? readRows(eventsSheet,    EVENTS_HEADERS)    : [];

  const sessionsInRange  = sessions.filter(function (s) { return new Date(s.started_at).getTime() >= cutoffTime; });
  const pageviewsInRange = pageviews.filter(function (r) { return r.date >= cutoffStr; });
  const eventsInRange    = events.filter(function (r) { return r.date >= cutoffStr; });

  const result = {
    totals:        computeTotals(sessionsInRange, pageviewsInRange, eventsInRange),
    daily:         computeDailyTrend(pageviewsInRange, sessionsInRange, eventsInRange, days),
    devices:       groupCount(sessionsInRange, 'device'),
    os:            groupCount(sessionsInRange, 'os'),
    browsers:      groupCount(sessionsInRange, 'browser'),
    countries:     groupCount(sessionsInRange, 'country'),
    referrers:     groupCount(sessionsInRange, 'ref_type'),
    ref_sources:   topRefSources(sessionsInRange),
    entry_pages:   groupCount(sessionsInRange, 'entry_page'),
    exit_pages:    groupCount(sessionsInRange, 'exit_page'),
    content:       computeContentStats(pageviewsInRange),
    tools:         computeToolStats(eventsInRange),
    ads:           computeAdStats(eventsInRange),
    affiliates:    computeAffiliateStats(eventsInRange),
    searches:      computeEventParamStats(eventsInRange, 'site_search', 'search_term'),
    errors:        computeErrorStats(eventsInRange),
  };
  return result;
}

// 시트를 헤더 이름 기준 객체 배열로 변환
function readRows(sheet, headers) {
  const last = sheet.getLastRow();
  if (last <= 1) return [];
  const values = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  return values.map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function computeTotals(sessions, pageviews, events) {
  const totalSessions  = sessions.length;
  const totalPageviews = pageviews.length;
  const durations = sessions.map(function (s) { return Number(s.duration_sec) || 0; }).filter(function (d) { return d > 0; });
  const avgDuration = durations.length ? Math.round(durations.reduce(function (a, b) { return a + b; }, 0) / durations.length) : 0;
  const bounced = sessions.filter(function (s) { return (Number(s.page_count) || 0) <= 1; }).length;
  const bounceRate = totalSessions ? Math.round((bounced / totalSessions) * 1000) / 10 : 0;
  const avgPagesPerSession = totalSessions ? Math.round((totalPageviews / totalSessions) * 10) / 10 : 0;

  const adImpressions   = events.filter(function (e) { return e.event_name === 'ad_impression'; }).length;
  const adClicks        = events.filter(function (e) { return e.event_name === 'ad_click'; }).length;
  const affiliateClicks = events.filter(function (e) {
    if (e.event_name !== 'outbound_click') return false;
    try { return JSON.parse(e.event_data || '{}').is_affiliate === 'yes'; } catch (_) { return false; }
  }).length;
  const toolCalculates = events.filter(function (e) { return e.event_name === 'tool_calculate'; }).length;
  const jsErrors        = events.filter(function (e) { return e.event_name === 'js_error'; }).length;

  return {
    sessions: totalSessions,
    pageviews: totalPageviews,
    avg_session_duration: avgDuration,
    bounce_rate: bounceRate,
    avg_pages_per_session: avgPagesPerSession,
    ad_impressions: adImpressions,
    ad_clicks: adClicks,
    ad_ctr: adImpressions ? Math.round((adClicks / adImpressions) * 1000) / 10 : 0,
    affiliate_clicks: affiliateClicks,
    tool_calculates: toolCalculates,
    js_errors: jsErrors,
  };
}

function computeDailyTrend(pageviews, sessions, events, days) {
  const map = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = formatDate(d);
    map[key] = { date: key, pageviews: 0, sessions: {}, ad_impressions: 0, affiliate_clicks: 0, tool_calculates: 0, errors: 0 };
  }
  pageviews.forEach(function (r) {
    if (!map[r.date]) return;
    map[r.date].pageviews++;
    if (r.session_id) map[r.date].sessions[r.session_id] = true;
  });
  events.forEach(function (r) {
    if (!map[r.date]) return;
    if (r.event_name === 'ad_impression') map[r.date].ad_impressions++;
    if (r.event_name === 'tool_calculate') map[r.date].tool_calculates++;
    if (r.event_name === 'js_error')       map[r.date].errors++;
    if (r.event_name === 'outbound_click') {
      try { if (JSON.parse(r.event_data || '{}').is_affiliate === 'yes') map[r.date].affiliate_clicks++; } catch (_) {}
    }
  });
  return Object.values(map).map(function (r) {
    return {
      date: r.date, pageviews: r.pageviews, sessions: Object.keys(r.sessions).length,
      ad_impressions: r.ad_impressions, affiliate_clicks: r.affiliate_clicks,
      tool_calculates: r.tool_calculates, errors: r.errors,
    };
  });
}

function groupCount(rows, field) {
  const map = {};
  rows.forEach(function (r) {
    const key = (r[field] || 'unknown') || 'unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(function (e) { return { label: e[0], count: e[1] }; })
    .sort(function (a, b) { return b.count - a.count; })
    .slice(0, 12);
}

function topRefSources(sessions) {
  const map = {};
  sessions.forEach(function (s) {
    if (s.ref_type === 'direct' || s.ref_type === 'internal' || !s.ref_source) return;
    const key = s.ref_source;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(function (e) { return { label: e[0], count: e[1] }; })
    .sort(function (a, b) { return b.count - a.count; })
    .slice(0, 10);
}

// 콘텐츠(페이지/게시글/액티비티)별 성과
function computeContentStats(pageviews) {
  const map = {};
  pageviews.forEach(function (r) {
    const key = r.content_id ? (r.page_path + '#' + r.content_id) : r.page_path;
    if (!map[key]) {
      map[key] = {
        path: r.page_path, name: r.content_title || r.page_name || key,
        pv: 0, sessions: {}, timeSum: 0, timeCount: 0, scrollSum: 0, scrollCount: 0, exits: 0,
      };
    }
    const m = map[key];
    m.pv++;
    if (r.session_id) m.sessions[r.session_id] = true;
    const t = Number(r.time_on_page_sec);
    if (t > 0) { m.timeSum += t; m.timeCount++; }
    const sc = Number(r.max_scroll_percent);
    if (sc > 0) { m.scrollSum += sc; m.scrollCount++; }
    if (r.exit_type === 'exit') m.exits++;
  });
  return Object.values(map).map(function (m) {
    return {
      path: m.path, name: m.name, pageviews: m.pv,
      unique_sessions: Object.keys(m.sessions).length,
      avg_time_on_page: m.timeCount ? Math.round(m.timeSum / m.timeCount) : 0,
      avg_scroll: m.scrollCount ? Math.round(m.scrollSum / m.scrollCount) : 0,
      exit_rate: m.pv ? Math.round((m.exits / m.pv) * 1000) / 10 : 0,
    };
  }).sort(function (a, b) { return b.pageviews - a.pageviews; }).slice(0, 30);
}

function computeToolStats(events) {
  const todayStr = formatDate(new Date());
  const map = {};
  events.forEach(function (e) {
    if (e.event_name !== 'tool_calculate') return;
    const key = e.page_name || 'unknown';
    if (!map[key]) map[key] = { tool: key, total: 0, today: 0, last_used: '' };
    map[key].total++;
    if (e.date === todayStr) map[key].today++;
    if (!map[key].last_used || e.timestamp > map[key].last_used) map[key].last_used = e.timestamp;
  });
  return Object.values(map).sort(function (a, b) { return b.total - a.total; }).slice(0, 20);
}

function computeAdStats(events) {
  const slots = {};
  let impressions = 0, clicks = 0;
  events.forEach(function (e) {
    if (e.event_name === 'ad_impression' || e.event_name === 'ad_click') {
      let slot = 'unknown';
      try { slot = JSON.parse(e.event_data || '{}').ad_slot || 'unknown'; } catch (_) {}
      if (!slots[slot]) slots[slot] = { slot: slot, impressions: 0, clicks: 0 };
      if (e.event_name === 'ad_impression') { slots[slot].impressions++; impressions++; }
      else { slots[slot].clicks++; clicks++; }
    }
  });
  return {
    total_impressions: impressions,
    total_clicks: clicks,
    ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    by_slot: Object.values(slots).sort(function (a, b) { return b.impressions - a.impressions; }),
  };
}

function computeAffiliateStats(events) {
  const map = {};
  events.forEach(function (e) {
    if (e.event_name !== 'outbound_click') return;
    let data = {};
    try { data = JSON.parse(e.event_data || '{}'); } catch (_) {}
    if (data.is_affiliate !== 'yes') return;
    const domain = data.link_domain || 'unknown';
    map[domain] = (map[domain] || 0) + 1;
  });
  return Object.entries(map)
    .map(function (e) { return { domain: e[0], clicks: e[1] }; })
    .sort(function (a, b) { return b.clicks - a.clicks; })
    .slice(0, 20);
}

function computeEventParamStats(events, eventName, paramKey) {
  const map = {};
  events.forEach(function (e) {
    if (e.event_name !== eventName) return;
    let data = {};
    try { data = JSON.parse(e.event_data || '{}'); } catch (_) {}
    const key = data[paramKey] || 'unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(function (e) { return { label: e[0], count: e[1] }; })
    .sort(function (a, b) { return b.count - a.count; })
    .slice(0, 20);
}

function computeErrorStats(events) {
  const errs = events.filter(function (e) { return e.event_name === 'js_error' || e.event_name === 'server_error'; });
  const recent = errs.slice(-20).reverse().map(function (e) {
    let data = {};
    try { data = JSON.parse(e.event_data || '{}'); } catch (_) {}
    return { timestamp: e.timestamp, page: e.page_name, message: data.message || '', source: data.source || '' };
  });
  return { total: errs.length, recent: recent };
}

// ══════════════════════════════════════════════════════════
// 샘플 데이터 삽입 (Apps Script 편집기에서 이 함수를 선택 후 ▶ 실행)
// ══════════════════════════════════════════════════════════
function insertSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sessSheet = getOrCreateSheet(ss, SHEET_SESSIONS, SESSIONS_HEADERS);
  sessSheet.appendRow([
    'sid_demo1', 'uid_demo1', '2024-01-10T09:23:00.000Z', '2024-01-10T09:26:40.000Z',
    '/tools/fever-medicine.html', '해열제계산기', 'https://www.google.com/search?q=소아+타이레놀+용량', 'search', 'google.com',
    'google', 'organic', '',
    'mobile', 'Android', 'Chrome', 'KR', 'ko-KR',
    2, 220, '/tips.html',
  ]);

  const pvSheet = getOrCreateSheet(ss, SHEET_PAGEVIEWS, PAGEVIEWS_HEADERS);
  pvSheet.appendRow([
    '2024-01-10T09:23:00.000Z', '2024-01-10', '09:23:00', 'sid_demo1', 'uid_demo1',
    '/tools/fever-medicine.html', '해열제계산기', '', '', '',
    'search', 'mobile', 'Android', 'Chrome', 'KR', 'Y',
    140, 80, 'internal_nav',
  ]);
  pvSheet.appendRow([
    '2024-01-10T09:25:20.000Z', '2024-01-10', '09:25:20', 'sid_demo1', 'uid_demo1',
    '/tips.html', '꿀팁', 'tip_12', '신생아 트림시키는 법', '/tools/fever-medicine.html',
    'internal', 'mobile', 'Android', 'Chrome', 'KR', 'N',
    80, 60, 'exit',
  ]);

  const evSheet = getOrCreateSheet(ss, SHEET_EVENTS, EVENTS_HEADERS);
  evSheet.appendRow([
    '2024-01-10T09:23:45.000Z', '2024-01-10', '09:23:45', 'sid_demo1', 'uid_demo1',
    '/tools/fever-medicine.html', '해열제계산기', 'tool_calculate', JSON.stringify({ button_text: '🌡️ 용량 계산하기' }),
    'mobile', 'Android', 'Chrome', 'KR',
  ]);
  evSheet.appendRow([
    '2024-01-10T09:23:10.000Z', '2024-01-10', '09:23:10', 'sid_demo1', 'uid_demo1',
    '/tools/fever-medicine.html', '해열제계산기', 'ad_impression', JSON.stringify({ ad_slot: 'infeed' }),
    'mobile', 'Android', 'Chrome', 'KR',
  ]);
  evSheet.appendRow([
    '2024-01-10T09:26:00.000Z', '2024-01-10', '09:26:00', 'sid_demo1', 'uid_demo1',
    '/tips.html', '꿀팁', 'outbound_click', JSON.stringify({ link_url: 'https://coupa.ng/abc123', link_domain: 'coupa.ng', is_affiliate: 'yes' }),
    'mobile', 'Android', 'Chrome', 'KR',
  ]);

  SpreadsheetApp.getUi().alert('✅ 샘플 데이터 삽입 완료!\n\nsessions / pageviews / events 3개 시트에 데모 데이터가 추가됐어요.');
}
