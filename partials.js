/* =====================================================================
   partials.js — 사이트 공통 컴포넌트 단일 소스 (Single Source of Truth)
   =====================================================================
   이 파일 하나만 수정하면 다음이 전 페이지(22개 HTML)에 한 번에 반영됩니다.

     · 상단 내비게이션 (로고 · 메뉴 · 도구 모음 메가메뉴)
     · 모바일 슬라이드 메뉴
     · 검색 오버레이
     · 하단 탭바 (홈 / 놀이 / 꿀팁 / 내 아이)
     · 푸터 (사이트용 / 도구페이지용 2종)
     · 홈 화면 카테고리 칩 스크롤
     · 홈 화면 18종 도구 전체 그리드 (+ 인피드 광고 위치)

   ── 사용법 ──────────────────────────────────────────────────────────
   각 HTML의 <head>에 (nav.js보다 먼저) 아래를 추가하고,
     <script src="partials.js" defer></script>

   <body> 안에는 아래 자리표시자(placeholder)만 남겨두면 됩니다.

     <div id="siteHeader"></div>                       → nav+모바일메뉴+검색오버레이
     <div id="siteFooter" data-footer="tool"></div>     → 도구 페이지용 짧은 푸터
     <div id="siteFooter" data-footer="site"           → 사이트 공통 푸터
          data-home-label="홈으로"></div>                (data-home-label 없으면 홈 링크 생략 = index.html용)
     <div class="cat-chip-scroll" id="catChipsRoot"></div>   → 홈 카테고리 칩 (index.html)
     <div class="cat-section" id="toolHub"></div>            → 홈 18종 도구 전체 그리드 (index.html)

   하단 탭바는 별도 placeholder 없이 partials.js가 </body> 직전에 자동 삽입합니다.

   ── 도구를 추가/수정/삭제하려면 ────────────────────────────────────
   아래 TOOL_CATEGORIES 배열의 해당 항목만 고치면 메가메뉴·모바일메뉴·
   홈 카테고리 칩·홈 전체 그리드·검색(data-name)까지 자동으로 동기화됩니다.
   ===================================================================== */
