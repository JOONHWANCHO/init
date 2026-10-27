/* MomCare parenting posts: Google Sheets JSONP client.
 * Configure API_URL with the deployed Google Apps Script Web App URL ending in /exec.
 */
(function () {
  'use strict';

  const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbwlV0TBfvz1d2d4KB8jn-T3Kq-_QQI4MkCKzkcxfLdA7qSam7wllaVHn6hE1VqmR-Ga-g/exec',
    PAGE_SIZE: 20
  };

  const COPY = {
    ko: {
      homeEyebrow: 'MomCare Parenting Journal', homeTitle: '함께 자라는 육아 이야기',
      homeDesc: '매일의 육아에 도움이 되는 가이드와 작은 팁을 모았어요.', viewAll: '전체 글 보기',
      homeEmptyTitle: '육아 이야기를 준비하고 있어요', empty: '새로운 글이 등록되면 이곳에서 만나볼 수 있어요.',
      loading: '게시글을 불러오는 중이에요…', error: '게시글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      allEyebrow: 'PARENTING LIBRARY', allTitle: '육아 글 전체 보기',
      allDesc: '수유와 수면부터 성장·발달까지, 필요한 정보를 찾아보세요.',
      search: '궁금한 주제나 키워드를 검색해 보세요', resultCount: '개의 글',
      noSearch: '검색어와 일치하는 글이 없어요.', readMore: '글 읽기',
      backAll: '전체 글로 돌아가기', noTranslationTitle: '아직 번역된 글이 없어요',
      noTranslation: '선택한 언어로 번역된 글은 아직 공개되지 않았어요.', externalLink: '관련 링크 열기',
      updated: '게시 날짜', home: '메인으로',
      categories: { sleep: '수유·수면', food: '이유식·영양', growth: '성장·발달', health: '건강·응급', subsidy: '지원금·제도', pregnancy: '임신·출산' }
    },
    ja: {
      homeEyebrow: 'MomCare Parenting Journal', homeTitle: '親子で育つ、子育てのヒント',
      homeDesc: '毎日の子育てに役立つガイドと小さなヒントを集めました。', viewAll: '記事をすべて見る',
      homeEmptyTitle: '子育て記事を準備しています', empty: '新しい記事が公開されると、ここに表示されます。',
      loading: '記事を読み込んでいます…', error: '記事を読み込めませんでした。しばらくしてから再度お試しください。',
      allEyebrow: 'PARENTING LIBRARY', allTitle: '子育て記事一覧',
      allDesc: '授乳・睡眠から成長・発達まで、必要な情報を探しましょう。',
      search: 'テーマやキーワードで検索', resultCount: '件の記事',
      noSearch: '検索語に一致する記事はありません。', readMore: '記事を読む',
      backAll: '記事一覧に戻る', noTranslationTitle: '翻訳記事はまだありません',
      noTranslation: '選択した言語の記事はまだ公開されていません。', externalLink: '関連リンクを開く',
      updated: '投稿日', home: 'ホームへ',
      categories: { sleep: '授乳・睡眠', food: '離乳食・栄養', growth: '成長・発達', health: '健康・応急処置', subsidy: '給付金・制度', pregnancy: '妊娠・出産' }
    },
    en: {
      homeEyebrow: 'MomCare Parenting Journal', homeTitle: 'Little guides for growing together',
      homeDesc: 'Helpful guides and small tips for your everyday parenting journey.', viewAll: 'View all articles',
      homeEmptyTitle: 'Parenting stories are on the way', empty: 'New articles will appear here as soon as they are published.',
      loading: 'Loading articles…', error: 'We couldn’t load the articles. Please try again shortly.',
      allEyebrow: 'PARENTING LIBRARY', allTitle: 'All parenting articles',
      allDesc: 'Find helpful information on feeding, sleep, growth, development, and more.',
      search: 'Search by topic or keyword', resultCount: ' articles',
      noSearch: 'No articles match your search.', readMore: 'Read article',
      backAll: 'Back to all articles', noTranslationTitle: 'No translation available yet',
      noTranslation: 'This article has not been published in the selected language yet.', externalLink: 'Open related link',
      updated: 'Published', home: 'Home',
      categories: { sleep: 'Feeding & Sleep', food: 'Food & Nutrition', growth: 'Growth & Development', health: 'Health & First Aid', subsidy: 'Benefits & Policies', pregnancy: 'Pregnancy & Birth' }
    }
  };

  const state = {
    lang: 'ko',
    allPosts: [],
    filteredPosts: [],
    visibleCount: 0,
    loadSequence: 0,
    observer: null,
    isHome: Boolean(document.getElementById('homeParentingPostsGrid')),
    isPostsPage: Boolean(document.getElementById('allParentingPostsGrid')),
    postId: new URLSearchParams(window.location.search).get('id') || '',
    searchTerm: ''
  };

  const byId = (id) => document.getElementById(id);
  const copy = () => COPY[state.lang] || COPY.ko;

  function getStoredLanguage() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('lang');
    if (['ko', 'ja', 'en'].includes(fromUrl)) return fromUrl;
    try {
      const stored = localStorage.getItem('momcare_lang');
      if (['ko', 'ja', 'en'].includes(stored)) return stored;
    } catch (_error) { /* Storage may be disabled. */ }
    return 'ko';
  }

  function saveLanguage(lang) {
    state.lang = ['ko', 'ja', 'en'].includes(lang) ? lang : 'ko';
    try { localStorage.setItem('momcare_lang', state.lang); } catch (_error) { /* Storage may be disabled. */ }
    const select = byId('langSelect') || byId('postsLangSelect');
    if (select) select.value = state.lang;
    if (state.isPostsPage) {
      const params = new URLSearchParams(window.location.search);
      params.set('lang', state.lang);
      const query = params.toString();
      history.replaceState(null, '', `${window.location.pathname}?${query}${window.location.hash}`);
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    return String(value || '').split(/[,，|]/).map((v) => v.trim().replace(/^#/, '')).filter(Boolean);
  }

  function safeHttpUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch (_error) { /* Invalid URL. */ }
    return '';
  }

  function postUrl(post) {
    return `parenting-posts.html?id=${encodeURIComponent(post.id)}&lang=${encodeURIComponent(state.lang)}`;
  }

  function formatDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      if (state.lang === 'ja') return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
      if (state.lang === 'en') return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
      return `${match[1]}.${String(match[2]).padStart(2, '0')}.${String(match[3]).padStart(2, '0')}`;
    }
    return raw;
  }

  function categoryName(post) {
    const key = String(post.category || '').trim().toLowerCase();
    return copy().categories[key] || String(post.category || '');
  }

  function postCard(post) {
    const tags = normalizeTags(post.tags).slice(0, 3).map((tag) =>
      `<span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">#${escapeHtml(tag)}</span>`
    ).join('');
    const date = formatDate(post.date);
    return `
      <article class="group flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-lg dark:border-slate-700/80 dark:bg-slate-800 dark:hover:border-indigo-500/50">
        <div class="mb-4 flex items-start justify-between gap-3">
          <span class="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300"><span>${escapeHtml(post.emoji || '🌱')}</span><span class="truncate">${escapeHtml(categoryName(post))}</span></span>
          ${date ? `<time class="shrink-0 pt-1 text-[11px] text-slate-400" datetime="${escapeHtml(post.date)}">${escapeHtml(date)}</time>` : ''}
        </div>
        <a href="${postUrl(post)}" class="mb-2 block text-base font-bold leading-snug text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-300">${escapeHtml(post.title)}</a>
        <p class="mb-5 line-clamp-3 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-400">${escapeHtml(post.summary)}</p>
        <div class="mb-4 flex min-h-6 flex-wrap gap-1.5">${tags}</div>
        <a href="${postUrl(post)}" class="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 transition-all group-hover:gap-3 dark:text-indigo-300">${escapeHtml(copy().readMore)} <span aria-hidden="true">→</span></a>
      </article>`;
  }

  function markdownToHtml(markdown) {
    const source = String(markdown || '');
    if (window.marked && window.DOMPurify) {
      const rendered = window.marked.parse(source, { breaks: true, gfm: true });
      return window.DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } });
    }
    // Safe fallback: render plain text as paragraphs if the Markdown library is unavailable.
    return source.split(/\n\s*\n/).map((line) => `<p>${escapeHtml(line).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function renderDetail(post) {
    const target = byId('parentingPostDetail');
    if (!target) return;
    if (!post) {
      const breadcrumb = byId('breadcrumbPosts');
      if (breadcrumb) breadcrumb.textContent = copy().allTitle;
      target.innerHTML = `
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div class="mb-4 text-4xl">🌍</div>
          <h2 class="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">${escapeHtml(copy().noTranslationTitle)}</h2>
          <p class="mb-6 text-sm leading-6 text-slate-500 dark:text-slate-400">${escapeHtml(copy().noTranslation)}</p>
          <a href="parenting-posts.html?lang=${encodeURIComponent(state.lang)}" class="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700">${escapeHtml(copy().backAll)}</a>
        </div>`;
      return;
    }
    const date = formatDate(post.date);
    const tags = normalizeTags(post.tags).map((tag) => `<span class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">#${escapeHtml(tag)}</span>`).join('');
    const external = safeHttpUrl(post.link);
    const breadcrumb = byId('breadcrumbPosts');
    if (breadcrumb) breadcrumb.textContent = post.title;
    target.innerHTML = `
      <article class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div class="bg-gradient-to-br from-indigo-50 via-white to-pink-50 px-5 py-8 sm:px-9 sm:py-10 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/40">
          <a href="parenting-posts.html?lang=${encodeURIComponent(state.lang)}" class="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300">← ${escapeHtml(copy().backAll)}</a>
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-200">${escapeHtml(post.emoji || '🌱')} ${escapeHtml(categoryName(post))}</span>
            ${date ? `<time class="text-xs text-slate-400" datetime="${escapeHtml(post.date)}">${escapeHtml(copy().updated)} · ${escapeHtml(date)}</time>` : ''}
          </div>
          <h1 class="max-w-3xl text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-4xl dark:text-white">${escapeHtml(post.title)}</h1>
          <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">${escapeHtml(post.summary)}</p>
          ${tags ? `<div class="mt-5 flex flex-wrap gap-2">${tags}</div>` : ''}
        </div>
        <div class="mx-auto max-w-3xl px-5 py-8 sm:px-9 sm:py-10">
          <div class="momcare-markdown text-[15px] leading-8 text-slate-700 sm:text-base dark:text-slate-200">${markdownToHtml(post.content)}</div>
          ${external ? `<div class="mt-10 border-t border-slate-100 pt-6 dark:border-slate-700"><a href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-full border border-indigo-100 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-600 dark:text-indigo-300 dark:hover:bg-slate-700">${escapeHtml(copy().externalLink)} <span aria-hidden="true">↗</span></a></div>` : ''}
        </div>
      </article>`;
  }

  function setStatus(container, message, kind) {
    if (!container) return;
    container.className = 'py-8 text-center text-sm ' + (kind === 'error' ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500');
    container.textContent = message || '';
  }

  function loadMore() {
    const grid = state.isHome ? byId('homeParentingPostsGrid') : byId('allParentingPostsGrid');
    const sentinel = state.isHome ? byId('homeParentingPostsSentinel') : byId('allParentingPostsSentinel');
    const loadButton = state.isHome ? byId('homeParentingPostsLoadMore') : byId('allParentingPostsLoadMore');
    if (!grid || state.visibleCount >= state.filteredPosts.length) {
      if (sentinel) sentinel.hidden = true;
      if (loadButton) loadButton.hidden = true;
      return;
    }
    const next = state.filteredPosts.slice(state.visibleCount, state.visibleCount + CONFIG.PAGE_SIZE);
    grid.insertAdjacentHTML('beforeend', next.map(postCard).join(''));
    state.visibleCount += next.length;
    const hasMore = state.visibleCount < state.filteredPosts.length;
    if (sentinel) sentinel.hidden = !hasMore;
    if (loadButton) loadButton.hidden = !hasMore || 'IntersectionObserver' in window;
  }

  function renderList(posts, isError) {
    if (state.observer) { state.observer.disconnect(); state.observer = null; }
    const grid = state.isHome ? byId('homeParentingPostsGrid') : byId('allParentingPostsGrid');
    const status = state.isHome ? byId('homeParentingPostsStatus') : byId('allParentingPostsStatus');
    const loading = state.isHome ? byId('homeParentingPostsLoading') : byId('allParentingPostsLoading');
    const sentinel = state.isHome ? byId('homeParentingPostsSentinel') : byId('allParentingPostsSentinel');
    const loadButton = state.isHome ? byId('homeParentingPostsLoadMore') : byId('allParentingPostsLoadMore');
    if (!grid) return;
    grid.innerHTML = '';
    state.visibleCount = 0;
    if (loading) loading.hidden = true;
    if (sentinel) sentinel.hidden = true;
    if (loadButton) loadButton.hidden = true;

    if (state.isPostsPage && state.postId) {
      const post = posts.find((item) => String(item.id) === String(state.postId));
      const detail = byId('parentingPostDetail');
      const toolbar = byId('allParentingPostsToolbar');
      const pageIntro = byId('allParentingPostsIntro');
      if (grid) grid.hidden = true;
      if (status) status.hidden = true;
      if (sentinel) sentinel.hidden = true;
      if (loadButton) loadButton.hidden = true;
      if (toolbar) toolbar.hidden = true;
      if (pageIntro) pageIntro.hidden = true;
      if (detail) detail.hidden = false;
      renderDetail(post || null);
      if (post) document.title = `${post.title} | MomCare`;
      else document.title = `${copy().noTranslationTitle} | MomCare`;
      return;
    }

    const detail = byId('parentingPostDetail');
    if (detail) detail.hidden = true;
    if (grid) grid.hidden = false;
    const toolbar = byId('allParentingPostsToolbar');
    const pageIntro = byId('allParentingPostsIntro');
    if (toolbar) toolbar.hidden = false;
    if (pageIntro) pageIntro.hidden = false;

    if (!posts.length) {
      if (status) {
        status.hidden = false;
        const message = isError ? copy().error : (state.searchTerm ? copy().noSearch : copy().empty);
        setStatus(status, message, isError ? 'error' : '');
      }
      updateResultCount(0);
      return;
    }

    state.filteredPosts = posts;
    if (status) { status.hidden = true; status.textContent = ''; }
    loadMore();
    updateResultCount(posts.length);
    if (state.observer) state.observer.disconnect();
    if ('IntersectionObserver' in window && sentinel) {
      state.observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      }, { rootMargin: '500px 0px' });
      state.observer.observe(sentinel);
    }
  }

  function updateResultCount(count) {
    const result = byId('allParentingPostsCount');
    if (result) result.textContent = `${count.toLocaleString()}${copy().resultCount}`;
  }

  function applySearch() {
    const term = (state.searchTerm || '').trim().toLocaleLowerCase(state.lang);
    const filtered = !term ? state.allPosts : state.allPosts.filter((post) => {
      const corpus = [post.title, post.summary, post.category, post.tags, post.content].join(' ').toLocaleLowerCase(state.lang);
      return corpus.includes(term);
    });
    renderList(filtered, false);
  }

  function jsonpRequest(lang) {
    return new Promise((resolve, reject) => {
      const apiUrl = String(CONFIG.API_URL || '').trim();
      if (!apiUrl || apiUrl.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') || !/^https:\/\//i.test(apiUrl)) {
        resolve({ ok: true, posts: [], notConfigured: true });
        return;
      }
      const callbackName = `__momcare_posts_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const script = document.createElement('script');
      let timeoutId;
      const cleanup = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        try { delete window[callbackName]; } catch (_error) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      };
      window[callbackName] = (payload) => {
        cleanup();
        if (payload && payload.ok) resolve(payload);
        else reject(new Error((payload && payload.error) || 'The API returned an error.'));
      };
      script.onerror = () => { cleanup(); reject(new Error('Google Apps Script endpoint was blocked or returned a non-JavaScript response. Check Web app deployment access (anonymous users allowed), Execute as: me, and the current /exec URL.')); };
      script.src = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=posts&lang=${encodeURIComponent(lang)}&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      timeoutId = window.setTimeout(() => { cleanup(); reject(new Error('Google Sheets API timed out')); }, 15000);
      document.head.appendChild(script);
    });
  }

  function isCompleteTranslation(post) {
    return Boolean(post && String(post.id || '').trim() && String(post.title || '').trim() &&
      String(post.summary || '').trim() && String(post.content || '').trim());
  }

  async function loadPosts(lang) {
    saveLanguage(lang || state.lang);
    if (state.isHome) {
      const viewAll = byId('homeParentingPostsViewAll');
      if (viewAll) viewAll.href = `parenting-posts.html?lang=${encodeURIComponent(state.lang)}`;
      renderCopy();
    }
    if (state.isPostsPage) renderCopy();

    const sequence = ++state.loadSequence;
    const loading = state.isHome ? byId('homeParentingPostsLoading') : byId('allParentingPostsLoading');
    const status = state.isHome ? byId('homeParentingPostsStatus') : byId('allParentingPostsStatus');
    const grid = state.isHome ? byId('homeParentingPostsGrid') : byId('allParentingPostsGrid');
    if (loading) { loading.hidden = false; loading.textContent = copy().loading; }
    if (status) status.hidden = true;
    if (grid && !(state.isPostsPage && state.postId)) grid.innerHTML = '';

    try {
      const payload = await jsonpRequest(state.lang);
      if (sequence !== state.loadSequence) return;
      const requestedLang = state.lang;
      const rawPosts = Array.isArray(payload.posts) ? payload.posts : [];
      state.allPosts = rawPosts
        .filter((post) => !post.lang || String(post.lang).toLowerCase() === requestedLang)
        .filter(isCompleteTranslation);
      if (loading) loading.hidden = true;
      if (state.isPostsPage && state.postId) {
        renderList(state.allPosts, false);
      } else {
        applySearch();
      }
    } catch (error) {
      if (sequence !== state.loadSequence) return;
      state.allPosts = [];
      if (loading) loading.hidden = true;
      renderList([], true);
      if (window.console && console.warn) console.warn('[MomCare posts]', error.message);
    }
  }

  function renderCopy() {
    const t = copy();
    const map = {
      homeParentingPostsEyebrow: t.homeEyebrow,
      homeParentingPostsTitle: t.homeTitle,
      homeParentingPostsDesc: t.homeDesc,
      homeParentingPostsViewAll: t.viewAll,
      allParentingPostsEyebrow: t.allEyebrow,
      allParentingPostsTitle: t.allTitle,
      allParentingPostsDesc: t.allDesc,
      postsBackHome: t.home
    };
    Object.keys(map).forEach((id) => { const el = byId(id); if (el) el.textContent = map[id]; });
    const search = byId('parentingPostsSearch');
    if (search) search.placeholder = t.search;
    const loading = state.isHome ? byId('homeParentingPostsLoading') : byId('allParentingPostsLoading');
    if (loading && !loading.hidden) loading.textContent = t.loading;
    document.documentElement.lang = state.lang;
    if (!state.postId && state.isPostsPage) document.title = `${t.allTitle} | MomCare`;
  }

  function changePostsLanguage(lang) {
    loadPosts(lang);
    try { window.dispatchEvent(new CustomEvent('momcare:languagechange', { detail: { lang: state.lang } })); } catch (_error) { /* Not required for standalone list page. */ }
  }

  function togglePostsTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    try { localStorage.setItem('momcare_theme', isDark ? 'dark' : 'light'); } catch (_error) { /* Storage may be disabled. */ }
    const buttonText = byId('postsThemeText');
    if (buttonText) buttonText.textContent = isDark ? (state.lang === 'ko' ? '낮 모드' : state.lang === 'ja' ? 'ライトモード' : 'Light mode') : (state.lang === 'ko' ? '야간 모드' : state.lang === 'ja' ? 'ダークモード' : 'Dark mode');
  }

  function init() {
    if (!state.isHome && !state.isPostsPage) return;
    state.lang = getStoredLanguage();
    const langSelect = byId('langSelect') || byId('postsLangSelect');
    if (langSelect) langSelect.value = state.lang;
    try {
      if (localStorage.getItem('momcare_theme') === 'dark') document.documentElement.classList.add('dark');
    } catch (_error) { /* Storage may be disabled. */ }
    renderCopy();
    const search = byId('parentingPostsSearch');
    if (search) {
      search.addEventListener('input', () => {
        state.searchTerm = search.value;
        applySearch();
      });
    }
    const moreButton = byId(state.isHome ? 'homeParentingPostsLoadMore' : 'allParentingPostsLoadMore');
    if (moreButton) moreButton.addEventListener('click', loadMore);

    window.addEventListener('momcare:languagechange', (event) => {
      const eventLang = event && event.detail && event.detail.lang;
      if (eventLang && ['ko', 'ja', 'en'].includes(eventLang) && eventLang !== state.lang) loadPosts(eventLang);
    });
    if (state.isPostsPage && state.postId) {
      const grid = byId('allParentingPostsGrid');
      const toolbar = byId('allParentingPostsToolbar');
      const intro = byId('allParentingPostsIntro');
      const detail = byId('parentingPostDetail');
      if (grid) grid.hidden = true;
      if (toolbar) toolbar.hidden = true;
      if (intro) intro.hidden = true;
      if (detail) detail.hidden = false;
    }
    loadPosts(state.lang);
  }

  window.changePostsLanguage = changePostsLanguage;
  window.togglePostsTheme = togglePostsTheme;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
