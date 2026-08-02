/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        아이로그 — 익명 댓글 백엔드 (Apps Script)          ║
 * ║                      comments.gs                          ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  놀이(play.html) 액티비티 상세페이지의 "익명 댓글" 기능용    ║
 * ║  Apps Script 웹앱입니다. 댓글 원문은 절대 그대로 저장하지    ║
 * ║  않고, 이 스크립트만 아는 비밀키로 암호화한 뒤 구글시트에     ║
 * ║  저장합니다. 시트를 직접 열어봐도 암호문만 보이고,           ║
 * ║  댓글을 불러올 때만 이 스크립트가 복호화해서 돌려줍니다.      ║
 * ║                                                            ║
 * ║  배포 방법 (tracker.gs와 동일한 방식):                      ║
 * ║  1. script.google.com → 새 프로젝트 (또는 댓글 저장용         ║
 * ║     스프레드시트를 새로 만들고 "확장 프로그램 → Apps Script") ║
 * ║  2. 이 코드 전체를 Code.gs에 붙여넣기                        ║
 * ║  3. 배포 → 새 배포 → 웹앱                                    ║
 * ║     - 다음 사용자로 실행: 나                                  ║
 * ║     - 액세스 권한: 모든 사용자                                ║
 * ║  4. 배포 URL을 config.js의 COMMENTS_URL에 입력               ║
 * ║  ⚠ 비밀키(COMMENT_ENC_KEY)는 아래 initSecretKey() 함수를      ║
 * ║     Apps Script 편집기에서 한 번 실행하면 자동으로 안전한      ║
 * ║     랜덤 값이 생성되어 "스크립트 속성"에 저장됩니다.           ║
 * ║     (코드에 직접 키를 적지 않으므로 GitHub에 올라가도 안전)     ║
 * ║  ⚠ 코드를 고칠 때마다 "새 버전"으로 재배포해야 반영됩니다.      ║
 * ╚══════════════════════════════════════════════════════════╝
 */

var SHEET_COMMENTS = 'comments';
var COMMENTS_HEADERS = ['id', 'activity_id', 'iv', 'ct', 'mac', 'created_at'];
var MAX_COMMENT_CHARS = 200;      // 댓글 최대 글자 수 (front-end와 동일하게 유지)
var MAX_COMMENTS_RETURNED = 200;  // 한 액티비티당 최대로 돌려줄 댓글 수 (최신순)

// ══════════════════════════════════════════════════════════
// 엔드포인트
// ══════════════════════════════════════════════════════════

// tracker.gs와 동일한 이유로, 실제로는 doGet만 사용합니다.
// (Apps Script 웹앱은 요청을 302로 리다이렉트하는데, fetch가 이를 따라가면서
//  POST body가 사라지고 GET으로 바뀌어버리는 브라우저 표준 동작 때문입니다.
//  그래서 댓글 등록도 GET + 쿼리 파라미터 방식으로 처리합니다.)
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action === 'list') return buildResponse(listComments(ss, p.activity_id || ''));
    if (action === 'add') return buildResponse(addComment(ss, p.activity_id || '', p.text || ''));
    if (action === 'ping') return buildResponse({ status: 'ok', message: '아이로그 익명 댓글 API', ts: new Date().toISOString() });
    return buildResponse({ ok: false, error: 'unknown action' });
  } catch (err) {
    return buildResponse({ ok: false, error: err.message });
  }
}

// 레거시/서버-투-서버 테스트용 (tracker.gs와 동일 패턴)
function doPost(e) {
  return doGet(e);
}

// ══════════════════════════════════════════════════════════
// 댓글 조회 / 등록
// ══════════════════════════════════════════════════════════

function listComments(ss, activityId) {
  if (!activityId) return { ok: false, error: 'activity_id가 필요해요' };

  var sheet = ss.getSheetByName(SHEET_COMMENTS);
  if (!sheet) return { ok: true, comments: [] };

  var last = sheet.getLastRow();
  if (last <= 1) return { ok: true, comments: [] };

  var values = sheet.getRange(2, 1, last - 1, COMMENTS_HEADERS.length).getValues();
  var out = [];

  for (var i = values.length - 1; i >= 0 && out.length < MAX_COMMENTS_RETURNED; i--) {
    var row = values[i];
    var rowActivityId = String(row[1]);
    if (rowActivityId !== String(activityId)) continue;

    var plain = decryptComment(row[2], row[3], row[4]);
    if (plain === null) continue; // 위변조되었거나 손상된 행은 건너뜀 (표시하지 않음)

    out.push({ id: String(row[0]), text: plain, created_at: row[5] });
  }

  return { ok: true, comments: out };
}

