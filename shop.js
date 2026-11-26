// Feature: the shop grid with Amazon-style tools — live search with suggestions,
// sort, price/stock/sale filters, wishlist (hearts) and "recently viewed".
import { allProducts } from './products.js';

const tidy = (value) => String(value ?? '').replace(/\s*·\s*/g, ', ');
const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.7 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.2 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4Z"/></svg>';

export function initShop(ctx) {
  const { t, esc, fmt, state } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const KEY_WISH = 'bv_wishlist';
  const KEY_RECENT = 'bv_recent';
  const f = { query: '', sort: 'featured', min: '', max: '', inStock: false, onSale: false, saved: false };
  let wish = new Set();
  let recent = [];

  const priceOf = (p) => ctx.priceOf(p);
  const inCurrency = (usd) => (state.currency === 'NGN' ? usd * (Number(state.shipping.ngnRate) || 1) : usd);
  const onSale = (p) => priceOf(p) < p.priceUsd || p.compareUsd > p.priceUsd;
  const filtersActive = () => !!(f.query || f.min !== '' || f.max !== '' || f.inStock || f.onSale || f.saved);

  function matchesCategory(p, cat) {
    if (cat === 'all') return true;
    if (cat === 'partners') return !!p.partner;
    return p.category === cat;
  }
  function haystack(p) {
    return [p.name, p.sku, p.era, p.description, p.materials, t('cat.' + p.category), p.partner?.storeName]
      .filter(Boolean).join(' ').toLowerCase();
  }
  function matchesQuery(p, q) {
    if (!q) return true;
    const text = haystack(p);
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w));
  }
  function filtered() {
    const all = allProducts();
    let list = all.filter((p) => matchesCategory(p, state.category) && matchesQuery(p, f.query));
    const min = f.min === '' ? null : Number(f.min);
    const max = f.max === '' ? null : Number(f.max);
    if (min != null && !Number.isNaN(min)) list = list.filter((p) => inCurrency(priceOf(p)) >= min);
    if (max != null && !Number.isNaN(max)) list = list.filter((p) => inCurrency(priceOf(p)) <= max);
    if (f.inStock) list = list.filter((p) => !ctx.unavailable(p));
    if (f.onSale) list = list.filter(onSale);
    if (f.saved) list = list.filter((p) => wish.has(p.id));
    const index = new Map(all.map((p, i) => [p.id, i]));
    const rating = (p) => ctx.reviews?.summary(p.id) || { avg: 0, count: 0 };
    const sorters = {
      priceAsc: (a, b) => priceOf(a) - priceOf(b),
      priceDesc: (a, b) => priceOf(b) - priceOf(a),
      newest: (a, b) => index.get(b.id) - index.get(a.id),
      rating: (a, b) => rating(b).avg - rating(a).avg || rating(b).count - rating(a).count,
    };
    if (sorters[f.sort]) list = [...list].sort(sorters[f.sort]);
    return list;
  }

  /* ---------- small shared pieces ---------- */
  function starsHtml(id, withCount = true) {
    const s = ctx.reviews?.summary(id);
    if (!s || !s.count) return '';
    const label = t('rev.starsAria', { avg: s.avg.toFixed(1), n: s.count });
    return `<span class="rating"><span class="stars" style="--pct:${Math.round((s.avg / 5) * 100)}%" role="img" aria-label="${esc(label)}"></span>${withCount ? `<span class="rating-count">(${s.count})</span>` : ''}</span>`;
  }
  function priceHtml(p) {
    const now = priceOf(p);
    const was = now < p.priceUsd ? p.priceUsd : p.compareUsd > now ? p.compareUsd : null;
    return `<span class="price-wrap"><span class="price">${esc(fmt(now))}</span>${was ? `<span class="strike">${esc(fmt(was))}</span>` : ''}</span>`;
  }
  function miniCard(p, extra = '') {
    return `<article class="mini-card">
      <button class="mini-card-media" type="button" data-qv="${esc(p.id)}" aria-label="${esc(t('card.inspectAria', { name: p.name }))}">
        <img src="${esc(p.image)}" data-fallback="${esc(p.fallback)}" alt="" loading="lazy" />${extra}
      </button>
      <button class="mini-card-name link-btn" type="button" data-qv="${esc(p.id)}">${esc(p.name)}</button>
      ${starsHtml(p.id)}
      ${priceHtml(p)}
    </article>`;
  }

  /* ---------- grid ---------- */
  function renderProducts() {
    const list = filtered();
    const grid = $('#product-grid');
    const active = filtersActive();
    $('#grid-empty').hidden = list.length > 0 || active;
    $('#grid-noresults').hidden = list.length > 0 || !active;
    $('#results-count').textContent = t('shop.results', { n: list.length });
    grid.innerHTML = list.map((p) => {
      const sold = ctx.isSold(p);
      const held = p.oneOfOne && state.cart.some((i) => i.id === p.id);
      const unav = sold || held;
      const label = sold ? t('card.soldOut') : held ? t('card.inBag') : t('card.add');
      const deal = ctx.deals?.activeDeal(p.id);
      const saved = wish.has(p.id);
      return `<article class="card ${unav ? 'is-unavailable' : ''}">
      <button class="card-media" type="button" data-qv="${esc(p.id)}" aria-label="${esc(t('card.inspectAria', { name: p.name }))}">
        <img src="${esc(p.image)}" data-fallback="${esc(p.fallback)}" alt="${esc(p.name)}" loading="lazy" />
        <span class="card-tags"><span class="tag tag-${esc(p.tag)}">${esc(t('tag.' + p.tag))}</span>${deal ? `<span class="tag tag-deal">${esc(t('deal.off', { pct: deal.pct }))}</span>` : ''}${unav ? `<span class="tag tag-dark">${esc(t(sold ? 'card.archived' : 'card.reserved'))}</span>` : ''}</span>
        <span class="card-hover">${esc(t('card.inspect'))}</span>
      </button>
      <button class="heart-btn ${saved ? 'is-on' : ''}" type="button" data-wish="${esc(p.id)}" aria-pressed="${saved}" aria-label="${esc(t(saved ? 'shop.unsave' : 'shop.save', { name: p.name }))}">${HEART}</button>
      <div class="card-body">
        <div class="card-meta"><span>${esc(tidy(p.era))}</span><span>${esc(t('cat.' + p.category))}</span></div>
        <h3 class="card-title"><button class="link-btn" type="button" data-qv="${esc(p.id)}">${esc(p.name)}</button></h3>
        ${starsHtml(p.id)}
        <p class="card-desc">${esc(tidy(p.measurements))}</p>
        ${!sold && !p.oneOfOne && p.stock != null && p.stock <= 5 ? `<p class="stock-note">${esc(t('qv.onlyLeft', { n: p.stock }))}</p>` : ''}
        ${p.category === 'wigs' && !unav ? `<button class="bonnet-chip" type="button" data-wig-bonnet="${esc(p.id)}">${esc(t('bonnet.cardAdd', { price: fmt(ctx.bonnetPrice()) }))}</button>` : ''}
        <div class="card-foot">${priceHtml(p)}
          <button class="btn btn-primary btn-sm" type="button" data-add="${esc(p.id)}" ${unav ? 'disabled' : ''}>${esc(label)}</button></div>
      </div></article>`;
    }).join('');
    ctx.attachFallbacks(grid);
    renderSavedChip();
  }
  function renderCounts() {
    const all = allProducts();
    $$('[data-count]').forEach((el) => {
      el.textContent = `(${all.filter((p) => matchesCategory(p, el.dataset.count)).length})`;
    });
  }
  function renderHeading() {
    $('#catalog-heading').textContent = f.query ? t('shop.resultsFor', { q: f.query }) : t('heading.' + state.category);
  }
  function setCategory(cat) {
    state.category = cat;
    renderHeading();
    $$('[data-cat]').forEach((b) => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('is-active', on);
      if (b.classList.contains('pill')) b.setAttribute('aria-pressed', String(on));
    });
    renderProducts();
  }

  /* ---------- wishlist ---------- */
  function renderSavedChip() {
    const btn = $('#saved-toggle');
    btn.classList.toggle('is-active', f.saved);
    btn.setAttribute('aria-pressed', String(f.saved));
    $('#saved-count').textContent = String(wish.size);
  }
  function toggleWish(id) {
    if (wish.has(id)) { wish.delete(id); ctx.toast(t('shop.removedSaved')); }
    else { wish.add(id); ctx.toast(t('shop.addedSaved')); }
    ctx.save(KEY_WISH, [...wish]);
    renderProducts();
    ctx.quickView?.refresh();
  }

  /* ---------- recently viewed ---------- */
  function trackView(id) {
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 12);
    ctx.save(KEY_RECENT, recent, { sync: false });
    renderRecent();
  }
  function renderRecent() {
    const items = recent.map((id) => allProducts().find((p) => p.id === id)).filter(Boolean);
    $('#recent').hidden = items.length === 0;
    const box = $('#recent-list');
    box.innerHTML = items.map((p) => miniCard(p)).join('');
    ctx.attachFallbacks(box);
  }

  /* ---------- search suggestions ---------- */
  const suggest = $('#search-suggest');
  const searchInput = $('#site-search');
  function renderSuggest() {
    const q = searchInput.value.trim();
    if (q.length < 2) { suggest.hidden = true; searchInput.setAttribute('aria-expanded', 'false'); return; }
    const hits = allProducts().filter((p) => matchesQuery(p, q)).slice(0, 6);
    suggest.innerHTML = hits.length ? hits.map((p) => `<li><button class="suggest-row" type="button" data-qv="${esc(p.id)}">
        <img src="${esc(p.image)}" data-fallback="${esc(p.fallback)}" alt="" />
        <span class="suggest-main"><span class="suggest-name">${esc(p.name)}</span><span class="small muted">${esc(t('cat.' + p.category))}</span></span>
        <span class="strong small">${esc(fmt(priceOf(p)))}</span></button></li>`).join('')
      : `<li class="suggest-empty">${esc(t('shop.noSuggest', { q }))}</li>`;
    ctx.attachFallbacks(suggest);
    suggest.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
  }
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    $('#search-clear').hidden = !searchInput.value;
    renderSuggest();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { f.query = searchInput.value.trim(); renderHeading(); renderProducts(); }, 200);
  });
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    f.query = searchInput.value.trim();
    suggest.hidden = true;
    if (f.query && state.category !== 'all') setCategory('all'); else { renderHeading(); renderProducts(); }
    $('#catalog').scrollIntoView({ behavior: 'smooth' });
    searchInput.blur();
  });
  $('#search-clear').addEventListener('click', () => { clearAll(); searchInput.focus(); });
  suggest.addEventListener('click', () => { suggest.hidden = true; });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrap')) suggest.hidden = true; });
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') suggest.hidden = true; });

  /* ---------- sort & filters ---------- */
  $('#sort-select').addEventListener('change', (e) => { f.sort = e.target.value; renderProducts(); });
  $('#filters-toggle').addEventListener('click', () => {
    const panel = $('#filters-panel');
    panel.hidden = !panel.hidden;
    $('#filters-toggle').setAttribute('aria-expanded', String(!panel.hidden));
  });
  const readFilters = () => {
    f.min = $('#f-min').value.trim(); f.max = $('#f-max').value.trim();
    f.inStock = $('#f-stock').checked; f.onSale = $('#f-sale').checked;
    renderProducts();
  };
  ['#f-min', '#f-max'].forEach((s) => $(s).addEventListener('input', readFilters));
  ['#f-stock', '#f-sale'].forEach((s) => $(s).addEventListener('change', readFilters));
  $('#saved-toggle').addEventListener('click', () => { f.saved = !f.saved; renderProducts(); });
  function clearAll() {
    Object.assign(f, { query: '', min: '', max: '', inStock: false, onSale: false, saved: false });
    searchInput.value = ''; $('#search-clear').hidden = true; suggest.hidden = true;
    $('#f-min').value = ''; $('#f-max').value = ''; $('#f-stock').checked = false; $('#f-sale').checked = false;
    renderHeading(); renderProducts();
  }
  $('#filters-clear').addEventListener('click', clearAll);
  $('#noresults-clear').addEventListener('click', clearAll);
  $('#recent-clear').addEventListener('click', () => { recent = []; ctx.save(KEY_RECENT, [], { sync: false }); renderRecent(); });
  document.addEventListener('click', (e) => {
    const heart = e.target.closest('[data-wish]');
    if (heart) toggleWish(heart.dataset.wish);
  });

  async function load() {
    const [w, r] = await Promise.all([ctx.load(KEY_WISH, []), ctx.load(KEY_RECENT, [], { sync: false })]);
    wish = new Set(Array.isArray(w) ? w : []);
    recent = Array.isArray(r) ? r.filter((x) => typeof x === 'string') : [];
    renderRecent();
  }

  return {
    load, setCategory, renderProducts, renderCounts, renderHeading, renderRecent,
    toggleWish, isWished: (id) => wish.has(id), trackView, miniCard, starsHtml, priceHtml, HEART,
  };
}
