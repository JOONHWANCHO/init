/**
 * MomCare public, read-only posts API for a Google Sheet.
 * Bind this script to the spreadsheet (Extensions > Apps Script).
 * Deploy as a Web app: Execute as you, access: Anyone.
 */
const POSTS_SHEET_NAME = 'posts';
const POSTS_TIME_ZONE = 'Asia/Seoul';
const ALLOWED_LANGUAGES = ['ko', 'ja', 'en'];

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const callback = isSafeCallback_(params.callback) ? params.callback : '';

  try {
    const action = String(params.action || 'posts').toLowerCase();
    if (action !== 'posts') {
      return respond_({ ok: false, error: 'Unsupported action.' }, callback);
    }

    const langParam = String(params.lang || 'ko').toLowerCase();
    const lang = ALLOWED_LANGUAGES.indexOf(langParam) >= 0 ? langParam : 'ko';
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error('No active spreadsheet. Bind this script to the posts spreadsheet.');

    const sheet = spreadsheet.getSheetByName(POSTS_SHEET_NAME);
    if (!sheet) throw new Error('The sheet tab named "' + POSTS_SHEET_NAME + '" was not found.');

    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) {
      return respond_({ ok: true, lang: lang, posts: [] }, callback);
    }

    const headers = values[0].map(function (value) {
      return String(value == null ? '' : value).trim().toLowerCase().replace(/[\s-]+/g, '_');
    });
    const requiredHeaders = ['id', 'lang', 'category', 'emoji', 'title', 'summary', 'tags', 'date', 'content', 'link', 'status', 'publish_at'];
    const missing = requiredHeaders.filter(function (name) { return headers.indexOf(name) < 0; });
    if (missing.length) {
      throw new Error('Missing required columns: ' + missing.join(', '));
    }

    const col = {};
    requiredHeaders.forEach(function (name) { col[name] = headers.indexOf(name); });
    const now = new Date();
    const timeZone = spreadsheet.getSpreadsheetTimeZone() || POSTS_TIME_ZONE;
    const publicRows = [];

    values.slice(1).forEach(function (row) {
      const rowLang = text_(row[col.lang]).toLowerCase();
      if (rowLang !== lang) return;

      const status = text_(row[col.status]).toLowerCase();
      const publishAt = parseDate_(row[col.publish_at]);
      const isPublishedStatus = status === 'published';
      const isScheduledAndDue = status === 'scheduled' && publishAt && publishAt.getTime() <= now.getTime();
      const isPublishedAndDue = isPublishedStatus && (!publishAt || publishAt.getTime() <= now.getTime());
      if (!isScheduledAndDue && !isPublishedAndDue) return;

      const post = {
        id: text_(row[col.id]),
        lang: rowLang,
        category: text_(row[col.category]),
        emoji: text_(row[col.emoji]),
        title: text_(row[col.title]),
        summary: text_(row[col.summary]),
        tags: text_(row[col.tags]),
        date: formatDate_(row[col.date], timeZone),
        content: text_(row[col.content]),
        link: safeLink_(row[col.link])
      };

      // A localized row is publishable only when the article has all essential translated fields.
      // If no row (or no complete row) exists for a language, that article stays hidden in that language.
      if (!post.id || !post.title || !post.summary || !post.content) return;

      const sortDate = publishAt || parseDate_(row[col.date]);
      publicRows.push({ post: post, sortTime: sortDate ? sortDate.getTime() : 0 });
    });

    publicRows.sort(function (a, b) { return b.sortTime - a.sortTime; });
    return respond_({
      ok: true,
      lang: lang,
      generated_at: Utilities.formatDate(now, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      posts: publicRows.map(function (item) { return item.post; })
    }, callback);
  } catch (error) {
    // Avoid returning stack traces or sheet content to public callers.
    return respond_({ ok: false, error: String(error && error.message ? error.message : 'Server error') }, callback);
  }
}

function respond_(payload, callback) {
  const body = callback ? callback + '(' + JSON.stringify(payload) + ');' : JSON.stringify(payload);
  const mimeType = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(body).setMimeType(mimeType);
}

function isSafeCallback_(callback) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(callback || ''));
}

function text_(value) {
  return value == null ? '' : String(value).trim();
}

function formatDate_(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }
  return text_(value);
}

function parseDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const raw = text_(value);
  if (!raw) return null;

  // Sheet cells entered as YYYY-MM-DD or YYYY-MM-DD HH:mm are interpreted in Korea time.
  const match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const year = match[1];
    const month = String(match[2]).padStart(2, '0');
    const day = String(match[3]).padStart(2, '0');
    const hour = String(match[4] || '00').padStart(2, '0');
    const minute = String(match[5] || '00').padStart(2, '0');
    const second = String(match[6] || '00').padStart(2, '0');
    const parsed = new Date(year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + '+09:00');
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function safeLink_(value) {
  const raw = text_(value);
  return /^https?:\/\//i.test(raw) ? raw : '';
}
