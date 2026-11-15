import { PRODUCTS, BUNDLE, findProduct, allProducts } from './products.js';
import { initOrders } from './orders.js';
import { initAdmin } from './admin.js';
import { initSellers } from './sellers.js';
import { initQuickView } from './quickview.js';
import { initCatalogAdmin } from './catalog-admin.js';
import { initContact } from './contact.js';
import { initCasting } from './casting.js';
import { initInbox } from './inbox.js';
import { initBrands } from './brands.js';
import { loadPartials, translate } from './partials.js';
import { initStores } from './stores.js';

// Backup word list: used when the site runs outside the builder (e.g. on Vercel)
// or before the translations load, so raw keys like "heading.all" never show.
let FALLBACK = null;
const lookup = (key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), FALLBACK);
const fill = (str, values) => str.replace(/\{(\w+)\}/g, (m, n) => (values && values[n] != null ? String(values[n]) : m));
const t = (key, values) => {
  let v;
  try { v = window.miniappI18n?.t?.(key, values); } catch { v = undefined; }
  if (typeof v === 'string' && v && v !== key) return v;
  const raw = FALLBACK ? lookup(key) : undefined;
  return typeof raw === 'string' ? fill(raw, values) : key;
};
async function loadFallbackWords() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(new URL('./locales/en.json', import.meta.url), { signal: ctrl.signal });
    if (res.ok) FALLBACK = await res.json();
  } catch { FALLBACK = null; } finally { clearTimeout(timer); }
}
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
// Builder storage when available; on a plain website (e.g. Vercel) fall back to this
// browser's own storage so passcodes, orders and messages are still kept.
function browserStorage() {
  const pick = (opts) => (opts?.area === 'session' ? window.sessionStorage : window.localStorage);
  try { window.localStorage.setItem('bv_probe', '1'); window.localStorage.removeItem('bv_probe'); } catch { return null; }
  return {
    async getItem(key, opts) { return pick(opts).getItem(key); },
    async setItem(key, value, opts) { pick(opts).setItem(key, value); },
    async removeItem(key, opts) { pick(opts).removeItem(key); },
  };
}
const storage = window.miniappsAI?.storage || browserStorage();

const KEYS = {
  cart: 'bv_cart', orders: 'bv_orders', shipping: 'bv_shipping', sold: 'bv_sold',
  currency: 'bv_currency', buyer: 'bv_buyer', adminHash: 'bv_admin_hash', adminSession: 'bv_admin_session', adminUser: 'bv_admin_user',
};
const STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
const BRAID_RATE = 0.42;
const DEFAULT_SHIPPING = {
  freeThresholdUsd: 150,
  ngnRate: 1550,
  dispatchNote: 'Orders placed before 2pm WAT leave the studio the same day.',
  methods: [
    { id: 'lagos-same-day', name: 'Lagos Same-Day Courier', priceUsd: 8, eta: 'Same day' },
    { id: 'standard', name: 'Standard Tracked', priceUsd: 12, eta: '5–9 business days' },
    { id: 'dhl-express', name: 'DHL Express Worldwide', priceUsd: 25, eta: '2–4 business days' },
  ],
};

const state = {
  currency: 'USD', category: 'all', rail: 'fiat', cart: [], orders: [],
  shipping: structuredClone(DEFAULT_SHIPPING), sold: new Set(), buyer: {}, qvId: null, methodId: null,
};
const orderListeners = [];
let lastOrdersRaw = '';

