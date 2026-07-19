/**
 * nav.js — 전역 상단 메뉴바 동작
 * 메가 메뉴(도구 모음 드롭다운), 모바일 햄버거 메뉴, 검색 오버레이를 제어합니다.
 * 모든 페이지(index/play/tips/tools/*)에서 공통으로 사용합니다.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var toolsBtn = document.getElementById('toolsMenuBtn');
    var megaMenu = document.getElementById('toolsMegaMenu');
    var navToggle = document.getElementById('navToggleBtn');
    var mobileNav = document.getElementById('mobileNav');
    var searchBtn = document.getElementById('navSearchBtn');
    var searchOverlay = document.getElementById('navSearchOverlay');
    var searchInput = document.getElementById('navSearchInput');

    // ── 메가 메뉴 (도구 모음) ──
    if (toolsBtn && megaMenu) {
      toolsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = megaMenu.classList.toggle('open');
        toolsBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (!megaMenu.contains(e.target) && e.target !== toolsBtn) {
          megaMenu.classList.remove('open');
          toolsBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // ── 모바일 메뉴 ──
    if (navToggle && mobileNav) {
      navToggle.addEventListener('click', function () {
        var isOpen = mobileNav.classList.toggle('open');
        navToggle.textContent = isOpen ? '✕' : '☰';
        navToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
      mobileNav.querySelectorAll('.mn-cat-head').forEach(function (head) {
        head.addEventListener('click', function () {
          head.parentElement.classList.toggle('open');
        });
      });
    }

    // ── 검색 오버레이 ──
    if (searchBtn && searchOverlay) {
      function openSearch() {
        searchOverlay.classList.add('open');
        if (searchInput) setTimeout(function () { searchInput.focus(); }, 50);
      }
      function closeSearch() {
        searchOverlay.classList.remove('open');
      }
      searchBtn.addEventListener('click', openSearch);
      searchOverlay.addEventListener('click', function (e) {
        if (e.target === searchOverlay) closeSearch();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSearch();
      });
    }

    // ── 현재 페이지 강조 ──
    var path = location.pathname.replace(/\/+$/, '');
    document.querySelectorAll('.nav-link[href], .mn-link[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var resolved = new URL(href, location.href).pathname.replace(/\/+$/, '');
      if (resolved === path || (resolved.endsWith('/index.html') === false && resolved === path)) {
        a.classList.add('is-active');
      }
    });
  });
})();
