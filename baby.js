/**
 * baby.js — 아기도구함 개인화 엔진
 * 내 아이 프로필 / 성장 기록 / 예방접종 D-day / 연속 방문 스트릭을
 * localStorage에 저장하고, 여러 페이지(도구/홈/성장기록)에서 공통으로 사용합니다.
 * 서버에 아무것도 전송하지 않으며, 이 브라우저(기기)에만 저장됩니다.
 */
(function (global) {
  'use strict';

  var PROFILE_KEY = 'babyProfile_v1';
  var RECORDS_KEY = 'growthRecords_v1';
  var VACCINE_KEY = 'vaccineDone_v1';
  var STREAK_KEY = 'visitStreak_v1';

  // ── 유틸 ──────────────────────────────────────────────
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) {
    var da = new Date(a + 'T00:00:00');
    var db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
  }
  function addMonths(dateStr, months) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + months);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ── 프로필 ────────────────────────────────────────────
  function getProfile() { return readJSON(PROFILE_KEY, null); }
  function saveProfile(p) {
    var cur = getProfile() || {};
    var next = {
      name: (p.name || cur.name || '').trim(),
      birthdate: p.birthdate || cur.birthdate || '',
      gender: p.gender !== undefined ? p.gender : (cur.gender || ''),
      createdAt: cur.createdAt || todayStr(),
    };
    writeJSON(PROFILE_KEY, next);
    return next;
  }
  function clearProfile() {
    try {
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(RECORDS_KEY);
      localStorage.removeItem(VACCINE_KEY);
    } catch (e) {}
  }

  // ── 나이 계산 ─────────────────────────────────────────
  function ageInfo(birthdate) {
    if (!birthdate) return null;
    var days = daysBetween(birthdate, todayStr());
    if (days < 0) return { days: days, months: 0, years: 0, text: '출산 예정일까지 D-' + Math.abs(days), isUnborn: true };
    var years = Math.floor(days / 365);
    var months = Math.floor(days / 30.44);
    var text;
    if (months < 1) text = '생후 ' + days + '일';
    else if (months < 24) text = '생후 ' + months + '개월 (' + days + '일)';
    else text = years + '세 ' + (months - years * 12) + '개월';
    return { days: days, months: months, years: years, text: text, isUnborn: false };
  }

  // ── 성장 기록 ─────────────────────────────────────────
  function getRecords() {
    var arr = readJSON(RECORDS_KEY, []);
    return arr.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function addRecord(rec) {
    var arr = readJSON(RECORDS_KEY, []);
    arr.push({
      id: uid(),
      date: rec.date || todayStr(),
      weight: rec.weight ? Number(rec.weight) : null,
      height: rec.height ? Number(rec.height) : null,
      note: (rec.note || '').trim(),
    });
    writeJSON(RECORDS_KEY, arr);
    return arr;
  }
  function deleteRecord(id) {
    var arr = readJSON(RECORDS_KEY, []).filter(function (r) { return r.id !== id; });
    writeJSON(RECORDS_KEY, arr);
    return arr;
  }

  // ── 예방접종 D-day (질병관리청 표준 일정 간소화 — 참고용) ──
  var VACCINE_SCHEDULE = [
    { key: 'hepb1', name: 'B형간염 1차', monthsAge: 0 },
    { key: 'bcg', name: 'BCG(결핵)', monthsAge: 1 },
    { key: 'hepb2', name: 'B형간염 2차', monthsAge: 1 },
    { key: 'dtap1', name: 'DTaP 1차 (디프테리아·파상풍·백일해)', monthsAge: 2 },
    { key: 'ipv1', name: 'IPV 1차 (폴리오)', monthsAge: 2 },
    { key: 'hib1', name: 'Hib 1차', monthsAge: 2 },
    { key: 'pcv1', name: '폐렴구균 1차', monthsAge: 2 },
    { key: 'rv1', name: '로타바이러스 1차', monthsAge: 2 },
    { key: 'dtap2', name: 'DTaP 2차', monthsAge: 4 },
    { key: 'ipv2', name: 'IPV 2차', monthsAge: 4 },
    { key: 'hib2', name: 'Hib 2차', monthsAge: 4 },
    { key: 'pcv2', name: '폐렴구균 2차', monthsAge: 4 },
    { key: 'dtap3', name: 'DTaP 3차', monthsAge: 6 },
    { key: 'hepb3', name: 'B형간염 3차', monthsAge: 6 },
    { key: 'hib3', name: 'Hib 3차', monthsAge: 6 },
    { key: 'pcv3', name: '폐렴구균 3차', monthsAge: 6 },
    { key: 'flu', name: '인플루엔자 (매년 접종)', monthsAge: 6 },
    { key: 'mmr1', name: 'MMR 1차 (홍역·유행성이하선염·풍진)', monthsAge: 12 },
    { key: 'varicella', name: '수두', monthsAge: 12 },
    { key: 'hepa1', name: 'A형간염 1차', monthsAge: 12 },
    { key: 'je1', name: '일본뇌염(사백신) 1차', monthsAge: 12 },
    { key: 'pcv4', name: '폐렴구균 4차', monthsAge: 12 },
    { key: 'hib4', name: 'Hib 4차', monthsAge: 12 },
    { key: 'dtap4', name: 'DTaP 4차', monthsAge: 15 },
    { key: 'hepa2', name: 'A형간염 2차', monthsAge: 18 },
  ];
  function getVaccineDone() { return readJSON(VACCINE_KEY, {}); }
  function setVaccineDone(key, done) {
    var m = getVaccineDone();
    if (done) m[key] = true; else delete m[key];
    writeJSON(VACCINE_KEY, m);
    return m;
  }
  function getVaccineList(birthdate) {
    if (!birthdate) return [];
    var done = getVaccineDone();
    var today = todayStr();
    return VACCINE_SCHEDULE.map(function (v) {
      var dueDate = addMonths(birthdate, v.monthsAge);
      var dday = daysBetween(today, dueDate);
      return {
        key: v.key, name: v.name, dueDate: dueDate, dday: dday,
        done: !!done[v.key],
        status: done[v.key] ? 'done' : (dday < 0 ? 'overdue' : (dday <= 14 ? 'soon' : 'upcoming')),
      };
    }).sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; });
  }
  function nextVaccine(birthdate) {
    var list = getVaccineList(birthdate).filter(function (v) { return !v.done; });
    return list.length ? list[0] : null;
  }

  // ── 연속 방문 스트릭 & 뱃지 ───────────────────────────
  var BADGES = [
    { id: 'd3', days: 3, emoji: '🌱', name: '새싹 방문자', desc: '3일 연속 방문' },
    { id: 'd7', days: 7, emoji: '🔥', name: '일주일 챔피언', desc: '7일 연속 방문' },
    { id: 'd14', days: 14, emoji: '⭐', name: '2주 개근', desc: '14일 연속 방문' },
    { id: 'd30', days: 30, emoji: '🏆', name: '한 달 마스터', desc: '30일 연속 방문' },
    { id: 'd100', days: 100, emoji: '💎', name: '백일의 기록', desc: '100일 연속 방문' },
    { id: 'd365', days: 365, emoji: '👑', name: '1년의 동행', desc: '365일 연속 방문' },
  ];
  function getStreak() {
    return readJSON(STREAK_KEY, { lastVisit: '', current: 0, longest: 0, totalDays: 0, badges: [] });
  }
  function recordVisitToday() {
    var s = getStreak();
    var today = todayStr();
    if (s.lastVisit === today) return { streak: s, newBadge: null }; // 오늘 이미 기록됨

    var gap = s.lastVisit ? daysBetween(s.lastVisit, today) : null;
    if (gap === 1) s.current += 1;
    else s.current = 1; // 처음 방문 or 하루 이상 공백 → 스트릭 리셋

    s.totalDays = (s.totalDays || 0) + 1;
    s.longest = Math.max(s.longest || 0, s.current);
    s.lastVisit = today;

    var newBadge = null;
    BADGES.forEach(function (b) {
      if (s.current >= b.days && s.badges.indexOf(b.id) === -1) {
        s.badges.push(b.id);
        newBadge = b;
      }
    });

    writeJSON(STREAK_KEY, s);
    return { streak: s, newBadge: newBadge };
  }
  function getBadgeDefs() { return BADGES; }

  // ── 자동 입력: 아이 월령/생년월일을 도구 페이지 입력값에 반영 ──
  // 특정 id의 input/select가 있는 페이지에서만 동작 (없으면 조용히 무시)
  function autofillAgeInputs() {
    var profile = getProfile();
    if (!profile || !profile.birthdate) return;
    var info = ageInfo(profile.birthdate);
    if (!info || info.isUnborn) return;
    var months = info.months;
    var filled = false;

    // 1) type="date" 생년월일 입력 (school-date, subsidy-calculator 등)
    var bd = document.getElementById('birthDate');
    if (bd && bd.tagName === 'INPUT' && !bd.value) {
      bd.value = profile.birthdate;
      filled = true;
      // 이 계산기는 생년월일 하나만 있으면 결과가 나오므로 바로 계산까지 실행
      if (typeof global.calculate === 'function') {
        try { global.calculate(); } catch (e) {}
      }
    }

    // 2) 월령 숫자 입력 (growth-percentile, fever-medicine 등)
    var am = document.getElementById('ageMonth');
    if (am && am.tagName === 'INPUT' && !am.value) {
      am.value = months;
      filled = true;
    }

    // 3) 성별 셀렉트 (growth-percentile)
    if (profile.gender) {
      var gs = document.getElementById('genderSel');
      if (gs && gs.tagName === 'SELECT') {
        gs.value = profile.gender;
        if (typeof global.syncGender === 'function') { try { global.syncGender(profile.gender); } catch (e) {} }
      }
    }

    // 4) 월령 드롭다운 (milk-calculator)
    var ms = document.getElementById('monthSel');
    if (ms && ms.tagName === 'SELECT') {
      var opts = Array.prototype.map.call(ms.options, function (o) { return parseInt(o.value, 10); }).filter(function (n) { return !isNaN(n); });
      if (opts.length) {
        var closest = opts.reduce(function (a, b) { return Math.abs(b - months) < Math.abs(a - months) ? b : a; });
        ms.value = String(closest);
        filled = true;
      }
    }

    // 5) 월령 버튼그룹 + 전역 render(m) 함수 (tooth-checker, milestone-checker, weaning-checker)
    var btnGroup = document.getElementById('monthBtns');
    if (btnGroup) {
      var btns = Array.prototype.slice.call(btnGroup.querySelectorAll('.pill-btn'));
      if (btns.length) {
        var best = null, bestDiff = Infinity;
        btns.forEach(function (b) {
          var m = parseInt(b.dataset.m, 10);
          if (!isNaN(m)) {
            var diff = Math.abs(m - months);
            if (diff < bestDiff) { bestDiff = diff; best = b; }
          }
        });
        if (best) { best.click(); filled = true; }
      }
    }

    if (filled) showAutofillToast(profile);
  }

  function showAutofillToast(profile) {
    if (document.getElementById('babyAutofillToast')) return;
    var el = document.createElement('div');
    el.id = 'babyAutofillToast';
    el.className = 'baby-toast';
    var label = profile.name ? profile.name : '내 아이';
    el.innerHTML = '🍼 <b>' + label + '</b>의 정보로 자동 입력했어요';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  // ── 내비게이션 뱃지 렌더 (모든 페이지 공통) ────────────
  function renderNavBadge() {
    var slots = document.querySelectorAll('[data-baby-badge]');
    if (!slots.length) return;
    var profile = getProfile();
    var streak = getStreak();
    var rootPrefix = document.body.getAttribute('data-root-prefix') || '';
    var growthUrl = rootPrefix + 'growth.html';

    slots.forEach(function (slot) {
      if (profile && profile.birthdate) {
        var info = ageInfo(profile.birthdate);
        var name = profile.name || '우리 아이';
        var streakPart = streak.current > 1 ? ' · 🔥' + streak.current : '';
        slot.innerHTML = '<a href="' + growthUrl + '" class="baby-badge-link">' +
          '<span class="bb-emoji">🍼</span><span class="bb-text">' + name + ' · ' + info.text + streakPart + '</span></a>';
      } else {
        slot.innerHTML = '<a href="' + growthUrl + '" class="baby-badge-link bb-cta">' +
          '<span class="bb-emoji">🍼</span><span class="bb-text">내 아이 등록</span></a>';
      }
    });
  }

  // ── 홈 대시보드 렌더 (index.html 전용, #babyDashboard 있을 때만) ──
  function renderHomeDashboard() {
    var el = document.getElementById('babyDashboard');
    if (!el) return;
    var rootPrefix = document.body.getAttribute('data-root-prefix') || '';
    var profile = getProfile();
    var streak = getStreak();

    if (!profile || !profile.birthdate) {
      el.innerHTML =
        '<div class="baby-dash-card baby-dash-empty">' +
        '  <div class="bd-emoji">🍼</div>' +
        '  <div class="bd-empty-text">' +
        '    <div class="bd-empty-title">우리 아이 정보를 등록해보세요</div>' +
        '    <div class="bd-empty-desc">생년월일 하나만 등록하면 나이·예방접종 D-day가 자동으로 계산되고, 도구마다 매번 다시 입력할 필요가 없어요.</div>' +
        '  </div>' +
        '  <a href="' + rootPrefix + 'growth.html" class="bd-cta-btn">지금 등록하기 →</a>' +
        '</div>';
      return;
    }

    var info = ageInfo(profile.birthdate);
    var nv = nextVaccine(profile.birthdate);
    var records = getRecords();
    var lastRecord = records.length ? records[records.length - 1] : null;

    var vaccineHtml = nv
      ? ('<div class="bd-stat-value">' + nv.name + '</div><div class="bd-stat-sub">' + (nv.dday <= 0 ? 'D-day 지남' : 'D-' + nv.dday) + ' · ' + nv.dueDate + '</div>')
      : '<div class="bd-stat-value">등록된 예정 없음</div><div class="bd-stat-sub">모두 완료했거나 대상 연령을 지났어요</div>';

    var recordHtml = lastRecord
      ? ('<div class="bd-stat-value">' + lastRecord.date + '</div><div class="bd-stat-sub">' + (lastRecord.weight ? lastRecord.weight + 'kg ' : '') + (lastRecord.height ? lastRecord.height + 'cm' : '') + '</div>')
      : '<div class="bd-stat-value">기록 없음</div><div class="bd-stat-sub">첫 기록을 남겨보세요</div>';

    el.innerHTML =
      '<div class="baby-dash-card">' +
      '  <div class="bd-head">' +
      '    <div class="bd-head-emoji">🍼</div>' +
      '    <div>' +
      '      <div class="bd-name">' + (profile.name || '우리 아이') + '</div>' +
      '      <div class="bd-age">' + info.text + '</div>' +
      '    </div>' +
      '    <div class="bd-streak">🔥 ' + streak.current + '일 연속</div>' +
      '  </div>' +
      '  <div class="bd-stats">' +
      '    <div class="bd-stat"><div class="bd-stat-label">💉 다음 예방접종</div>' + vaccineHtml + '</div>' +
      '    <div class="bd-stat"><div class="bd-stat-label">📏 최근 성장 기록</div>' + recordHtml + '</div>' +
      '  </div>' +
      '  <a href="' + rootPrefix + 'growth.html" class="bd-cta-btn bd-cta-full">성장 기록 보러가기 →</a>' +
      '</div>';
  }

  // ── 초기화 ────────────────────────────────────────────
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    recordVisitToday();
    renderNavBadge();
    renderHomeDashboard();
    autofillAgeInputs();
  });

  // ── 외부 공개 API ─────────────────────────────────────
  global.BabyProfile = {
    getProfile: getProfile,
    saveProfile: saveProfile,
    clearProfile: clearProfile,
    ageInfo: ageInfo,
    getRecords: getRecords,
    addRecord: addRecord,
    deleteRecord: deleteRecord,
    getVaccineList: getVaccineList,
    setVaccineDone: setVaccineDone,
    nextVaccine: nextVaccine,
    getStreak: getStreak,
    recordVisitToday: recordVisitToday,
    getBadgeDefs: getBadgeDefs,
    renderNavBadge: renderNavBadge,
    renderHomeDashboard: renderHomeDashboard,
    todayStr: todayStr,
    daysBetween: daysBetween,
  };
})(window);