function addComment(ss, activityId, rawText) {
  if (!activityId) return { ok: false, error: 'activity_id가 필요해요' };

  var text = String(rawText || '').trim();
  if (!text) return { ok: false, error: '댓글 내용이 비어있어요' };

  var charCount = toCodePointArray(text).length;
  if (charCount > MAX_COMMENT_CHARS) {
    return { ok: false, error: '댓글은 최대 ' + MAX_COMMENT_CHARS + '자까지 작성할 수 있어요' };
  }

  var enc = encryptComment(text);
  var id = 'c_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1e6);
  var now = new Date().toISOString();

  var sheet = getOrCreateSheet(ss, SHEET_COMMENTS, COMMENTS_HEADERS);
  sheet.appendRow([id, String(activityId), enc.iv, enc.ct, enc.mac, now]);

  return { ok: true, comment: { id: id, text: text, created_at: now } };
}

// ══════════════════════════════════════════════════════════
// 암호화 / 복호화
//   · HMAC-SHA256을 이용한 카운터 기반 스트림 암호(키스트림) + HMAC 인증(Encrypt-then-MAC)
//   · AES 없이도 Apps Script 내장 함수(Utilities.computeHmacSha256Signature)만으로
//     기밀성(암호화)과 무결성(위변조 감지)을 함께 보장합니다.
//   · 비밀키는 스크립트 속성(PropertiesService)에만 저장되고 절대 시트나
//     프런트엔드 코드에 노출되지 않습니다.
// ══════════════════════════════════════════════════════════

function getSecretKeyBytes_() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('COMMENT_ENC_KEY');
  if (!key) {
    // 최초 호출 시 안전한 랜덤 키를 자동 생성해 저장합니다.
    key = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + Utilities.getUuid();
    props.setProperty('COMMENT_ENC_KEY', key);
  }
  return utf8Encode_(key);
}

// Apps Script 편집기에서 이 함수를 한 번 실행하면 비밀키가 생성/확인됩니다.
// (직접 실행하지 않아도 addComment 최초 호출 시 자동 생성되지만,
//  배포 직후 정상 동작을 확인하고 싶다면 실행해보세요.)
function initSecretKey() {
  var keyBytes = getSecretKeyBytes_();
  Logger.log('비밀키가 준비됐어요. (길이: ' + keyBytes.length + ' bytes) 이 값은 로그에도, 코드에도 노출되지 않습니다.');
}

function hmacSha256_(keyBytes, msgBytes) {
  var raw = Utilities.computeHmacSha256Signature(msgBytes, keyBytes);
  return toUnsigned_(raw);
}

function keystream_(keyBytes, ivBytes, lengthNeeded) {
  var out = [];
  var counter = 0;
  while (out.length < lengthNeeded) {
    var counterBytes = utf8Encode_(String(counter));
    var block = hmacSha256_(keyBytes, ivBytes.concat(counterBytes));
    out = out.concat(block);
    counter++;
  }
  return out.slice(0, lengthNeeded);
}

function xorBytes_(a, ks) {
  var out = [];
  for (var i = 0; i < a.length; i++) out.push((a[i] ^ ks[i]) & 0xFF);
  return out;
}

function encryptComment(plainText) {
  var keyBytes = getSecretKeyBytes_();
  var ivBytes = utf8Encode_(Utilities.getUuid());
  var plainBytes = utf8Encode_(plainText);
  var ks = keystream_(keyBytes, ivBytes, plainBytes.length);
  var cipherBytes = xorBytes_(plainBytes, ks);
  var mac = hmacSha256_(keyBytes, ivBytes.concat(cipherBytes));
  return {
    iv: bytesToBase64_(ivBytes),
    ct: bytesToBase64_(cipherBytes),
    mac: bytesToBase64_(mac),
  };
}

// 위변조되었거나 (예: 시트를 직접 손으로 수정) 손상된 경우 null을 반환합니다.
function decryptComment(ivB64, ctB64, macB64) {
  try {
    var keyBytes = getSecretKeyBytes_();
    var ivBytes = base64ToBytes_(ivB64);
    var cipherBytes = base64ToBytes_(ctB64);
    var expectedMac = hmacSha256_(keyBytes, ivBytes.concat(cipherBytes));
    if (bytesToBase64_(expectedMac) !== macB64) return null;
    var ks = keystream_(keyBytes, ivBytes, cipherBytes.length);
    var plainBytes = xorBytes_(cipherBytes, ks);
    return utf8Decode_(plainBytes);
  } catch (err) {
    return null;
  }
}

