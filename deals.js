// Feature: "Today's deals" — admin picks products, a % off and an end time;
// shoppers see a deals strip with live countdowns and the reduced price everywhere.
import { allProducts, findProduct } from './products.js';

export function initDeals(ctx) {
  const { t, esc, fmt } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const KEY = 'bv_deals';
  let deals = [];

  const live = () => deals.filter((d) => d.endsAt > Date.now() && findProduct(d.productId));
  function activeDeal(id) { return live().find((d) => d.productId === id) || null; }
  function priceOf(p) {
    const d = p && activeDeal(p.id);
    if (!d) return p.priceUsd;
    return Math.round(p.priceUsd * (100 - d.pct)) / 100;
  }
  function left(ms) {
    let s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    const p = (n) => String(n).padStart(2, '0');
    return d > 0 ? t('deal.leftDays', { d, h: p(h), m: p(m) }) : t('deal.left', { h: p(h), m: p(m), s: p(s) });
  }
  function endsText(id) {
    const d = activeDeal(id);
    return d ? left(d.endsAt - Date.now()) : '';
  }

  function renderStrip() {
    const list = live().sort((a, b) => a.endsAt - b.endsAt);
    $('#deals').hidden = list.length === 0;
    const box = $('#deals-list');
    box.innerHTML = list.map((d) => {
      const p = findProduct(d.productId);
      const extra = `<span class="deal-flag">${esc(t('deal.off', { pct: d.pct }))}</span>`;
      return ctx.shop.miniCard(p, extra).replace('</article>', `<p class="deal-ends" data-deal-ends="${d.endsAt}">${esc(left(d.endsAt - Date.now()))}</p></article>`);
    }).join('');
    ctx.attachFallbacks(box);
  }
  let wasLive = -1;
  setInterval(() => {
    document.querySelectorAll('[data-deal-ends]').forEach((el) => { el.textContent = left(Number(el.dataset.dealEnds) - Date.now()); });
    const n = live().length;
    if (wasLive !== -1 && n !== wasLive) { renderStrip(); ctx.refreshPrices(); }
    wasLive = n;
  }, 1000);

  /* ---------- admin tab ---------- */
  const tabs = $('#admin-dialog .tabs');
  const tabBtn = document.createElement('button');
  Object.assign(tabBtn, { className: 'tab', type: 'button', textContent: t('deal.tab') });
  tabBtn.setAttribute('role', 'tab');
  tabBtn.setAttribute('aria-selected', 'false');
  tabBtn.dataset.tab = 'deals';
  const overviewTab = tabs?.querySelector('[data-tab="overview"]');
  if (overviewTab) overviewTab.before(tabBtn); else tabs?.appendChild(tabBtn);

  const panel = document.createElement('section');
  panel.id = 'admin-tab-deals';
  panel.className = 'tab-panel';
  panel.hidden = true;
  panel.innerHTML = `<form id="deal-form" class="panel stack" novalidate>
      <p class="eyebrow">${esc(t('deal.addTitle'))}</p>
      <div class="form-grid">
        <div class="field span-2"><label for="deal-product">${esc(t('deal.product'))}</label><select id="deal-product" class="input"></select></div>
        <div class="field"><label for="deal-pct">${esc(t('deal.pct'))}</label><input id="deal-pct" type="number" min="1" max="90" step="1" class="input" value="15" /></div>
        <div class="field"><label for="deal-hours">${esc(t('deal.hours'))}</label><input id="deal-hours" type="number" min="1" max="720" step="1" class="input" value="24" /></div>
      </div>
      <p id="deal-error" class="form-error" role="alert" hidden></p>
      <button class="btn btn-gold btn-block" type="submit">${esc(t('deal.add'))}</button>
    </form>
    <p class="eyebrow">${esc(t('deal.current'))}</p>
    <div id="deal-admin-list" class="order-list"></div>
    <p id="deal-admin-empty" class="empty-state small" hidden>${esc(t('deal.none'))}</p>`;
  $('#admin-tab-overview')?.before(panel);

  function renderAdmin() {
    const sel = $('#deal-product');
    const keep = sel.value;
    sel.innerHTML = allProducts().filter((p) => !p.partner).map((p) => `<option value="${esc(p.id)}">${esc(p.name)} (${esc(fmt(p.priceUsd))})</option>`).join('');
    if (keep) sel.value = keep;
    const list = [...deals].sort((a, b) => b.endsAt - a.endsAt);
    $('#deal-admin-empty').hidden = list.length > 0;
    $('#deal-admin-list').innerHTML = list.map((d) => {
      const p = findProduct(d.productId);
      const running = d.endsAt > Date.now();
      return `<div class="order-row"><span class="order-row-main"><span class="order-row-title">${esc(p?.name || d.productId)}</span>
        <span class="order-row-sub">${esc(t('deal.off', { pct: d.pct }))}, ${esc(running ? left(d.endsAt - Date.now()) : t('deal.ended'))}</span></span>
        <span class="order-row-side"><button class="btn btn-outline btn-sm" type="button" data-deal-del="${esc(d.id)}">${esc(t('deal.remove'))}</button></span></div>`;
    }).join('');
  }
  async function persist() {
    await ctx.save(KEY, deals);
    renderStrip(); renderAdmin(); ctx.refreshPrices();
  }
  $('#deal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pct = Math.round(Number($('#deal-pct').value));
    const hours = Number($('#deal-hours').value);
    const productId = $('#deal-product').value;
    const err = $('#deal-error');
    if (!productId || !(pct >= 1 && pct <= 90) || !(hours > 0 && hours <= 720)) { err.textContent = t('deal.err'); err.hidden = false; return; }
    err.hidden = true;
    deals = deals.filter((d) => d.productId !== productId);
    deals.push({ id: 'd' + Date.now().toString(36), productId, pct, endsAt: Date.now() + hours * 3600000 });
    await persist();
    ctx.toast(t('deal.added'));
  });
  $('#deal-admin-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-deal-del]');
    if (!b) return;
    deals = deals.filter((d) => d.id !== b.dataset.dealDel);
    await persist();
  });

  async function load() {
    const raw = await ctx.loadRaw(KEY);
    if (raw == null) {
      const end = Date.now() + 3 * 86400000;
      deals = [
        { id: 'seed1', productId: 'bv-06', pct: 20, endsAt: end },
        { id: 'seed2', productId: 'bv-12', pct: 15, endsAt: end },
        { id: 'seed3', productId: 'bv-09', pct: 10, endsAt: end },
      ].filter((d) => findProduct(d.productId));
      await ctx.save(KEY, deals);
    } else {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      deals = Array.isArray(parsed) ? parsed.filter((d) => d && d.productId && d.pct && d.endsAt) : [];
    }
    renderStrip();
  }

  return { load, priceOf, activeDeal, endsText, renderStrip, renderAdmin };
}
