/**
 * analytics.js — 아기도구함 데이터 수집기 v2
 * ─────────────────────────────────────────────────────────
 * 페이지뷰뿐 아니라 유입경로, 기기/브라우저/국가, 사이트 내 이동 경로,
 * 체류시간, 이탈 여부, 광고/어필리에이트 등 수익 관련 이벤트까지 수집합니다.
 * config.js → TRACKER_URL 에 Apps Script 배포 URL을 입력하세요.
 *
 * 로드 순서: config.js → analytics.js
 *
 * 공개 API (tips.html/play.html 등 상세보기 SPA 화면에서 사용):
 *   window.BTAnalytics.trackContentView(contentType, id, title)
 *   window.BTAnalytics.trackEvent(name, params)
 */
(function () {
  'use strict';

  // ── 설정 ────────────────────────────────────────────────
  const TRACKER_URL = (typeof CONFIG !== 'undefined' && CONFIG.TRACKER_URL) ? CONFIG.TRACKER_URL : '';
  const GA_ID       = (typeof CONFIG !== 'undefined' && CONFIG.GA_ID)       ? CONFIG.GA_ID       : '';
  const BATCH_INTERVAL_MS = 5000;
  const MAX_QUEUE = 20;
  const GEO_TIMEOUT_MS = 1200;

  // ── 로컬 개발 환경 감지 ──────────────────────────────
  const IS_LOCAL = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '' ||
    location.protocol === 'file:'
  );

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
  let   enterTime = Date.now();

  // ── 세션 & 사용자 ID ────────────────────────────────────
  function getId(key, ttlMs) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null');
      if (stored && stored.exp > Date.now()) return { id: stored.id, isNew: false };
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const val = JSON.stringify({ id, exp: Date.now() + ttlMs });
      sessionStorage.setItem(key, val);
      if (key === 'bt_uid') localStorage.setItem(key, val);
      return { id, isNew: true };
    } catch (_) { return { id: 'anon', isNew: false }; }
  }
  const sessionInfo = getId('bt_sid', 30 * 60 * 1000);          // 30분 세션
  const userInfo    = getId('bt_uid', 365 * 24 * 60 * 60 * 1000); // 1년 유저
  const sessionId = sessionInfo.id;
  const userId    = userInfo.id;
  const isNewSession = sessionInfo.isNew;

  // ── 사이트 내 이동 경로 (이전 페이지) ───────────────────
  let prevPage = '';
  try { prevPage = sessionStorage.getItem('bt_last_page') || ''; } catch (_) {}

  // ── UTM 파라미터 ────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const utm = {
    source:   params.get('utm_source')   || '',
    medium:   params.get('utm_medium')   || '',
    campaign: params.get('utm_campaign') || '',
  };

  // ── 유입 경로(referrer) 분류 ─────────────────────────────
  function classifyReferrer() {
    const ref = document.referrer || '';
    let refSource = '';
    if (!ref) {
      return { ref_type: utm.medium === 'cpc' || params.get('gclid') ? 'ad' : 'direct', ref_source: utm.source || '' };
    }
    let host = '';
    try { host = new URL(ref).hostname.replace('www.', ''); } catch (_) { host = ''; }
    refSource = host;

    if (host && host === location.hostname) return { ref_type: 'internal', ref_source: host };
    if (utm.medium === 'cpc' || utm.medium === 'ad' || params.get('gclid')) return { ref_type: 'ad', ref_source: utm.source || host };

    const searchEngines = ['google.', 'naver.', 'daum.', 'bing.', 'yahoo.'];
    if (searchEngines.some(function (s) { return host.indexOf(s) !== -1; })) {
      return { ref_type: 'search', ref_source: host };
    }
    const social = ['facebook.', 'instagram.', 'kakao', 'band.us', 'twitter.', 'x.com', 't.co', 'pinterest.'];
    if (social.some(function (s) { return host.indexOf(s) !== -1; })) {
      return { ref_type: 'social', ref_source: host };
    }
    return { ref_type: 'external', ref_source: host };
  }
  const refInfo = classifyReferrer();

  // ── 디바이스 / 브라우저 / OS ─────────────────────────────
  function getDevice() {
    const ua = navigator.userAgent;
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    if (/Mobi|Android/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  function getOS() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS X/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Other';
  }
  function getBrowser() {
    const ua = navigator.userAgent;
    // 순서 중요: 특이 브라우저 → 일반 브라우저 순으로 체크 (UA에 Chrome/Safari가 같이 섞여 나오는 경우가 많음)
    if (/NAVER\(inapp/i.test(ua) || /NAVER/i.test(ua)) return 'Naver App';
    if (/KAKAOTALK/i.test(ua)) return 'KakaoTalk App';
    if (/Whale/i.test(ua)) return 'Whale';
    if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
    if (/FxiOS/i.test(ua) || /Firefox/i.test(ua)) return 'Firefox';
    if (/CriOS/i.test(ua) || (/Chrome/i.test(ua) && !/Edg\//i.test(ua))) return 'Chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    return 'Other';
  }
  const deviceInfo = {
    device:  getDevice(),
    os:      getOS(),
    browser: getBrowser(),
    screen_width: window.screen.width,
    language: navigator.language || '',
  };

  // ── 접속 국가 ────────────────────────────────────────────
  // 1) 우선 타임존으로 즉시 추정 → 2) 무료 IP 위치 API로 비동기 보정 (세션당 1회, 실패해도 무시)
  const TZ_COUNTRY_HINTS = {
    'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Taipei': 'TW',
    'Asia/Hong_Kong': 'HK', 'Asia/Singapore': 'SG', 'America/New_York': 'US', 'America/Los_Angeles': 'US',
    'America/Chicago': 'US', 'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  };
  let country = '';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    country = TZ_COUNTRY_HINTS[tz] || '';
  } catch (_) {}

  let geoPromise = null;
  function resolveCountry() {
    if (geoPromise) return geoPromise;
    try {
      const cached = sessionStorage.getItem('bt_country');
      if (cached) { country = cached; geoPromise = Promise.resolve(cached); return geoPromise; }
    } catch (_) {}

    if (IS_LOCAL) { geoPromise = Promise.resolve(country); return geoPromise; }

    geoPromise = fetch('https://ipwho.is/?fields=success,country_code', { mode: 'cors' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.success && j.country_code) {
          country = j.country_code;
          try { sessionStorage.setItem('bt_country', country); } catch (_) {}
        }
        return country;
      })
      .catch(function () { return country; });
    return geoPromise;
  }

  // ── 전송 큐 (배치) ──────────────────────────────────────
  let queue = [];

  function enqueue(item) {
    queue.push(item);
    if (queue.length >= MAX_QUEUE) flush();
  }

  function flush() {
    if (queue.length === 0) return;
    const batch = queue.splice(0);

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

    // ⚠ POST는 사용하지 않습니다 (Apps Script의 302 리다이렉트가 body를 날려버림).
    // GET 쿼리 파라미터로 전송하면 리다이렉트에도 메서드/데이터가 유지되어 안전합니다.
    const sep = TRACKER_URL.indexOf('?') === -1 ? '?' : '&';
    batch.forEach(function (item) {
      try {
        const url = TRACKER_URL + sep + 'd=' + encodeURIComponent(JSON.stringify(item));
        fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(function () {});
      } catch (_) {}
    });
  }

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
      ref_type:   refInfo.ref_type,
      ref_source: refInfo.ref_source,
      utm_source:   utm.source,
      utm_medium:   utm.medium,
      utm_campaign: utm.campaign,
      country: country,
    }, deviceInfo);
  }

  function gTag(name, p) {
    if (typeof gtag === 'function') gtag('event', name, p || {});
  }

  // ── 페이지뷰 전송 (실제 로드 & SPA 가상 콘텐츠뷰 공용) ───
  let currentContentId = '';
  let currentContentTitle = '';
  let pageExitSent = false;
  let firstContentCall = true;
  const initialContentId = params.get('id') || '';

  function sendPageview(contentId, contentTitle) {
    pageExitSent = false;
    enterTime = Date.now();
    scrollMilestones.clear();
    currentContentId = contentId || '';
    currentContentTitle = contentTitle || '';

    const payload = Object.assign(base('pageview'), {
      content_id: currentContentId,
      content_title: currentContentTitle,
      prev_page: prevPage,
      is_new_session: isNewSession,
    });

    function send() {
      payload.country = country;
      enqueue(payload);
    }

    // 국가 정보가 아직 없으면 짧게 기다렸다가(최대 GEO_TIMEOUT_MS) 전송 — 그래도 없으면 그냥 전송
    Promise.race([
      resolveCountry(),
      new Promise(function (res) { setTimeout(res, GEO_TIMEOUT_MS); }),
    ]).then(send);

    try { sessionStorage.setItem('bt_last_page', pagePath + (currentContentId ? ('?id=' + currentContentId) : '')); } catch (_) {}
    prevPage = pagePath;

    gTag('page_view_custom', { page_name: pageName, content_title: currentContentTitle || undefined, referrer: document.referrer || 'direct' });
  }

  // ── 체류시간 / 이탈 전송 ─────────────────────────────────
  let navigatingInternally = false;
  function sendPageExit() {
    if (pageExitSent) return;
    const sec = Math.round((Date.now() - enterTime) / 1000);
    if (sec < 1) return;
    pageExitSent = true;
    const maxScroll = Math.max.apply(null, [...scrollMilestones, 0]);
    enqueue(Object.assign(base('page_exit'), {
      content_id: currentContentId,
      seconds: sec,
      max_scroll: maxScroll,
      exit_type: navigatingInternally ? 'internal_nav' : 'exit',
    }));
    flush(); // 이탈 전 즉시 전송
  }

  // ══════════════════════════════════════════════════════
  // 공개 API — SPA 상세보기(게시글/액티비티)에서 호출
  // ══════════════════════════════════════════════════════
  window.BTAnalytics = {
    // contentType: 'tip' | 'activity' 등, id/title은 게시글·액티비티 식별자
    trackContentView: function (contentType, id, title) {
      const idStr = String(id || '');
      if (firstContentCall) {
        firstContentCall = false;
        // 최초 로드 시 URL의 ?id= 값은 이미 자동 pageview로 전송됐으므로 중복 전송 방지
        if (idStr === initialContentId) {
          if (title) currentContentTitle = title;
          return;
        }
      }
      sendPageExit();               // 이전 화면(리스트 or 다른 글) 체류시간 마감
      navigatingInternally = false; // 새 가상 페이지 진입이므로 리셋
      sendPageview(idStr, title || '');
    },
    trackEvent: function (name, eventParams) {
      enqueue(Object.assign(base('event', name), { params: eventParams || {} }));
      gTag(name, Object.assign({ page_name: pageName }, eventParams || {}));
    },
  };

  // ══════════════════════════════════════════════════════
  // 이벤트 수집
  // ══════════════════════════════════════════════════════

  window.addEventListener('DOMContentLoaded', function () {

    // ① 페이지뷰 (URL에 ?id=가 있으면 최초 진입부터 콘텐츠뷰로 기록)
    sendPageview(initialContentId, document.title || '');

    // ② 광고 슬롯 노출 + 클릭
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
    document.addEventListener('click', function (e) {
      const adEl = e.target.closest('.ad-slot');
      if (!adEl) return;
      const slot = adEl.dataset.adSlot || 'unknown';
      enqueue(Object.assign(base('event', 'ad_click'), { params: { ad_slot: slot } }));
      gTag('ad_click', { page_name: pageName, ad_slot: slot });
    }, { passive: true });

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

  // ⑤ 버튼/카드 클릭
  window.addEventListener('click', function (e) {
    const calcBtn = e.target.closest('.calc-btn');
    if (calcBtn) {
      const txt = calcBtn.textContent.trim().slice(0, 50);
      enqueue(Object.assign(base('event', 'tool_calculate'), { params: { button_text: txt } }));
      gTag('tool_calculate', { page_name: pageName, button_text: txt });
    }
    const pillBtn = e.target.closest('.pill-btn');
    if (pillBtn) {
      const val = pillBtn.textContent.trim().slice(0, 30);
      enqueue(Object.assign(base('event', 'tool_filter'), { params: { filter_value: val } }));
    }
    const card = e.target.closest('.tool-card,.tip-card,.play-card');
    if (card) {
      const nameEl = card.querySelector('.tc-name,.tip-title,.play-name');
      const name   = nameEl ? nameEl.textContent.trim() : 'unknown';
      enqueue(Object.assign(base('event', 'card_click'), { params: { card_name: name } }));
      gTag('card_click', { page_name: pageName, card_name: name });
    }
    const heartBtn = e.target.closest('.heart-btn');
    if (heartBtn) {
      enqueue(Object.assign(base('event', 'wishlist_toggle'), { params: { liked: heartBtn.classList.contains('liked') } }));
    }
  }, { passive: true });

  // ⑥ 내부/외부 링크 구분 (capture 단계 — 이동 직전에 먼저 감지)
  window.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    const isInternal = !href.startsWith('http') || href.includes(location.hostname);
    if (isInternal) {
      navigatingInternally = true;
      return;
    }
    // 외부 링크(어필리에이트 포함)
    let domain = '';
    try { domain = new URL(href).hostname.replace('www.',''); } catch(_) {}
    const isAffiliate = (href.includes('coupang') || href.includes('coupa.ng')) ? 'yes' : 'no';
    navigatingInternally = false;
    enqueue(Object.assign(base('event', 'outbound_click'), {
      params: { link_url: href.slice(0,200), link_domain: domain, is_affiliate: isAffiliate },
    }));
    gTag('outbound_click', { page_name: pageName, link_domain: domain, is_affiliate: isAffiliate });
  }, true); // capture: 실제 페이지 이동보다 먼저 실행되도록

  // ⑦ 체류 시간 / 이탈
  window.addEventListener('beforeunload', sendPageExit);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendPageExit();
  });
  window.addEventListener('pagehide', sendPageExit);

  // 브라우저 뒤로가기(popstate)로 상세→목록 돌아갈 때도 체류시간 마감
  window.addEventListener('popstate', function () {
    sendPageExit();
    navigatingInternally = false;
  });

  // ⑧ JS 에러
  window.addEventListener('error', function (e) {
    enqueue(Object.assign(base('event', 'js_error'), {
      params: { message: (e.message||'').slice(0,100), source: (e.filename||'').split('/').pop() },
    }));
    gTag('js_error', { page_name: pageName, message: (e.message||'').slice(0,100) });
  });

})();