(function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────
  // 18종 도구 마스터 데이터 (여기만 고치면 전체 페이지에 반영됩니다)
  // ───────────────────────────────────────────────────────────────
  var TOOL_CATEGORIES = [
    {
      id: '수면수유', icon: '🌙', title: '수유 · 수면', iconBg: 'var(--primary-light)',
      desc: '하루 몇 번 먹고, 몇 시간 자야 할까',
      tools: [
        { href: 'tools/sleep-calculator.html', emoji: '😴', name: '아기 수면 사이클 계산기', desc: '취침 시간 → 최적 기상 시간과 낮잠 스케줄 계산', badge: 'hot', keywords: '아기 수면 사이클 계산기 취침 기상 낮잠' },
        { href: 'tools/feeding-tracker.html', emoji: '🍼', name: '수유 간격 타이머 & 일지', desc: '수유 시간 기록·평균 간격 계산, CSV 내보내기', badge: 'hot', keywords: '수유 간격 타이머 모유 분유 기록' },
        { href: 'tools/colic-checker.html', emoji: '😭', name: '영아산통 체크 & 달래기 가이드', desc: '산통 여부 체크 + 5S 달래기 방법 안내', badge: 'new', keywords: '영아산통 체크 달래기 이유없이 울어요 보챔' }
      ]
    },
    {
      id: '이유식영양', icon: '🥣', title: '이유식 · 영양', iconBg: 'var(--amber-light)',
      desc: '월령에 맞는 재료와 영양 가이드',
      tools: [
        { href: 'tools/weaning-checker.html', emoji: '🥦', name: '이유식 재료 월령 체커', desc: '월령별 먹을 수 있는 재료 / 알레르기 주의 재료 분류', badge: 'popular', keywords: '이유식 재료 월령 체커 알레르기 초기 중기 후기' },
        { href: 'tools/milk-calculator.html', emoji: '🥛', name: '분유 · 수유량 계산기', desc: '월령·체중 기반 하루 권장 수유량 자동 계산', badge: 'new', keywords: '분유 모유 수유량 계산기 하루 권장량' },
        { href: 'tools/weaning-planner.html', emoji: '📅', name: '이유식 스케줄 플래너', desc: '월령별 주간 이유식 시간표 자동 생성 · 인쇄 가능', badge: 'new', keywords: '이유식 스케줄 플래너 주간 계획표 식단' }
      ],
      adSlotAfter: 'INFEED_1'
    },
    {
      id: '성장발달', icon: '📏', title: '성장 · 발달', iconBg: 'var(--blue-light)',
      desc: '키, 몸무게, 발달 마일스톤 확인',
      tools: [
        { href: 'tools/growth-percentile.html', emoji: '📊', name: '아이 성장 백분위수 계산기', desc: '키·몸무게 입력 → WHO 기준 백분위 그래프 시각화', badge: 'hot', keywords: '성장 백분위수 키 몸무게 머리둘레 WHO' },
        { href: 'tools/milestone-checker.html', emoji: '✅', name: '발달 마일스톤 체크리스트', desc: '월령별 운동·언어·사회성 발달 항목 체크', badge: 'popular', keywords: '발달 마일스톤 체크리스트 월령 언어 운동' },
        { href: 'tools/tooth-checker.html', emoji: '🦷', name: '유치 발육 시기 체커', desc: '월령별 이가 나는 시기 + 이앓이 증상·대처법', badge: 'new', keywords: '유치 발육 이앓이 시기 체커 이가 나요' }
      ]
    },
    {
      id: '건강응급', icon: '💊', title: '건강 · 응급', iconBg: 'var(--red-light)',
      desc: '새벽에 열날 때 바로 쓰는 도구',
      tools: [
        { href: 'tools/fever-medicine.html', emoji: '🌡️', name: '소아 해열제 용량 계산기', desc: '체중 입력 → 타이레놀·부루펜 정확한 ml 용량 즉시 계산', badge: 'hot', keywords: '소아 해열제 용량 계산기 타이레놀 부루펜 체중' },
        { href: 'tools/fever-tracker.html', emoji: '📋', name: '체온 기록 & 해열제 교차 타이머', desc: '체온 변화 기록, 타이레놀↔부루펜 교차 복용 타이머', badge: 'new', keywords: '체온 기록 열 추이 그래프 해열제 교차' },
        { href: 'tools/medicine-guide.html', emoji: '💉', name: '소아 약 종류별 복용 가이드', desc: '항생제·소화제·스테로이드 등 올바른 복용법 안내', badge: 'new', keywords: '소아 약 종류 복용 가이드 항생제 소화제 흡입' }
      ],
      adSlotAfter: 'INFEED_2'
    },
    {
      id: '입학지원금', icon: '🏫', title: '입학 · 지원금', iconBg: 'var(--purple-light)',
      desc: '어린이집·유치원 입소와 정부 혜택',
      tools: [
        { href: 'tools/school-date.html', emoji: '🎒', name: '입소·입학 날짜 계산기', desc: '생년월일 → 어린이집·유치원·초등학교 입학 연도 자동 계산', badge: 'popular', keywords: '어린이집 유치원 입소 날짜 초등학교 입학 연도' },
        { href: 'tools/subsidy-calculator.html', emoji: '💰', name: '육아 지원금 총정리 계산기', desc: '부모급여·아동수당·첫만남이용권 등 받을 수 있는 금액 합산', badge: 'hot', keywords: '아동수당 부모급여 육아지원금 계산기 첫만남이용권' },
        { href: 'tools/parental-leave.html', emoji: '📝', name: '육아휴직 급여 계산기', desc: '통상임금 입력 → 월별 육아휴직 급여 · 6+6 특례 계산', badge: 'new', keywords: '육아휴직 급여 계산기 통상임금 6+6' }
      ]
    },
    {
      id: '임신준비', icon: '🤰', title: '임신 · 준비', iconBg: '#FDEFF3',
      desc: '출산 준비와 이름 짓기',
      tools: [
        { href: 'tools/pregnancy-week.html', emoji: '🤰', name: '임신 주수 & 출산 예정일 계산기', desc: '생리일·초음파 날짜 → 현재 주수, 예정일, 주차별 발달', badge: 'hot', keywords: '임신 주수 계산기 출산 예정일 태아 크기' },
        { href: 'tools/baby-name.html', emoji: '✨', name: '아기 이름 짓기 도우미', desc: '성씨 + 원하는 느낌 선택 → 획수별 이름 후보 추천', badge: 'popular', keywords: '아기 이름 짓기 한자 획수 뜻 태명' },
        { href: 'tools/birth-checklist.html', emoji: '🎒', name: '출산 준비물 체크리스트', desc: '입원 가방부터 신생아 용품까지 · 진행률 자동 표시', badge: 'new', keywords: '출산 준비물 체크리스트 입원 가방 신생아 용품' }
      ]
    }
  ];

  var BADGE_LABEL = { hot: '인기', new: 'NEW', popular: '추천' };

  function withPrefix(prefix, href) { return prefix + href; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ── 상단 메가메뉴 ──
  function buildMegaMenu(prefix) {
    return TOOL_CATEGORIES.map(function (cat) {
      var links = cat.tools.map(function (t) {
        return '<a href="' + withPrefix(prefix, t.href) + '">' + esc(t.name) + '</a>';
      }).join('');
      return '<div class="mega-cat">' +
        '<a href="' + withPrefix(prefix, 'index.html#cat-' + cat.id) + '" class="mega-cat-title" style="text-decoration:none;">' +
        '<span class="mc-icon">' + cat.icon + '</span>' + esc(cat.title) + '</a>' + links + '</div>';
    }).join('');
  }

  // ── 모바일 메뉴 카테고리 아코디언 ──
  function buildMobileCats(prefix) {
    return TOOL_CATEGORIES.map(function (cat, i) {
      var links = cat.tools.map(function (t) {
        return '<a href="' + withPrefix(prefix, t.href) + '">' + esc(t.name) + '</a>';
      }).join('');
      return '<div class="mn-cat' + (i === 0 ? ' open' : '') + '">' +
        '<div class="mn-cat-head">' + cat.icon + ' ' + esc(cat.title) + ' <span class="mn-caret">▾</span></div>' +
        links + '</div>';
    }).join('');
  }

  // ── 홈 화면 카테고리 칩 스크롤 ──
  function buildCatChips() {
    return TOOL_CATEGORIES.map(function (cat) {
      return '<a href="#cat-' + cat.id + '" class="cat-chip">' + cat.icon + ' ' + esc(cat.title) + '</a>';
    }).join('');
  }

  // ── 인피드 광고 슬롯 (홈 도구 그리드 사이) ──
  function buildInfeedAd(slotKey) {
    return '' +
      '<div class="ad-slot ad-infeed">' +
      '  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX" data-ad-slot="0000000000" data-ad-format="fluid" data-ad-layout="in-article"></ins>' +
      '  <script>if(typeof CONFIG!=="undefined"){var _ins=document.currentScript.previousElementSibling;_ins.setAttribute("data-ad-client",CONFIG.ADSENSE_CLIENT);_ins.setAttribute("data-ad-slot",CONFIG.AD_SLOTS.' + slotKey + ');}</' + 'script>' +
      '  <script>(adsbygoogle=window.adsbygoogle||[]).push({});</' + 'script>' +
      '</div>';
  }

  // ── 홈 화면 18종 도구 전체 그리드 ──
  function buildToolHub(prefix) {
    return TOOL_CATEGORIES.map(function (cat) {
      var cards = cat.tools.map(function (t) {
        var badgeCls = t.badge ? 'badge-' + t.badge : '';
        var badgeTxt = t.badge ? (BADGE_LABEL[t.badge] || '') : '';
        return '<a href="' + withPrefix(prefix, t.href) + '" class="tool-card" data-name="' + esc(t.keywords || t.name) + '">' +
          '<span class="tc-emoji">' + t.emoji + '</span>' +
          '<span class="tc-name">' + esc(t.name) + '</span>' +
          '<span class="tc-desc">' + esc(t.desc) + '</span>' +
          (t.badge ? '<span class="tc-badge ' + badgeCls + '">' + badgeTxt + '</span>' : '') +
          '</a>';
      }).join('');
      var block = '' +
        '<div class="cat-block" data-cat="' + cat.id + '" id="cat-' + cat.id + '">' +
        '  <div class="cat-header">' +
        '    <div class="cat-icon" style="background:' + cat.iconBg + ';">' + cat.icon + '</div>' +
        '    <div><h2>' + esc(cat.title) + '</h2><div class="cat-desc">' + esc(cat.desc) + '</div></div>' +
        '  </div>' +
        '  <div class="tool-grid">' + cards + '</div>' +
        '</div>';
      return block + (cat.adSlotAfter ? buildInfeedAd(cat.adSlotAfter) : '');
    }).join('');
  }

  // ── 상단 내비게이션 (로고 + 메뉴 + 아이 배지 + 검색/햄버거 버튼) ──
  function buildSiteNav(prefix) {
    return '' +
      '<nav class="site-nav">' +
      '  <div class="nav-inner">' +
      '    <a href="' + withPrefix(prefix, 'index.html') + '" class="logo"><span class="logo-mark">🍼</span>아기도구함</a>' +
      '    <div class="nav-links">' +
      '      <a href="' + withPrefix(prefix, 'index.html') + '" class="nav-link">홈</a>' +
      '      <a href="' + withPrefix(prefix, 'growth.html') + '" class="nav-link">성장기록</a>' +
      '      <div class="nav-item">' +
      '        <button class="nav-link" id="toolsMenuBtn" type="button" aria-expanded="false" aria-haspopup="true">도구 모음 <span class="caret">▾</span></button>' +
      '        <div class="mega-menu" id="toolsMegaMenu" role="menu">' +
      '          <div class="mega-grid">' + buildMegaMenu(prefix) + '</div>' +
      '          <div class="mega-menu-footer"><a href="' + withPrefix(prefix, 'index.html#toolHub') + '">전체 도구 18개 한눈에 보기 →</a></div>' +
      '        </div>' +
      '      </div>' +
      // '      <a href="' + withPrefix(prefix, 'play.html') + '" class="nav-link">놀이 추천</a>' +
      '      <a href="' + withPrefix(prefix, 'tips.html') + '" class="nav-link">육아 꿀팁</a>' +
      '    </div>' +
      '    <div class="nav-spacer"></div>' +
      '    <span class="nav-baby-badge" data-baby-badge></span>' +
      '    <button class="nav-search-btn" id="navSearchBtn" type="button" aria-label="도구 검색">🔍</button>' +
      '    <button class="nav-toggle" id="navToggleBtn" type="button" aria-label="메뉴 열기">☰</button>' +
      '  </div>' +
      '</nav>';
  }

  // ── 모바일 슬라이드 메뉴 ──
  function buildMobileNav(prefix) {
    return '' +
      '<div class="mobile-nav" id="mobileNav">' +
      '  <div class="nav-baby-badge" data-baby-badge></div>' +
      '  <a href="' + withPrefix(prefix, 'index.html') + '" class="mn-link">🏠 홈</a>' +
      '  <a href="' + withPrefix(prefix, 'growth.html') + '" class="mn-link">📈 성장기록</a>' +
      // '  <a href="' + withPrefix(prefix, 'play.html') + '" class="mn-link">🎪 놀이 추천</a>' +
      '  <a href="' + withPrefix(prefix, 'tips.html') + '" class="mn-link">🍯 육아 꿀팁</a>' +
      '  <div class="mn-group-title">도구 모음 (18개)</div>' +
      buildMobileCats(prefix) +
      '</div>';
  }

  // ── 검색 오버레이 ──
  function buildSearchOverlay(prefix) {
    return '' +
      '<div class="nav-search-overlay" id="navSearchOverlay">' +
      '  <div class="nav-search-box">' +
      '    <form id="navSearchForm" action="' + withPrefix(prefix, 'index.html') + '" method="get">' +
      '      <input type="text" name="q" id="navSearchInput" placeholder="도구 검색 (예: 수면, 해열제, 이유식)" autocomplete="off">' +
      '      <button type="submit">검색</button>' +
      '    </form>' +
      '    <div class="nav-search-hint">Esc 키를 눌러 닫기 · 홈 화면 검색창과 연동돼요</div>' +
      '  </div>' +
      '</div>';
  }

  // ── 하단 탭바 (모바일 4탭) ──
  function buildBottomNav(prefix) {
    return '' +
      '<nav class="bottom-nav" aria-label="주요 메뉴">' +
      '  <a href="' + withPrefix(prefix, 'index.html') + '" class="bn-item"><span class="bn-icon">🏠</span>홈</a>' +
      '  <a href="' + withPrefix(prefix, 'play.html') + '" class="bn-item"><span class="bn-icon">🧸</span>놀이</a>' +
      '  <a href="' + withPrefix(prefix, 'tips.html') + '" class="bn-item"><span class="bn-icon">💡</span>꿀팁</a>' +
      '  <a href="' + withPrefix(prefix, 'growth.html') + '" class="bn-item"><span class="bn-icon">👶</span>내 아이</a>' +
      '</nav>';
  }

  // ── 푸터: 도구 페이지용(짧은 버전) ──
  function buildToolFooter(prefix) {
    return '<footer>© 2026 아기도구함 · <a href="' + withPrefix(prefix, 'index.html') + '">전체 도구 보기</a></footer>';
  }

  // ── 푸터: 사이트 공통(안내문 + 정책 링크) ──
  function buildSiteFooter(prefix, homeLabel) {
    var homeLink = homeLabel ? '<a href="' + withPrefix(prefix, 'index.html') + '">' + esc(homeLabel) + '</a> &nbsp;·&nbsp; ' : '';
    return '' +
      '<footer>' +
      '  <p>© 2026 아기도구함 &nbsp;·&nbsp; 모든 정보는 참고용이며 의료적 조언을 대체하지 않습니다.</p>' +
      '  <p style="margin-top:4px;">' + homeLink + '<a href="#">개인정보처리방침</a> &nbsp;·&nbsp; <a href="#">문의하기</a></p>' +
      '</footer>';
  }

  // ───────────────────────────────────────────────────────────────
  // 마운트: data-root-prefix 를 읽어 상대경로를 자동 계산하고,
  // 페이지에 남겨둔 자리표시자를 실제 마크업으로 교체합니다.
  // ───────────────────────────────────────────────────────────────
  function mount() {
    var body = document.body;
    var prefix = (body && body.getAttribute('data-root-prefix')) || '';

    var headerRoot = document.getElementById('siteHeader');
    if (headerRoot) {
      headerRoot.outerHTML = buildSiteNav(prefix) + buildMobileNav(prefix) + buildSearchOverlay(prefix);
    }

    var footerRoot = document.getElementById('siteFooter');
    if (footerRoot) {
      var kind = footerRoot.getAttribute('data-footer') || 'tool';
      footerRoot.outerHTML = (kind === 'tool')
        ? buildToolFooter(prefix)
        : buildSiteFooter(prefix, footerRoot.getAttribute('data-home-label'));
    }

    var chipsRoot = document.getElementById('catChipsRoot');
    if (chipsRoot) chipsRoot.innerHTML = buildCatChips();

    var hubRoot = document.getElementById('toolHub');
    if (hubRoot && hubRoot.getAttribute('data-generated') !== 'false' && !hubRoot.hasChildNodes()) {
      hubRoot.innerHTML = buildToolHub(prefix);
    }

    // 하단 탭바는 별도 자리표시자 없이 항상 자동으로 붙입니다.
    if (!document.querySelector('.bottom-nav') && body) {
      body.insertAdjacentHTML('beforeend', buildBottomNav(prefix));
    }
  }

  mount();

  // 다른 스크립트에서도 동일한 카테고리/도구 데이터를 재사용할 수 있도록 노출
  window.NORIYA_TOOL_CATEGORIES = TOOL_CATEGORIES;
})();