/* ---------- helpers ---------- */
// Swap "·" separators in product text for commas (also fixes saved products).
function tidy(value) {
  return String(value ?? '').replace(/\s*·\s*/g, ', ');
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function locale() { return window.miniappI18n?.getContext?.()?.resolvedLocale || 'en'; }
function fmt(usd) {
  const ngn = state.currency === 'NGN';
  const amount = ngn ? Math.round(usd * state.shipping.ngnRate) : Math.round(usd * 100) / 100;
  const frac = !ngn && amount % 1 !== 0 ? 2 : 0;
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: ngn ? 'NGN' : 'USD', minimumFractionDigits: frac, maximumFractionDigits: frac }).format(amount);
  } catch { return (ngn ? '₦' : '$') + amount.toLocaleString(); }
}
function formatDate(ts, withTime = false) {
  try {
    return new Intl.DateTimeFormat(locale(), withTime ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(ts));
  } catch { return new Date(ts).toLocaleString(); }
}
function attachFallbacks(root = document) {
  $$('img[data-fallback]', root).forEach((img) => {
    const swap = () => { if (img.dataset.fallback && img.src !== img.dataset.fallback) img.src = img.dataset.fallback; };
    img.addEventListener('error', swap, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.src) swap();
  });
}
async function loadRaw(key, opts) {
  if (!storage) return null;
  try { return await storage.getItem(key, opts); } catch { return null; }
}
function parse(raw, fallback) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
async function load(key, fallback, opts) { return parse(await loadRaw(key, opts), fallback); }
async function save(key, value, opts) {
  if (!storage) return true;
  try { await storage.setItem(key, JSON.stringify(value), opts); return true; } catch (e) {
    toast(t(e?.code === 'STORAGE_QUOTA_EXCEEDED' ? 'error.quota' : 'error.save'));
    return false;
  }
}
async function remove(key, opts) { try { await storage?.removeItem(key, opts); } catch { /* ignore */ } }

let toastTimer = null;
function toast(message) {
  const box = $('#toast');
  $('#toast-msg').textContent = message;
  const top = $$('dialog[open]').pop();
  (top || document.body).appendChild(box);
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 3600);
}
function openDialog(d) { if (!d.open) d.showModal(); }
function closeDialog(d) { if (d.open) d.close(); }

