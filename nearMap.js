// ══════════════════════════════════════════
// 내 주변 추천 (카카오맵) — 사용자 현재 위치에서 가장 가까운 5개 액티비티.
//
// 필요 설정: assets/js/config.js 의 CONFIG.KAKAO_MAP_KEY
// (카카오 개발자센터 → 내 애플리케이션 → JavaScript 키, 플랫폼에 사이트 도메인 등록 필요)
//
// 데이터 요구사항: 각 아이템에 도로명 주소 문자열이 담긴 필드(address 권장)가 있어야
// 거리 계산이 가능해요. 없는 아이템은 자동으로 목록에서 제외됩니다.
// ══════════════════════════════════════════
import { state } from '../core/state.js';
import { CAT_COLORS, CAT_EMOJI } from '../data/constants.js';
import { fmtDistance, haversineDistanceKm } from '../core/format.js';
import { goToDetail } from './detailView.js';

const DEFAULT_USER_LOCATION = { lat: 37.5665, lng: 126.9780 }; // 위치 권한이 없을 때 서울시청 기준

// 분석 로그 훅이 따로 없다면 조용히 무시 (다른 팀의 트래킹 스크립트가 나중에 정의해도 됨)
if (typeof window.sendUserActionLog !== 'function') {
  window.sendUserActionLog = function () {};
}

export function initNearMap() {
  if (state.nearMapInitialized) return; // 지도는 한 번만 생성 (목록↔상세 이동 시 중복 생성 방지)
  if (!state.allItems.length) return;
  state.nearMapInitialized = true;
  ensureKakaoSDK(() => renderNearLocationMap(state.allItems));
}

