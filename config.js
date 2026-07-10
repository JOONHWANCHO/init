/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║              아기도구함 — 사이트 설정 파일               ║
 * ║                      config.js                          ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  배포 전 이 파일의 값들을 실제 값으로 교체하세요.         ║
 * ║  이 파일은 .gitignore 에 추가해서 GitHub에              ║
 * ║  올라가지 않도록 관리하는 것을 권장합니다.               ║
 * ║                                                          ║
 * ║  .gitignore 에 추가: config.js                          ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const CONFIG = {

  // ──────────────────────────────────────
  // Google AdSense
  // https://www.google.com/adsense 에서 발급
  // ──────────────────────────────────────
  ADSENSE_CLIENT: 'ca-pub-6517109263592669',  // ← Publisher ID 로 교체

  // 광고 슬롯 ID (AdSense 콘솔 → 광고 → 광고 단위에서 확인)
  AD_SLOTS: {
    TOP_BANNER:   '8422973979',   // 상단 반응형 배너
    INFEED_1:     '2979075601',   // 카테고리 사이 인피드 #1
    INFEED_2:     '2979075601',   // 카테고리 사이 인피드 #2
    IN_RESULT:    '2979075601',   // 툴 결과 내 광고
    FOOTER:       '8422973979',   // 푸터 위 배너
  },

  // ──────────────────────────────────────
  // Google 꿀팁 시트 연동 (Apps Script 웹앱 URL)
  // 설정 방법: tips.html 파일 상단 주석 참고
  // ──────────────────────────────────────
  SHEET_JSON_URL: 'https://script.google.com/macros/s/AKfycbwai6Mu34-MLfOOKkEsBcR_xIJLpyzHhzYAZVeznkCPr41XofQxeUICiTYZxjmm35_j/exec',  // ← 꿀팁 시트 (Sheet1) Apps Script URL
                       // 예: 'https://script.google.com/macros/s/AKfy.../exec'

  // ──────────────────────────────────────
  // 아이 액티비티 시트 연동 (Sheet2, Apps Script 웹앱 URL)
  // Apps Script 코드에서 getActiveSheet() 대신
  // SpreadsheetApp.getActiveSpreadsheet().getSheets()[1] 로 변경하세요.
  // ──────────────────────────────────────
  PLAY_SHEET_URL: 'https://script.google.com/macros/s/AKfycbyfOTb5N-KzVWin-eetANZGPW9fLg0PbzPuYvGjQegcvkJzsml_dHFvtR3sFTTxrJ9e/exec',  // ← Sheet2 Apps Script 배포 URL 로 교체

  // ──────────────────────────────────────
  // Google Analytics 4 (선택)
  // https://analytics.google.com 에서 발급
  // ──────────────────────────────────────
  GA_ID: '',           // ← GA4 측정 ID 로 교체 (예: 'G-XXXXXXXXXX')

  // ──────────────────────────────────────
  // Admin 대시보드 설정
  // ──────────────────────────────────────
  ADMIN_PASSWORD: 'babytools2024!',  // ← 반드시 변경하세요
  GA_PROPERTY_ID: '',  // ← GA4 Property ID (예: '123456789') — GA 관리 → 속성 설정에서 확인
  GA_PRIVATE_KEY: '',  // ← 서비스 계정 비공개 키 (admin/GA_SETUP.md 참고)

  // ──────────────────────────────────────
  // 구글 시트 직접 수집 (tracker.gs 배포 후 입력)
  // admin/tracker.gs 를 Apps Script에 배포하고 URL을 입력하세요
  // ──────────────────────────────────────
  TRACKER_URL: 'https://script.google.com/macros/s/AKfycbyws9Zja4H5TQYs_Lt-qPHXIQiDY9RHT0HjVXcBWj2Bwb_dpqIbQlMpDcoNAaKZ-9uj/exec',     // ← tracker.gs 배포 URL (예: 'https://script.google.com/macros/s/XXXX/exec')

  // ──────────────────────────────────────
  // 사이트 기본 정보
  // ──────────────────────────────────────
  SITE_NAME:    '아기도구함',
  SITE_URL:     'https://noriya.kr',  // ← 실제 도메인으로 교체
  CONTACT_EMAIL: '',   // ← 문의 이메일 (선택)

  KAKAO_MAP_KEY: 'b78a133ce4df6122259f06ec1c31f389',

};

// ──────────────────────────────────────────────────────────
// AdSense 스크립트 동적 주입
// (config.js 로드 후 자동으로 head에 삽입)
// ──────────────────────────────────────────────────────────
(function injectAdSense() {
  if (!CONFIG.ADSENSE_CLIENT || CONFIG.ADSENSE_CLIENT === 'ca-pub-XXXXXXXXXXXXXXXXX') return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CONFIG.ADSENSE_CLIENT}`;
  document.head.appendChild(s);
})();

// ──────────────────────────────────────────────────────────
// Google Analytics 동적 주입 (GA_ID 설정 시에만)
// ──────────────────────────────────────────────────────────
(function injectGA() {
  if (!CONFIG.GA_ID) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', CONFIG.GA_ID);
})();