/* ---------- orders shared API ---------- */
function notifyOrders() { orderListeners.forEach((fn) => fn()); updateOrderBadges(); }
async function saveOrders() {
  lastOrdersRaw = JSON.stringify(state.orders);
  const ok = await save(KEYS.orders, state.orders);
  notifyOrders();
  return ok;
}
async function updateOrder(id, mutate) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) return false;
  mutate(order);
  return saveOrders();
}
async function addMessage(id, from, text) {
  return updateOrder(id, (o) => {
    o.messages = o.messages || [];
    o.messages.push({ from, text: text.slice(0, 600), at: Date.now() });
    if (from === 'buyer') o.unreadAdmin = (o.unreadAdmin || 0) + 1;
    else o.unreadBuyer = (o.unreadBuyer || 0) + 1;
  });
}
function messageText(m) {
  if (m.from !== 'system') return m.text || '';
  const vars = { ...(m.vars || {}) };
  if (vars.status) vars.status = t('status.' + vars.status);
  if (!vars.tracking) vars.tracking = t('common.none');
  return t(m.key || 'chat.sys.placed', vars);
}
function renderChat(container, order, viewer) {
  const msgs = order.messages || [];
  if (!msgs.length) {
    container.innerHTML = `<p class="chat-empty">${esc(t(viewer === 'buyer' ? 'chat.emptyBuyer' : 'chat.emptyAdmin'))}</p>`;
    return;
  }
  container.innerHTML = msgs.map((m) => {
    if (m.from === 'system') return `<div class="msg msg-system">${esc(messageText(m))}</div>`;
    const mine = m.from === viewer;
    const who = mine ? t('chat.you') : m.from === 'merchant' ? t('chat.merchant') : (order.customer?.name || t('chat.buyer'));
    return `<div class="msg ${mine ? 'msg-mine' : 'msg-theirs'}"><span class="msg-meta">${esc(who)}, ${esc(formatDate(m.at, true))}</span><span>${esc(m.text)}</span></div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}
function updateOrderBadges() {
  const buyerUnread = state.orders.reduce((s, o) => s + (o.unreadBuyer || 0), 0);
  const badge = $('#orders-badge');
  badge.hidden = buyerUnread === 0;
  badge.textContent = String(buyerUnread);
}
function statusChip(el, status) {
  el.className = `status-chip status-${status}`;
  el.textContent = t('status.' + status);
}

/* ---------- catalog ---------- */
const isSold = (p) => state.sold.has(p.id) || (!p.oneOfOne && p.stock != null && p.stock <= 0);
const inCart = (id) => state.cart.some((i) => i.id === id);
const unavailable = (p) => isSold(p) || (p.oneOfOne && inCart(p.id));
const cartQty = (id) => state.cart.filter((l) => l.id === id).reduce((s, l) => s + l.qty, 0);

function setCategory(cat) {
  state.category = cat;
  $('#catalog-heading').textContent = t('heading.' + cat);
  $$('[data-cat]').forEach((b) => {
    const active = b.dataset.cat === cat;
    b.classList.toggle('is-active', active);
    if (b.classList.contains('pill')) b.setAttribute('aria-pressed', String(active));
  });
  renderProducts();
}
function renderCounts() {
  const all = allProducts();
  $$('[data-count]').forEach((el) => {
    const c = el.dataset.count;
    el.textContent = `(${all.filter((p) => matchesCategory(p, c)).length})`;
  });
}
function matchesCategory(p, cat) {
  if (cat === 'all') return true;
  if (cat === 'partners') return !!p.partner;
  return p.category === cat;
}
function renderProducts() {
  const list = allProducts().filter((p) => matchesCategory(p, state.category));
  const grid = $('#product-grid');
  $('#grid-empty').hidden = list.length > 0;
  grid.innerHTML = list.map((p) => {
    const sold = isSold(p);
    const held = p.oneOfOne && inCart(p.id);
    const unav = sold || held;
    const label = sold ? t('card.soldOut') : held ? t('card.inBag') : t('card.add');
    return `<article class="card ${unav ? 'is-unavailable' : ''}">
      <button class="card-media" type="button" data-qv="${p.id}" aria-label="${esc(t('card.inspectAria', { name: p.name }))}">
        <img src="${esc(p.image)}" data-fallback="${esc(p.fallback)}" alt="${esc(p.name)}" loading="lazy" />
        <span class="card-tags"><span class="tag tag-${p.tag}">${esc(t('tag.' + p.tag))}</span>${unav ? `<span class="tag tag-dark">${esc(t(sold ? 'card.archived' : 'card.reserved'))}</span>` : ''}</span>
        <span class="card-hover">${esc(t('card.inspect'))}</span>
      </button>
      <div class="card-body">
        <div class="card-meta"><span>${esc(tidy(p.era))}</span><span>${esc(t('cat.' + p.category))}</span></div>
        <h3 class="card-title"><button class="link-btn" type="button" data-qv="${p.id}">${esc(p.name)}</button></h3>
        <p class="card-desc">${esc(tidy(p.measurements))}</p>
        ${!sold && !p.oneOfOne && p.stock != null && p.stock <= 5 ? `<p class="stock-note">${esc(t('qv.onlyLeft', { n: p.stock }))}</p>` : ''}
        <div class="card-foot"><span class="price-wrap"><span class="price">${esc(fmt(p.priceUsd))}</span>${p.compareUsd > p.priceUsd ? `<span class="strike">${esc(fmt(p.compareUsd))}</span>` : ''}</span>
          <button class="btn btn-primary btn-sm" type="button" data-add="${p.id}" ${unav ? 'disabled' : ''}>${esc(label)}</button></div>
      </div></article>`;
  }).join('');
  attachFallbacks(grid);
}

/* ---------- cart ---------- */
function cartLines() {
  return state.cart.map((line) => ({ ...line, product: findProduct(line.id) })).filter((l) => l.product);
}
function subtotalUsd() { return cartLines().reduce((s, l) => s + l.product.priceUsd * l.qty, 0); }
function persistCart() { save(KEYS.cart, state.cart); }

function addToCart(id, shade, openBag = true) {
  const p = findProduct(id);
  if (!p || isSold(p)) return;
  if (p.oneOfOne) {
    if (inCart(id)) { toast(t('toast.alreadyHeld')); return; }
    state.cart.push({ id, qty: 1, shade: null });
  } else {
    if (p.stock != null && cartQty(id) >= p.stock) { toast(t('toast.stockLimit', { n: p.stock })); return; }
    const variant = shade || (p.shades ? p.shades[0] : p.variant || null);
    const existing = state.cart.find((l) => l.id === id && l.shade === variant);
    if (existing) existing.qty += 1; else state.cart.push({ id, qty: 1, shade: variant });
  }
  persistCart(); renderProducts(); renderCart();
  toast(t('toast.added', { name: p.name }));
  if (openBag) openDialog($('#cart-dialog'));
}
function addBundle(openBag = true) {
  addToCart(BUNDLE.id, BUNDLE.variant, false);
  if (openBag) openDialog($('#cart-dialog'));
}
function renderCart() {
  const lines = cartLines();
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  const sub = subtotalUsd();
  const threshold = Number(state.shipping.freeThresholdUsd) || 0;
  $('#cart-count').textContent = String(qty);
  $('#cart-subtotal').textContent = fmt(sub);
  $('#btn-checkout').disabled = lines.length === 0;
  $('#btn-cart-ask').hidden = lines.length === 0;
  const pct = threshold > 0 ? Math.min(100, Math.round((sub / threshold) * 100)) : 100;
  $('#ship-progress-bar').style.width = pct + '%';
  $('#ship-progress-pct').textContent = pct + '%';
  $('#ship-progress-text').textContent = sub >= threshold ? t('cart.freeUnlocked') : t('cart.freeRemaining', { amount: fmt(threshold - sub) });
  $('#cart-empty').hidden = lines.length > 0;
  const box = $('#cart-items');
  box.innerHTML = lines.map((l, i) => `<div class="cart-item">
      <img src="${esc(l.product.image)}" data-fallback="${esc(l.product.fallback)}" alt="" />
      <div class="cart-item-body">
        <div class="row-between"><p class="cart-item-name">${esc(l.product.name)}</p>
          <button class="remove-btn" type="button" data-remove="${i}" aria-label="${esc(t('cart.remove'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
        <p class="small muted">${esc(l.product.oneOfOne ? t('cart.oneOfOne') : l.shade || '')}</p>
        <div class="cart-item-foot"><span class="strong small">${esc(fmt(l.product.priceUsd * l.qty))}</span>
          ${l.product.oneOfOne ? `<span class="tag tag-archive">${esc(t('cart.held'))}</span>` : `<div class="qty">
            <button type="button" data-dec="${i}" aria-label="${esc(t('cart.decrease'))}">−</button><span>${l.qty}</span>
            <button type="button" data-inc="${i}" aria-label="${esc(t('cart.increase'))}">+</button></div>`}
        </div>
      </div></div>`).join('');
  attachFallbacks(box);
}
function changeQty(i, delta) {
  const line = state.cart[i];
  if (!line) return;
  if (delta > 0) {
    const p = findProduct(line.id);
    if (p && p.stock != null && cartQty(line.id) >= p.stock) { toast(t('toast.stockLimit', { n: p.stock })); return; }
  }
  line.qty += delta;
  if (line.qty <= 0) state.cart.splice(i, 1);
  persistCart(); renderProducts(); renderCart();
}
function pruneCart() {
  const before = state.cart.length;
  state.cart = state.cart.filter((l) => findProduct(l.id));
  if (state.cart.length !== before) { persistCart(); renderCart(); }
}

/* ---------- checkout ---------- */
function currentMethod() {
  const methods = state.shipping.methods || [];
  return methods.find((m) => m.id === state.methodId) || methods[0] || null;
}
function computeTotals() {
  const sub = subtotalUsd();
  const m = currentMethod();
  const free = sub >= (Number(state.shipping.freeThresholdUsd) || 0);
  const ship = !m || free ? 0 : Number(m.priceUsd) || 0;
  const discount = state.rail === 'braid' ? (sub + ship) * 0.05 : 0;
  return { sub, ship, discount, total: sub + ship - discount };
}
function renderCheckoutTotals() {
  const { sub, ship, discount, total } = computeTotals();
  $('#chk-subtotal').textContent = fmt(sub);
  $('#chk-shipping').textContent = ship === 0 ? t('chk.free') : fmt(ship);
  $('#chk-discount-row').hidden = discount === 0;
  $('#chk-discount').textContent = '−' + fmt(discount);
  $('#chk-total').textContent = fmt(total);
  const tokens = $('#chk-tokens');
  tokens.hidden = state.rail !== 'braid';
  tokens.textContent = t('chk.tokens', { n: (total / BRAID_RATE).toFixed(2) });
}
function renderMethods() {
  const methods = state.shipping.methods || [];
  if (!methods.some((m) => m.id === state.methodId)) state.methodId = methods[0]?.id || null;
  const free = subtotalUsd() >= (Number(state.shipping.freeThresholdUsd) || 0);
  $('#chk-methods').innerHTML = methods.length ? methods.map((m) => `<label class="method">
      <input type="radio" name="ship-method" value="${esc(m.id)}" ${m.id === state.methodId ? 'checked' : ''} />
      <span class="method-info"><span class="method-name">${esc(m.name)}</span><span class="small muted">${esc(m.eta)}</span></span>
      <span class="strong small">${esc(free ? t('chk.free') : fmt(Number(m.priceUsd) || 0))}</span></label>`).join('')
    : `<p class="small muted">${esc(t('chk.noMethods'))}</p>`;
  const note = state.shipping.dispatchNote || '';
  $('#chk-dispatch-note').textContent = note;
  $('#chk-dispatch-note').hidden = !note;
}
function setRail(rail) {
  state.rail = rail;
  $$('[data-rail]').forEach((b) => { const a = b.dataset.rail === rail; b.classList.toggle('is-active', a); b.setAttribute('aria-pressed', String(a)); });
  $('#rail-panel-fiat').hidden = rail !== 'fiat';
  $('#rail-panel-braid').hidden = rail !== 'braid';
  renderCheckoutTotals();
}
function openCheckout() {
  if (!state.cart.length) return;
  closeDialog($('#cart-dialog'));
  const b = state.buyer || {};
  $('#chk-name').value = b.name || ''; $('#chk-email').value = b.email || ''; $('#chk-phone').value = b.phone || '';
  $('#chk-address').value = b.address || ''; $('#chk-city').value = b.city || ''; $('#chk-country').value = b.country || '';
  $('#chk-error').hidden = true;
  $$('#checkout-form .input').forEach((i) => i.classList.remove('is-invalid'));
  renderMethods(); setRail(state.rail);
  openDialog($('#checkout-dialog'));
}
function nextOrderId() {
  const max = state.orders.reduce((m, o) => Math.max(m, parseInt(String(o.id).replace(/\D/g, ''), 10) || 0), 1040);
  return 'BV-' + (max + 1);
}
// Direct-to-merchant messaging (WhatsApp first, Telegram as backup).
function bagLinesText() {
  return cartLines().map((l) => `- ${l.product.name}${!l.product.oneOfOne && l.shade ? ` (${l.shade})` : ''} x${l.qty}: ${fmt(l.product.priceUsd * l.qty)}`).join('\n');
}
function openMerchant(text) {
  const links = contactUI?.publicLinks(text) || {};
  const url = links.wa || links.tg;
  if (!url) return false;
  // Open in a new tab; if the browser blocks it, fall back to a normal link tap.
  let win = null;
  try { win = window.open(url, '_blank'); } catch { win = null; }
  if (!win) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  } else { try { win.opener = null; } catch { /* ignore */ } }
  return true;
}
function askMerchant() {
  if (!state.cart.length) return;
  const text = t('msg.askBag', { items: bagLinesText(), total: fmt(subtotalUsd()) });
  if (!openMerchant(text)) { toast(t('msg.noContact')); }
}
async function submitCheckout(e) {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const fields = { name: v('#chk-name'), email: v('#chk-email'), phone: v('#chk-phone'), address: v('#chk-address'), city: v('#chk-city'), country: v('#chk-country') };
  const err = $('#chk-error');
  const required = ['name', 'email', 'address', 'city', 'country'];
  let bad = required.filter((k) => !fields[k]);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email);
  $$('#checkout-form .input').forEach((i) => i.classList.remove('is-invalid'));
  bad.forEach((k) => $('#chk-' + k).classList.add('is-invalid'));
  if (bad.length) { err.textContent = t('chk.errRequired'); err.hidden = false; return; }
  if (!emailOk) { $('#chk-email').classList.add('is-invalid'); err.textContent = t('chk.errEmail'); err.hidden = false; return; }
  const method = currentMethod();
  if (!method) { err.textContent = t('chk.noMethods'); err.hidden = false; return; }
  err.hidden = true;
  const btn = $('#chk-submit'); btn.disabled = true;

  const totals = computeTotals();
  const id = nextOrderId();
  const note = $('#chk-note').value.trim();
  // Open WhatsApp right away (inside the tap) so the browser doesn't block it.
  if ($('#chk-send-wa').checked) {
    const waText = t('msg.order', {
      id, items: bagLinesText(), total: fmt(totals.total), method: method.name,
      name: fields.name, phone: fields.phone || fields.email,
      address: [fields.address, fields.city, fields.country].join(', '),
      note: note || t('msg.noNote'),
    });
    openMerchant(waText);
  }
  const order = {
    id, createdAt: Date.now(), status: 'placed', rail: state.rail,
    items: cartLines().map((l) => ({ id: l.id, name: l.product.name, image: l.product.image, shade: l.product.oneOfOne ? null : l.shade, qty: l.qty, priceUsd: l.product.priceUsd })),
    subtotalUsd: totals.sub, shippingUsd: totals.ship, discountUsd: totals.discount, totalUsd: totals.total,
    customer: { name: fields.name, email: fields.email, phone: fields.phone },
    shipping: { address: fields.address, city: fields.city, country: fields.country, methodId: method.id, methodName: method.name, carrier: '', tracking: '' },
    note,
    messages: [{ from: 'system', key: 'chat.sys.placed', vars: { id }, at: Date.now() }],
    unreadAdmin: 1, unreadBuyer: 0,
  };
  if (note) order.messages.push({ from: 'buyer', text: note, at: Date.now() });
  const stockLines = cartLines().map((l) => ({ id: l.id, qty: l.qty }));
  cartLines().forEach((l) => { if (l.product.oneOfOne) state.sold.add(l.id); });
  state.orders.push(order);
  state.buyer = { ...fields };
  state.cart = [];
  $('#chk-note').value = '';
  await Promise.all([saveOrders(), save(KEYS.sold, [...state.sold]), save(KEYS.cart, []), save(KEYS.buyer, state.buyer)]);
  await catalogAdmin.consumeStock(stockLines);
  btn.disabled = false;
  renderProducts(); renderCart();
  closeDialog($('#checkout-dialog'));
  ordersUI.open(id);
  toast(t('toast.orderPlaced', { id }));
}

/* ---------- currency, shipping, countdown ---------- */
function renderPriceLabels() {
  $$('.bundle-price').forEach((el) => { el.textContent = fmt(BUNDLE.priceUsd); });
  $('#bundle-compare').textContent = t('bundle.compare', { amount: fmt(BUNDLE.compareUsd) });
  $('#announce-ship').textContent = t('announce.freeShip', { amount: fmt(Number(state.shipping.freeThresholdUsd) || 0) });
}
function setCurrency(cur, persist = true) {
  state.currency = cur;
  [['#btn-usd', 'USD'], ['#btn-ngn', 'NGN']].forEach(([sel, c]) => {
    $(sel).classList.toggle('is-active', c === cur); $(sel).setAttribute('aria-pressed', String(c === cur));
  });
  if (persist) save(KEYS.currency, cur, { sync: false });
  refreshPrices();
}
function refreshPrices() {
  renderPriceLabels(); renderProducts(); renderCart();
  if ($('#checkout-dialog').open) { renderMethods(); renderCheckoutTotals(); }
  quickView.refresh();
  notifyOrders();
}
async function saveShipping(settings) {
  state.shipping = settings;
  const ok = await save(KEYS.shipping, settings);
  refreshPrices();
  return ok;
}
async function restoreStock() {
  state.sold.clear();
  await save(KEYS.sold, []);
  renderProducts();
  catalogAdmin.render();
}
function startCountdown() {
  const el = $('#drop-countdown');
  const tick = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(18, 0, 0, 0);
    target.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
    if (target <= now) target.setDate(target.getDate() + 7);
    let s = Math.floor((target - now) / 1000);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    const p = (n) => String(n).padStart(2, '0');
    el.textContent = t('announce.countdown', { d: p(d), h: p(h), m: p(m), s: p(s) });
  };
  tick(); setInterval(tick, 1000);
}

/* ---------- seed & load ---------- */
function seedOrders() {
  const at = Date.now() - 2 * 86400000;
  return [{
    id: 'BV-1041', createdAt: at, status: 'processing', rail: 'fiat',
    items: [
      { id: 'bv-06', name: PRODUCTS[5].name, image: PRODUCTS[5].image, shade: 'Crushed Berry', qty: 1, priceUsd: 34 },
      { id: 'bv-09', name: PRODUCTS[8].name, image: PRODUCTS[8].image, shade: 'Havana Tortoise', qty: 1, priceUsd: 26 },
    ],
    subtotalUsd: 60, shippingUsd: 8, discountUsd: 0, totalUsd: 68,
    customer: { name: 'Amara Okafor', email: 'amara@email.com', phone: '' },
    shipping: { address: '14 Adeola Odeku St, Victoria Island', city: 'Lagos', country: 'Nigeria', methodId: 'lagos-same-day', methodName: 'Lagos Same-Day Courier', carrier: '', tracking: '' },
    note: '',
    messages: [
      { from: 'system', key: 'chat.sys.placed', vars: { id: 'BV-1041' }, at },
      { from: 'buyer', text: 'Hi! Can the courier deliver after 5pm? I work on the Island until then.', at: at + 3600000 },
      { from: 'merchant', text: 'Hello Amara — absolutely. We have booked an evening slot (5–8pm) for you. Your lip oil is wrapped and ready.', at: at + 7200000 },
    ],
    unreadAdmin: 0, unreadBuyer: 1,
  }];
}
async function loadState() {
  const [cart, ordersRaw, shipping, sold, currency, buyer] = await Promise.all([
    load(KEYS.cart, []), loadRaw(KEYS.orders), load(KEYS.shipping, null), load(KEYS.sold, []), load(KEYS.currency, 'USD', { sync: false }), load(KEYS.buyer, {}),
  ]);
  state.cart = Array.isArray(cart) ? cart.filter((l) => l && findProduct(l.id) && l.qty > 0) : [];
  state.sold = new Set(Array.isArray(sold) ? sold : []);
  state.buyer = buyer && typeof buyer === 'object' ? buyer : {};
  if (shipping && typeof shipping === 'object') {
    state.shipping = { ...structuredClone(DEFAULT_SHIPPING), ...shipping };
    if (!Array.isArray(state.shipping.methods)) state.shipping.methods = structuredClone(DEFAULT_SHIPPING.methods);
  }
  if (ordersRaw == null) {
    state.orders = seedOrders();
    await saveOrders();
  } else {
    const parsed = parse(ordersRaw, []);
    state.orders = Array.isArray(parsed) ? parsed : [];
    // Remove the old fake sample phone so "WhatsApp the buyer" never opens it.
    let cleaned = false;
    state.orders.forEach((o) => {
      if (o?.customer && String(o.customer.phone || '').replace(/\D/g, '') === '2348012345678') { o.customer.phone = ''; cleaned = true; }
    });
    if (cleaned) await saveOrders();
    lastOrdersRaw = JSON.stringify(state.orders);
  }
  state.currency = currency === 'NGN' ? 'NGN' : 'USD';
}
async function pollOrders() {
  if (!$('#orders-dialog').open && !$('#admin-dialog').open) return;
  const raw = await loadRaw(KEYS.orders);
  if (raw == null) return;
  const parsed = parse(raw, null);
  if (!Array.isArray(parsed)) return;
  const normalized = JSON.stringify(parsed);
  if (normalized === lastOrdersRaw) return;
  lastOrdersRaw = normalized;
  state.orders = parsed;
  notifyOrders();
}

/* ---------- wiring ---------- */
await loadFallbackWords();
if (!window.miniappI18n) translate(document, t);
loadPartials(t);
const ctx = {
  t, esc, fmt, formatDate, toast, openDialog, closeDialog, state, KEYS, STATUSES,
  load, loadRaw, save, remove, saveOrders, updateOrder, addMessage, renderChat, statusChip, attachFallbacks,
  saveShipping, restoreStock, onOrdersChange: (fn) => orderListeners.push(fn),
  refreshCatalog: () => { renderCounts(); renderProducts(); }, pruneCart,
  isSold, unavailable, addToCart, addBundle,
};
const ordersUI = initOrders(ctx);
const sellersUI = initSellers(ctx);
ctx.sellers = sellersUI;
const quickView = initQuickView(ctx);
ctx.quickView = quickView;
const catalogAdmin = initCatalogAdmin(ctx);
ctx.catalogAdmin = catalogAdmin;
const contactUI = initContact(ctx);
ctx.contact = contactUI;
const castingUI = initCasting(ctx);
ctx.casting = castingUI;
initBrands(ctx);
initStores(ctx);
const inboxUI = initInbox(ctx);
ctx.inbox = inboxUI;
const adminUI = initAdmin(ctx);
ctx.admin = adminUI;

function bindEvents() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-cat],[data-jump],[data-qv],[data-add],[data-inc],[data-dec],[data-remove],.js-add-bundle,[data-close],[data-rail]');
    if (!el) return;
    if (el.matches('[data-close]')) { closeDialog(el.closest('dialog')); return; }
    if (el.dataset.cat) { setCategory(el.dataset.cat); return; }
    if (el.dataset.jump) { setCategory(el.dataset.jump); $('#catalog').scrollIntoView({ behavior: 'smooth' }); return; }
    if (el.dataset.qv) { quickView.open(el.dataset.qv); return; }
    if (el.dataset.add) { addToCart(el.dataset.add); return; }
    if (el.dataset.inc) { changeQty(+el.dataset.inc, 1); return; }
    if (el.dataset.dec) { changeQty(+el.dataset.dec, -1); return; }
    if (el.dataset.remove) { changeQty(+el.dataset.remove, -Infinity); return; }
    if (el.dataset.rail) { setRail(el.dataset.rail); return; }
    if (el.matches('.js-add-bundle')) addBundle(true);
  });
  $$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
  $('#brand-home').addEventListener('click', () => { setCategory('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $$('[data-proxy]').forEach((b) => b.addEventListener('click', () => $('#' + b.dataset.proxy)?.click()));
  const mirrorBadge = (srcSel, dstSel) => {
    const src = $(srcSel); const dst = $(dstSel);
    if (!src || !dst) return;
    const sync = () => {
      const txt = src.textContent.trim();
      dst.textContent = txt;
      dst.hidden = src.hidden || !txt || txt === '0';
    };
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true, attributes: true });
    sync();
  };
  mirrorBadge('#cart-count', '#tb-cart-count');
  mirrorBadge('#orders-badge', '#tb-orders-badge');
  const shopTab = $('#tb-shop');
  if (shopTab) shopTab.addEventListener('click', () => { setCategory('all'); $('#catalog').scrollIntoView({ behavior: 'smooth' }); });
  $('#btn-usd').addEventListener('click', () => setCurrency('USD'));
  $('#btn-ngn').addEventListener('click', () => setCurrency('NGN'));
  $('#btn-bag').addEventListener('click', () => openDialog($('#cart-dialog')));
  $('#btn-orders').addEventListener('click', () => ordersUI.open());
  $('#footer-chat').addEventListener('click', () => inboxUI.open());
  $('#btn-admin').addEventListener('click', () => adminUI.open());
  $('#cart-browse').addEventListener('click', () => { closeDialog($('#cart-dialog')); setCategory('all'); $('#catalog').scrollIntoView({ behavior: 'smooth' }); });
  $('#btn-checkout').addEventListener('click', openCheckout);
  $('#btn-cart-ask').addEventListener('click', askMerchant);
  $('#chk-methods').addEventListener('change', (e) => {
    if (e.target.name === 'ship-method') { state.methodId = e.target.value; renderCheckoutTotals(); }
  });
  $('#checkout-form').addEventListener('submit', submitCheckout);
}

async function boot() {
  bindEvents();
  attachFallbacks();
  renderCounts();
  $('#catalog-heading').textContent = t('heading.all');
  startCountdown();
  await catalogAdmin.load();
  await sellersUI.load();
  await contactUI.load();
  await castingUI.load();
  await loadState();
  await inboxUI.load();
  renderCounts();
  setCurrency(state.currency, false);
  setCategory(state.category);
  updateOrderBadges();
  setInterval(pollOrders, 5000);
}
boot();