function ensureKakaoSDK(callback) {
  if (typeof kakao !== 'undefined' && kakao.maps) { callback(); return; }
  if (typeof CONFIG === 'undefined' || !CONFIG.KAKAO_MAP_KEY) {
    const slider = document.getElementById('map-spots-slider');
    if (slider) slider.innerHTML = '<div class="map-loading-msg" style="color:red;">카카오맵 API 키가 설정되지 않았어요. config.js에 KAKAO_MAP_KEY를 추가해주세요.</div>';
    return;
  }
  if (state.kakaoSDKLoading) return;
  state.kakaoSDKLoading = true;
  const script = document.createElement('script');
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${CONFIG.KAKAO_MAP_KEY}&libraries=services&autoload=false`;
  script.onload = callback;
  script.onerror = () => {
    const slider = document.getElementById('map-spots-slider');
    if (slider) slider.innerHTML = '<div class="map-loading-msg" style="color:red;">카카오맵 스크립트 로드 실패</div>';
  };
  document.head.appendChild(script);
}

function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({ ...DEFAULT_USER_LOCATION, isDefault: true }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, isDefault: false }),
      () => resolve({ ...DEFAULT_USER_LOCATION, isDefault: true }),
      { timeout: 5000 }
    );
  });
}

function renderNearLocationMap(posts) {
  const mapContainer = document.getElementById('near-map');
  const slider = document.getElementById('map-spots-slider');
  if (!mapContainer || !slider) return;

  if (!posts || posts.length === 0) {
    slider.innerHTML = `<div class="map-loading-msg">액티비티 데이터가 없습니다.</div>`;
    return;
  }
  if (typeof kakao === 'undefined') {
    slider.innerHTML = `<div class="map-loading-msg" style="color:red;">카카오 스크립트 로드 실패</div>`;
    return;
  }

  kakao.maps.load(async function () {
    const userLoc = await getUserLocation();
    const geocoder = new kakao.maps.services.Geocoder();

    // 데이터 내 모든 액티비티의 주소를 위경도로 변환 (거리 계산을 위해 전체 대상)
    const convertedSpotsPromises = posts.map((spot) => {
      return new Promise((resolve) => {
        const keys = Object.keys(spot);
        const addressKey = keys.find(k => k.toLowerCase().includes('address') || k.includes('주소') || k.includes('위치'));
        const titleKey = keys.find(k => k.toLowerCase().includes('title') || k.includes('제목') || k.toLowerCase().includes('name'));

        if (!addressKey) { resolve(null); return; }
        const spotAddress = String(spot[addressKey]).trim();
        const spotTitle = titleKey ? spot[titleKey] : (spot.title || spot.name || '추천 장소');

        geocoder.addressSearch(spotAddress, function (result, status) {
          if (status === kakao.maps.services.Status.OK) {
            resolve({ ...spot, title: spotTitle, lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
          } else {
            resolve(null);
          }
        });
      });
    });

    const geocoded = (await Promise.all(convertedSpotsPromises)).filter(s => s !== null);
    if (geocoded.length === 0) {
      slider.innerHTML = `<div class="map-loading-msg">올바른 주소가 포함된 데이터가 없습니다.</div>`;
      return;
    }

    // 현재 위치 기준 거리 계산 후 가장 가까운 5개만 채택
    const withDistance = geocoded.map(spot => ({
      ...spot,
      distanceKm: haversineDistanceKm(userLoc.lat, userLoc.lng, spot.lat, spot.lng)
    }));
    const validSpots = withDistance.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);

    // 1. 초기 지도 생성 (사용자 위치 또는 첫 번째 장소 중심)
    const centerLoc = userLoc.isDefault ? validSpots[0] : userLoc;
    const map = new kakao.maps.Map(mapContainer, {
      center: new kakao.maps.LatLng(centerLoc.lat, centerLoc.lng),
      level: 6
    });

    // 사용자 위치 마커 (내 위치를 실제로 확인했을 때만 표시)
    if (!userLoc.isDefault) {
      new kakao.maps.Marker({
        position: new kakao.maps.LatLng(userLoc.lat, userLoc.lng),
        map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="8" fill="#3d7a5e" stroke="#fff" stroke-width="3"/></svg>'),
          new kakao.maps.Size(26, 26)
        )
      });
    }

    const markers = [];
    const infowindows = [];

    // 2. 지도에 마커와 인포윈도우 그리기
    validSpots.forEach((spot, idx) => {
      const position = new kakao.maps.LatLng(spot.lat, spot.lng);
      const marker = new kakao.maps.Marker({ position, map });
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px; font-size:11px; font-weight:700; color:#222; text-align:center; width:130px;">${spot.title}</div>`
      });
      if (idx === 0) infowindow.open(map, marker);

      markers.push(marker);
      infowindows.push(infowindow);

      // 마커 클릭 시 해당 액티비티 상세페이지로 이동
      kakao.maps.event.addListener(marker, 'click', function () {
        window.sendUserActionLog(spot.id, spot.title, 'marker_click');
        goToDetail(spot.id);
      });
    });

    // 3. 하단 슬라이더 카드 HTML 구성
    slider.innerHTML = validSpots.map((spot, idx) => {
      const cat = spot.category || '기타';
      const col = CAT_COLORS[cat] || CAT_COLORS['기타'];
      const emoji = spot.emoji || CAT_EMOJI[cat] || '🎪';
      const isActive = idx === 0 ? 'active' : '';
      const safeSpotTitle = spot.title ? String(spot.title).replace(/'/g, "\\'") : '추천 장소';
      const spotId = spot.id ?? `map-${idx}`;

      return `
        <div class="map-recommend-card ${isActive}" id="map-card-${idx}" onclick="sendUserActionLog('${spotId}', '${safeSpotTitle}', 'click'); goToDetail('${spotId}')">
          <div class="play-thumb" style="background:${col.bg};height:84px;font-size:2.2rem;">${emoji}</div>
          <div class="info">
            <div class="badge-tag">TOP ${idx + 1} · 내 주변</div>
            <div class="place-name">${spot.title}</div>
            <div class="place-distance">📍 ${fmtDistance(spot.distanceKm)}</div>
          </div>
        </div>
      `;
    }).join('');

    // 4. 카드 클릭 시 지도 위 마커도 함께 하이라이트 (호버 프리뷰용, 이동은 goToDetail이 담당)
    window.mapSelectEngine = function (index) {
      const target = validSpots[index];
      if (!target) return;
      document.querySelectorAll('.map-recommend-card').forEach(card => card.classList.remove('active'));
      const activeCard = document.getElementById(`map-card-${index}`);
      if (activeCard) activeCard.classList.add('active');
      infowindows.forEach(info => info.close());
      infowindows[index].open(map, markers[index]);
      map.panTo(new kakao.maps.LatLng(target.lat, target.lng));
    };
  });
}