// ── 바이트 유틸 ──────────────────────────────────────────
// Apps Script의 Utilities.* 함수들은 Java의 signed byte(-128~127) 관례를 따릅니다.
// 우리 쪽 배열 연산은 전부 unsigned(0~255)로 통일하고, base64 변환 시에만
// signed 범위로 되돌려 Utilities.base64Encode와의 호환성을 보장합니다.
function toUnsigned_(byteArray) {
  var out = [];
  for (var i = 0; i < byteArray.length; i++) out.push(byteArray[i] & 0xFF);
  return out;
}
function toSigned_(byteArray) {
  var out = [];
  for (var i = 0; i < byteArray.length; i++) {
    var b = byteArray[i] & 0xFF;
    out.push(b > 127 ? b - 256 : b);
  }
  return out;
}
function bytesToBase64_(unsignedByteArray) {
  return Utilities.base64Encode(toSigned_(unsignedByteArray));
}
function base64ToBytes_(b64) {
  return toUnsigned_(Utilities.base64Decode(b64));
}

// ── UTF-8 <-> 바이트 배열 (순수 JS 구현, 한글/이모지 포함 전 유니코드 지원) ──
function utf8Encode_(str) {
  var bytes = [];
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
      var next = str.charCodeAt(i + 1);
      if (next >= 0xDC00 && next <= 0xDFFF) {
        code = 0x10000 + ((code - 0xD800) << 10) + (next - 0xDC00);
        i++;
      }
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
    } else if (code < 0x10000) {
      bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
    } else {
      bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
    }
  }
  return bytes;
}
function utf8Decode_(bytes) {
  var str = '';
  var i = 0;
  while (i < bytes.length) {
    var b0 = bytes[i] & 0xFF;
    if (b0 < 0x80) {
      str += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xE0) === 0xC0) {
      var b1 = bytes[i + 1] & 0xFF;
      str += String.fromCharCode(((b0 & 0x1F) << 6) | (b1 & 0x3F));
      i += 2;
    } else if ((b0 & 0xF0) === 0xE0) {
      var c1 = bytes[i + 1] & 0xFF, c2 = bytes[i + 2] & 0xFF;
      str += String.fromCharCode(((b0 & 0x0F) << 12) | ((c1 & 0x3F) << 6) | (c2 & 0x3F));
      i += 3;
    } else {
      var d1 = bytes[i + 1] & 0xFF, d2 = bytes[i + 2] & 0xFF, d3 = bytes[i + 3] & 0xFF;
      var cp = ((b0 & 0x07) << 18) | ((d1 & 0x3F) << 12) | ((d2 & 0x3F) << 6) | (d3 & 0x3F);
      cp -= 0x10000;
      str += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
      i += 4;
    }
  }
  return str;
}
// 문자열을 "코드 포인트" 단위로 센 배열로 (이모지 1개 = 1글자로 세기 위함, 200자 제한 판단용)
function toCodePointArray(str) {
  return Array.from(str);
}

// ══════════════════════════════════════════════════════════
// 유틸
// ══════════════════════════════════════════════════════════

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4A7C59');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════
// 자체 점검용 (Apps Script 편집기에서 이 함수를 선택 후 ▶ 실행)
// 암호화 → 저장 → 조회 → 복호화가 한 바퀴 정상 동작하는지 확인합니다.
// ══════════════════════════════════════════════════════════
function selfTest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var testId = 'selftest_' + new Date().getTime();
  var sample = '자체 점검용 댓글입니다 🍼👶 한글/이모지 테스트 200자 제한 확인';

  var addResult = addComment(ss, testId, sample);
  var listResult = listComments(ss, testId);

  var pass = addResult.ok && listResult.ok && listResult.comments.length === 1 && listResult.comments[0].text === sample;
  Logger.log('addComment: ' + JSON.stringify(addResult));
  Logger.log('listComments: ' + JSON.stringify(listResult));
  Logger.log(pass ? '✅ 자체 점검 통과: 암호화 저장 → 복호화 조회가 정상 동작합니다.' : '❌ 자체 점검 실패');

  // 테스트로 추가한 행은 정리
  var sheet = ss.getSheetByName(SHEET_COMMENTS);
  if (sheet && addResult.ok) {
    var last = sheet.getLastRow();
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (ids[i][0] === addResult.comment.id) { sheet.deleteRow(i + 2); break; }
    }
  }
}
