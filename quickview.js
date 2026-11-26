// Feature: product page — photo gallery with zoom & swipe, price/deal, delivery
// estimate, Buy now, wishlist, frequently bought together, related pieces, specs.
import { findProduct, allProducts, BUNDLE, BONNET } from './products.js';

const tidy = (value) => String(value ?? '').replace(/\s*·\s*/g, ', ');
const PAIRS = {
  wigs: ['vanity', 'beauty'], couture: ['bags', 'beauty'], bags: ['vanity', 'beauty'],
  beauty: ['vanity', 'wigs'], vanity: ['beauty', 'wigs'], watches: ['bags', 'vanity'],
};

export function initQuickView(ctx) {
  const { t, esc, fmt, state } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const dialog = $('#qv-dialog');
  const img = $('#qv-img');
  const zoomBox = $('#qv-zoom');
  let currentId = null;
  let images = [];
  let imgIndex = 0;
  let fbtItems = [];
  const fbtOff = new Set();

  function setSection(sectionSel, textSel, text) {
    $(textSel).textContent = text || '';
    $(sectionSel).hidden = !text;
  }

  /* ---------- gallery, zoom & swipe ---------- */
  function showImage(i) {
    const p = findProduct(currentId);
    if (!p || !images.length) return;
    imgIndex = (i + images.length) % images.length;
    zoomBox.classList.remove('is-zoomed');
    img.style.transformOrigin = '';
    img.dataset.fallback = p.fallback || '';
    img.src = images[imgIndex] || p.fallback || '';
    img.alt = p.name || '';
    ctx.attachFallbacks(zoomBox);
    const count = $('#qv-photo-count');
    count.hidden = images.length < 2;
    count.textContent = `${imgIndex + 1} / ${images.length}`;
    document.querySelectorAll('#qv-thumbs .qv-thumb').forEach((b, n) => b.classList.toggle('is-active', n === imgIndex));
  }
  function renderThumbs(p) {
    const box = $('#qv-thumbs');
    box.hidden = images.length < 2;
    box.innerHTML = images.map((src, i) => `<button class="qv-thumb ${i === 0 ? 'is-active' : ''}" type="button" data-qv-img="${i}" aria-label="${esc(t('qv.photoN', { n: i + 1 }))}">
      <img src="${esc(src)}" data-fallback="${esc(p.fallback)}" alt="" loading="lazy" /></button>`).join('');
    ctx.attachFallbacks(box);
  }
  function toggleZoom(e) {
    const on = !zoomBox.classList.contains('is-zoomed');
    zoomBox.classList.toggle('is-zoomed', on);
    if (on && e && e.clientX != null) moveZoom(e);
  }
  function moveZoom(e) {
    if (!zoomBox.classList.contains('is-zoomed')) return;
    const r = zoomBox.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    img.style.transformOrigin = `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`;
  }
  let touchX = null; let swiped = false;
  zoomBox.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; swiped = false; }, { passive: true });
  zoomBox.addEventListener('touchend', (e) => {
    if (touchX == null || zoomBox.classList.contains('is-zoomed')) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40 && images.length > 1) { swiped = true; showImage(imgIndex + (dx < 0 ? 1 : -1)); }
  });
  zoomBox.addEventListener('click', (e) => { if (swiped) { swiped = false; return; } toggleZoom(e); });
  zoomBox.addEventListener('mousemove', moveZoom);
  zoomBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleZoom(); }
    if (e.key === 'ArrowRight') showImage(imgIndex + 1);
    if (e.key === 'ArrowLeft') showImage(imgIndex - 1);
  });

  /* ---------- text helpers ---------- */
  function stockText(p) {
    if (p.oneOfOne) return t('qv.oneOfOne');
    if (p.stock == null) return '';
    if (p.stock <= 0) return t('card.soldOut');
    return p.stock <= 5 ? t('qv.onlyLeft', { n: p.stock }) : t('qv.inStock', { n: p.stock });
  }
  function renderShipping() {
    const s = state.shipping || {};
    const methods = s.methods || [];
    const rows = methods.map((m) => `<li><span class="strong">${esc(m.name)}</span>: ${esc([m.eta, fmt(Number(m.priceUsd) || 0)].filter(Boolean).join(', '))}</li>`);
    if (Number(s.freeThresholdUsd) > 0) rows.push(`<li>${esc(t('qv.freeOver', { amount: fmt(Number(s.freeThresholdUsd)) }))}</li>`);
    if (s.dispatchNote) rows.push(`<li>${esc(s.dispatchNote)}</li>`);
    $('#qv-ship-list').innerHTML = rows.join('');
  }
  function addBusinessDays(n) {
    const d = new Date();
    let left = n;
    while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1; }
    return d;
  }
  function dayLabel(d) {
    try { return new Intl.DateTimeFormat(window.miniappI18n?.getContext?.()?.resolvedLocale || 'en', { weekday: 'short', day: 'numeric', month: 'short' }).format(d); } catch { return d.toDateString(); }
  }
  function renderDelivery() {
    const rows = (state.shipping?.methods || []).slice(0, 3).map((m) => {
      const eta = String(m.eta || '');
      if (/same/i.test(eta)) return `<li><span class="strong">${esc(m.name)}</span>: ${esc(t('dlv.today'))}</li>`;
      const nums = (eta.match(/\d+/g) || []).map(Number);
      if (!nums.length) return '';
      const from = dayLabel(addBusinessDays(nums[0]));
      const to = dayLabel(addBusinessDays(nums[nums.length - 1]));
      return `<li><span class="strong">${esc(m.name)}</span>: ${esc(from === to ? t('dlv.by', { date: to }) : t('dlv.range', { from, to }))}</li>`;
    }).filter(Boolean);
    const box = $('#qv-delivery');
    box.hidden = rows.length === 0;
    box.innerHTML = rows.length ? `<li class="delivery-head">${esc(t('dlv.title'))}</li>${rows.join('')}` : '';
  }

  /* ---------- frequently bought together & related ---------- */
  function pickFbt(p) {
    const out = [];
    const avail = (x) => x && x.id !== p.id && !ctx.unavailable(x);
    if (p.category === 'wigs' && avail(BONNET)) out.push(BONNET);
    const pool = allProducts();
    (PAIRS[p.category] || ['beauty', 'vanity']).forEach((cat) => {
      if (out.length >= 2) return;
      const hit = pool.filter((x) => x.category === cat && avail(x) && !out.includes(x)).sort((a, b) => ctx.priceOf(a) - ctx.priceOf(b))[0];
      if (hit) out.push(hit);
    });
    if (out.length < 2 && avail(BUNDLE) && p.category !== 'wigs') out.push(BUNDLE);
    return out.slice(0, 2);
  }
  function renderFbt(p) {
    const sec = $('#qv-fbt');
    fbtItems = ctx.unavailable(p) ? [] : pickFbt(p);
    sec.hidden = fbtItems.length === 0;
    if (!fbtItems.length) return;
    const all = [p, ...fbtItems];
    $('#qv-fbt-list').innerHTML = all.map((x, i) => `<label class="fbt-item">
        <input type="checkbox" data-fbt="${esc(x.id)}" ${i === 0 ? 'checked disabled' : fbtOff.has(x.id) ? '' : 'checked'} />
        <img src="${esc(x.image)}" data-fallback="${esc(x.fallback || '')}" alt="" />
        <span class="fbt-info"><span class="small strong">${esc(i === 0 ? t('fbt.thisItem') : x.name)}</span><span class="small">${esc(fmt(ctx.priceOf(x)))}</span></span>
      </label>`).join('');
    ctx.attachFallbacks($('#qv-fbt-list'));
    updateFbtTotal(p);
  }
  function updateFbtTotal(p) {
    const chosen = [p, ...fbtItems.filter((x) => !fbtOff.has(x.id))];
    $('#qv-fbt-total').textContent = fmt(chosen.reduce((s, x) => s + ctx.priceOf(x), 0));
    $('#qv-fbt-add').textContent = t('fbt.addN', { n: chosen.length });
  }
  function renderRelated(p) {
    const pool = allProducts().filter((x) => x.id !== p.id);
    let list = pool.filter((x) => x.category === p.category);
    if (list.length < 4) list = [...list, ...pool.filter((x) => (PAIRS[p.category] || []).includes(x.category))];
    list = list.filter((x, i, a) => a.indexOf(x) === i).slice(0, 8);
    $('#qv-related-sec').hidden = list.length === 0;
    $('#qv-related').innerHTML = list.map((x) => ctx.shop.miniCard(x)).join('');
    ctx.attachFallbacks($('#qv-related'));
  }

  /* ---------- main render ---------- */
  function render() {
    const p = findProduct(currentId);
    if (!p) { ctx.closeDialog(dialog); return; }
    images = [p.image, ...(p.gallery || [])].filter(Boolean);
    renderThumbs(p);
    showImage(Math.min(imgIndex, images.length - 1));
    const badge = $('#qv-badge');
    badge.className = `tag tag-${p.tag}`;
    badge.textContent = t('tag.' + p.tag);
    const stock = $('#qv-stock');
    stock.textContent = stockText(p);
    stock.hidden = !stock.textContent;
    const deal = ctx.deals?.activeDeal(p.id);
    $('#qv-deal').hidden = !deal;
    $('#qv-deal').textContent = deal ? t('deal.off', { pct: deal.pct }) : '';
    $('#qv-deal-ends').hidden = !deal;
    $('#qv-deal-ends').textContent = deal ? t('deal.endsIn', { time: ctx.deals.endsText(p.id) }) : '';
    const wished = ctx.shop.isWished(p.id);
    const heart = $('#qv-wish');
    heart.innerHTML = ctx.shop.HEART;
    heart.classList.toggle('is-on', wished);
    heart.setAttribute('aria-pressed', String(wished));
    heart.setAttribute('aria-label', t(wished ? 'shop.unsave' : 'shop.save', { name: p.name }));
    $('#qv-era').textContent = tidy(p.era);
    $('#qv-name').textContent = p.name;
    const now = ctx.priceOf(p);
    $('#qv-price').textContent = fmt(now);
    const was = now < p.priceUsd ? p.priceUsd : p.compareUsd > now ? p.compareUsd : null;
    const compare = $('#qv-compare');
    compare.hidden = !was;
    compare.textContent = was ? fmt(was) : '';
    renderDelivery();
    const desc = $('#qv-desc');
    desc.textContent = p.description || '';
    desc.hidden = !p.description;
    const hl = $('#qv-highlights');
    const highlights = Array.isArray(p.highlights) ? p.highlights : [];
    hl.hidden = !highlights.length;
    hl.innerHTML = highlights.map((h) => `<li>${esc(h)}</li>`).join('');
    $('#qv-measure').textContent = tidy(p.measurements) || t('common.none');
    const fit = $('#qv-fit');
    fit.textContent = p.fit || '';
    fit.hidden = !p.fit;
    setSection('#qv-sec-materials', '#qv-materials', p.materials);
    setSection('#qv-sec-condition', '#qv-condition', p.condition);
    setSection('#qv-sec-care', '#qv-care', p.care);
    setSection('#qv-sec-prov', '#qv-provenance', p.provenance);
    renderShipping();
    const sku = $('#qv-sku');
    sku.textContent = p.sku ? t('qv.sku', { sku: p.sku }) : '';
    sku.hidden = !p.sku;
    const shadeSel = $('#qv-shade');
    const keepShade = shadeSel.value;
    $('#qv-shade-wrap').hidden = !p.shades;
    shadeSel.innerHTML = (p.shades || []).map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    if (keepShade && (p.shades || []).includes(keepShade)) shadeSel.value = keepShade;
    const unav = ctx.unavailable(p);
    const addBtn = $('#qv-add');
    addBtn.disabled = unav;
    addBtn.textContent = unav ? t(ctx.isSold(p) ? 'card.soldOut' : 'card.inBag') : t('qv.add');
    $('#qv-buy').hidden = unav;
    const isWig = p.category === 'wigs';
    $('#qv-bonnet-wrap').hidden = !isWig || unav;
    $('#qv-bundle-wrap').hidden = isWig || unav;
    renderFbt(p);
    renderRelated(p);
    ctx.reviews?.renderFor(p.id);
  }

  function open(id) {
    const p = findProduct(id);
    if (!p || p === BUNDLE || p === BONNET) return;
    currentId = id;
    imgIndex = 0;
    fbtOff.clear();
    $('#qv-bundle').checked = true;
    $('#qv-bonnet').checked = true;
    $('#qv-shade').value = '';
    ctx.reviews?.resetForms();
    render();
    ctx.shop.trackView(id);
    ctx.openDialog(dialog);
    dialog.querySelector('.qv')?.scrollTo?.(0, 0);
    dialog.scrollTo?.(0, 0);
  }

  function addSelection() {
    const p = findProduct(currentId);
    if (!p) return null;
    ctx.addToCart(currentId, p.shades ? $('#qv-shade').value : null, false);
    if (p.category === 'wigs') { if ($('#qv-bonnet').checked) ctx.addBonnet(false); }
    else if ($('#qv-bundle').checked) ctx.addBundle(false);
    return p;
  }

  $('#qv-thumbs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qv-img]');
    if (btn) showImage(Number(btn.dataset.qvImg));
  });
  $('#qv-add').addEventListener('click', () => {
    if (!addSelection()) return;
    ctx.closeDialog(dialog);
    ctx.openDialog($('#cart-dialog'));
  });
  $('#qv-buy').addEventListener('click', () => {
    if (!addSelection()) return;
    ctx.closeDialog(dialog);
    ctx.openCheckout();
  });
  $('#qv-wish').addEventListener('click', () => { if (currentId) ctx.shop.toggleWish(currentId); });
  $('#qv-fbt-list').addEventListener('change', (e) => {
    const box = e.target.closest('[data-fbt]');
    if (!box) return;
    if (box.checked) fbtOff.delete(box.dataset.fbt); else fbtOff.add(box.dataset.fbt);
    updateFbtTotal(findProduct(currentId));
  });
  $('#qv-fbt-add').addEventListener('click', () => {
    const p = findProduct(currentId);
    if (!p) return;
    ctx.addToCart(p.id, p.shades ? $('#qv-shade').value : null, false);
    fbtItems.filter((x) => !fbtOff.has(x.id)).forEach((x) => ctx.addToCart(x.id, x.variant || null, false));
    ctx.toast(t('fbt.added'));
    ctx.closeDialog(dialog);
    ctx.openDialog($('#cart-dialog'));
  });

  return {
    open,
    refresh() { if (dialog.open && currentId) render(); },
  };
}
