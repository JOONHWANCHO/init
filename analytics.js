/**
 * analytics.js — 아기도구함 데이터 수집기
 * ─────────────────────────────────────────────────────────
 * 이벤트를 구글 시트로 직접 전송합니다.
 * config.js → TRACKER_URL 에 Apps Script 배포 URL을 입력하세요.
 *
 * 로드 순서: config.js → analytics.js
 */
(function () {
  'use strict';

  // ── 설정 ────────────────────────────────────────────────
  const TRACKER_URL = (typeof CONFIG !== 'undefined' && CONFIG.TRACKER_URL) ? CONFIG.TRACKER_URL : '';
  const GA_ID       = (typeof CONFIG !== 'undefined' && CONFIG.GA_ID)       ? CONFIG.GA_ID       : '';
  const BATCH_INTERVAL_MS = 5000;
  const MAX_QUEUE = 20;

  // ── 로컬 개발 환경 감지 ──────────────────────────────
  const IS_LOCAL = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '' ||
    location.protocol === 'file:'
  );

  // 로컬이면 콘솔에만 출력, 실제 전송 안 함
  if (IS_LOCAL) {
    console.log(
      '%c[아기도구함 Analytics] 🛠 로컬 개발 모드',
      'background:#3d7a5e;color:#fff;padding:3px 8px;border-radius:4px;font-weight:bold;'
    );
    console.log('%c이벤트는 콘솔에만 출력됩니다. 배포 환경에서 실제 데이터가 쌓여요.', 'color:#3d7a5e;');
  }

  // ── 페이지 정보 ─────────────────────────────────────────
  const PAGE_MAP = {
    'index.html':'홈','tips.html':'꿀팁','play.html':'액티비티',
    'sleep-calculator.html':'수면계산기','feeding-tracker.html':'수유타이머',
    'weaning-checker.html':'이유식체커','weaning-planner.html':'이유식플래너',
    'milk-calculator.html':'수유량계산기','growth-percentile.html':'성장백분위',
    'milestone-checker.html':'발달체크리스트','tooth-checker.html':'유치체커',
    'fever-medicine.html':'해열제계산기','fever-tracker.html':'체온기록',
    'medicine-guide.html':'약복용가이드','school-date.html':'입학날짜',
    'subsidy-calculator.html':'지원금계산기','parental-leave.html':'육아휴직계산기',
    'pregnancy-week.html':'임신주수','baby-name.html':'이름짓기',
    'colic-checker.html':'영아산통체커','birth-checklist.html':'출산체크리스트',
  };
  const filePart  = location.pathname.split('/').pop() || 'index.html';
  const pageName  = PAGE_MAP[filePart] || filePart.replace('.html','');
  const pagePath  = location.pathname;
  const enterTime = Date.now();

  // ── 세션 & 사용자 ID ────────────────────────────────────
  function getId(key, ttlMs) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null');
      if (stored && stored.exp > Date.now()) return stored.id;
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const val = JSON.stringify({ id, exp: Date.now() + ttlMs });
      sessionStorage.setItem(key, val);
      if (key === 'bt_uid') localStorage.setItem(key, val);
      return id;
    } catch (_) { return 'anon'; }
  }
  const sessionId = getId('bt_sid', 30 * 60 * 1000);   // 30분 세션
  const userId    = getId('bt_uid', 365 * 24 * 60 * 60 * 1000); // 1년 유저

  // ── UTM 파라미터 ────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const utm = {
    source:   params.get('utm_source')   || '',
    medium:   params.get('utm_medium')   || '',
    campaign: params.get('utm_campaign') || '',
  };

  // ── 디바이스 정보 ───────────────────────────────────────
  function getDevice() {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
  }
  function getOS() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad/i.test(ua)) return 'iOS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'macOS';
    return 'Other';
  }
  function getBrowser() {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) return 'Chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Edge/i.test(ua)) return 'Edge';
    return 'Other';
  }

  const deviceInfo = {
    device:       getDevice(),
    os:           getOS(),
    browser:      getBrowser(),
    screen_width: window.screen.width,
  };

  // ── 전송 큐 (배치) ──────────────────────────────────────
  let queue = [];

  function enqueue(item) {
    queue.push(item);
    if (queue.length >= MAX_QUEUE) flush();
  }

  function flush() {
    if (queue.length === 0) return;
    const batch = queue.splice(0);

    // 로컬 개발 모드 → 콘솔 출력만
    if (IS_LOCAL) {
      console.groupCollapsed(
        `%c[Analytics] 배치 전송 (${batch.length}개) — 로컬이라 실제 전송 안 함`,
        'color:#3d7a5e;font-weight:bold;'
      );
      batch.forEach(function (item) {
        console.log(`%c${item.event_name || item.type}`, 'color:#c87f1a;font-weight:bold;', item);
      });
      console.groupEnd();
      return;
    }

    if (!TRACKER_URL) return;

    const payload = JSON.stringify({ type: 'batch', items: batch });

    // Apps Script는 POST → 302 리다이렉트 발생
    // sendBeacon은 리다이렉트 미지원 → fetch no-cors 사용
    // no-cors는 응답 확인 불가하지만 데이터 전송은 됨
    try {
      fetch(TRACKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // no-cors에서는 simple header만 허용
        body: payload,
        mode: 'no-cors',   // CORS 에러 우회 (응답 읽기 불가하지만 전송은 됨)
        keepalive: true,   // 페이지 이탈 후에도 전송 유지
      }).catch(function () {});
    } catch (_) {}
  }

  // 주기적 배치 전송
  setInterval(flush, BATCH_INTERVAL_MS);

  // ── 공통 필드 ──────────────────────────────────────────
  function base(type, eventName) {
    return Object.assign({
      type,
      event_name: eventName || type,
      page_name:  pageName,
      page_path:  pagePath,
      session_id: sessionId,
      user_id:    userId,
      referrer:   document.referrer || '',
      utm_source:   utm.source,
      utm_medium:   utm.medium,
      utm_campaign: utm.campaign,
    }, deviceInfo);
  }

  // ── GA4 동시 전송 헬퍼 ─────────────────────────────────
  function gTag(name, params) {
    if (typeof gtag === 'function') gtag('event', name, params || {});
  }

  // ══════════════════════════════════════════════════════
  // 이벤트 수집
  // ══════════════════════════════════════════════════════

  window.addEventListener('DOMContentLoaded', function () {

    // ① 페이지뷰
    enqueue(Object.assign(base('pageview'), { type: 'pageview' }));
    gTag('page_view_custom', { page_name: pageName, referrer: document.referrer || 'direct' });

    // ② 광고 슬롯 노출
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const slot = entry.target.dataset.adSlot || 'unknown';
          enqueue(Object.assign(base('event', 'ad_impression'), { params: { ad_slot: slot } }));
          gTag('ad_impression', { page_name: pageName, ad_slot: slot });
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      document.querySelectorAll('.ad-slot').forEach(function (el, i) {
        el.dataset.adSlot = ['top','infeed','result','footer'][i] || 'other';
        obs.observe(el);
      });
    }

    // ③ 내부 검색어
    const si = document.getElementById('searchInput');
    if (si) {
      let t;
      si.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          const q = si.value.trim();
          if (q.length > 1) {
            enqueue(Object.assign(base('event', 'site_search'), { params: { search_term: q } }));
            gTag('site_search', { search_term: q, page_name: pageName });
          }
        }, 800);
      });
    }
  });

  // ④ 스크롤 깊이
  const scrollMilestones = new Set();
  window.addEventListener('scroll', function () {
    const pct = Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100);
    [25, 50, 75, 100].forEach(function (m) {
      if (pct >= m && !scrollMilestones.has(m)) {
        scrollMilestones.add(m);
        enqueue(Object.assign(base('event', 'scroll_depth'), { params: { depth_percent: m } }));
        gTag('scroll_depth', { page_name: pageName, depth_percent: m });
      }
    });
  }, { passive: true });

  // ⑤ 버튼 클릭
  window.addEventListener('click', function (e) {
    // 계산 버튼
    const calcBtn = e.target.closest('.calc-btn');
    if (calcBtn) {
      const txt = calcBtn.textContent.trim().slice(0, 50);
      enqueue(Object.assign(base('event', 'tool_calculate'), { params: { button_text: txt } }));
      gTag('tool_calculate', { page_name: pageName, button_text: txt });
    }
    // 필터 버튼
    const pillBtn = e.target.closest('.pill-btn');
    if (pillBtn) {
      const val = pillBtn.textContent.trim().slice(0, 30);
      enqueue(Object.assign(base('event', 'tool_filter'), { params: { filter_value: val } }));
    }
    // 카드 클릭
    const card = e.target.closest('.tool-card,.tip-card,.play-card');
    if (card) {
      const nameEl = card.querySelector('.tc-name,.tip-title,.play-name');
      const name   = nameEl ? nameEl.textContent.trim() : 'unknown';
      enqueue(Object.assign(base('event', 'card_click'), { params: { card_name: name } }));
      gTag('card_click', { page_name: pageName, card_name: name });
    }
    // 하트(찜) 버튼
    const heartBtn = e.target.closest('.heart-btn');
    if (heartBtn) {
      enqueue(Object.assign(base('event', 'wishlist_toggle'), { params: { liked: heartBtn.classList.contains('liked') } }));
    }
  }, { passive: true });

  // ⑥ 외부 링크 (어필리에이트)
  window.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('http') || href.includes(location.hostname)) return;
    let domain = '';
    try { domain = new URL(href).hostname.replace('www.',''); } catch(_) {}
    const isAffiliate = (href.includes('coupang') || href.includes('coupa.ng')) ? 'yes' : 'no';
    enqueue(Object.assign(base('event', 'outbound_click'), {
      params: { link_url: href.slice(0,200), link_domain: domain, is_affiliate: isAffiliate },
    }));
    gTag('outbound_click', { page_name: pageName, link_domain: domain, is_affiliate: isAffiliate });
  }, { passive: true });

  // ⑦ 체류 시간 (이탈 직전 전송)
  function sendTimeOnPage() {
    const sec = Math.round((Date.now() - enterTime) / 1000);
    if (sec < 2) return;
    const maxScroll = Math.max(...[...scrollMilestones, 0]);
    enqueue(Object.assign(base('event', 'time_on_page'), { params: { seconds: sec, max_scroll: maxScroll } }));
    flush(); // 이탈 전 즉시 전송
  }
  window.addEventListener('beforeunload', sendTimeOnPage);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendTimeOnPage();
  });

  // ⑧ JS 에러
  window.addEventListener('error', function (e) {
    enqueue(Object.assign(base('event', 'js_error'), {
      params: { message: (e.message||'').slice(0,100), source: (e.filename||'').split('/').pop() },
    }));
    gTag('js_error', { page_name: pageName, message: (e.message||'').slice(0,100) });
  });

})();
