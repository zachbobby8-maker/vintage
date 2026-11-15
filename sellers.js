// Feature: "Own a store" — seller applications, partner products and admin review.
import { setPartnerProducts } from './products.js';

const KEY_SELLERS = 'bv_sellers';
const KEY_MINE = 'bv_my_stores';
const MAX_PRODUCTS = 4;
const CATEGORIES = ['vanity', 'beauty', 'bags', 'couture', 'watches'];
const placeholder = (text) => `https://placehold.co/600x750/F3EDE3/1A1715?text=${encodeURIComponent(text || 'Braid Partner')}`;

function seedSellers() {
  const at = Date.now() - 5 * 86400000;
  return [
    {
      id: 'st-adunni', createdAt: at, status: 'approved', storeName: 'Adunni Braid Studio', owner: 'Adunni Bello',
      email: 'hello@adunnibraids.ng', phone: '+234 803 555 0192', city: 'Lagos', category: 'vanity',
      about: 'Hand-finished braid jewellery and silk hair wraps made in our Yaba studio.',
      products: [
        { name: 'Cowrie & Gold Braid Cuff Set', priceUsd: 18, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80', description: 'Set of 12 gold-tone cuffs with natural cowrie charms. Fits medium to jumbo braids.' },
        { name: 'Hand-Wrapped Silk Braid Scarf', priceUsd: 32, image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80', description: '100% mulberry silk, 90 × 90 cm. Protects braids overnight and styles as a head wrap.' },
      ],
    },
    {
      id: 'st-kemi', createdAt: Date.now() - 86400000, status: 'pending', storeName: 'Kemi Beads Atelier', owner: 'Kemi Adeyemi',
      email: 'kemi@beadsatelier.com', phone: '+234 806 222 4410', city: 'Ibadan', category: 'vanity',
      about: 'Traditional waist beads and hair beads strung by hand.',
      products: [{ name: 'Coral Waist Bead Strand', priceUsd: 22, image: '', description: 'Adjustable tie strand with coral and gold glass beads.' }],
    },
  ];
}

export function initSellers(ctx) {
  const { t, esc, fmt, formatDate, toast } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const dialog = $('#sell-dialog');
  const form = $('#sell-form');
  let sellers = [];
  let mine = [];
  let drafts = [];

  /* ---------- data ---------- */
  function toProducts() {
    const list = [];
    sellers.filter((s) => s.status === 'approved').forEach((s) => {
      (s.products || []).forEach((p, i) => {
        list.push({
          id: `ps-${s.id}-${i}`, category: CATEGORIES.includes(s.category) ? s.category : 'vanity', tag: 'partner',
          oneOfOne: false, partner: true, storeId: s.id, priceUsd: Number(p.priceUsd) || 0, name: p.name,
          era: t('sell.byStore', { store: s.storeName, city: s.city }), measurements: p.description || s.about || '',
          condition: t('sell.partnerCondition', { store: s.storeName }),
          image: p.image || placeholder(p.name), fallback: placeholder(p.name), shades: null, variant: s.storeName,
        });
      });
    });
    setPartnerProducts(list);
  }
  async function load() {
    const raw = await ctx.loadRaw(KEY_SELLERS);
    if (raw == null) { sellers = seedSellers(); await ctx.save(KEY_SELLERS, sellers); } else {
      try { const parsed = JSON.parse(raw); sellers = Array.isArray(parsed) ? parsed : []; } catch { sellers = []; }
    }
    const m = await ctx.load(KEY_MINE, []);
    mine = Array.isArray(m) ? m : [];
    toProducts();
    renderSection();
    renderAdminBadge();
  }
  async function persist() {
    const ok = await ctx.save(KEY_SELLERS, sellers);
    toProducts();
    ctx.refreshCatalog();
    renderSection();
    renderAdminBadge();
    return ok;
  }

  /* ---------- public section ---------- */
  function renderSection() {
    const approved = sellers.filter((s) => s.status === 'approved');
    $('#sell-stores-wrap').hidden = approved.length === 0;
    $('#sell-stores').innerHTML = approved.map((s) => `<div class="store-chip">
      <span class="store-initial" aria-hidden="true">${esc((s.storeName || '?').charAt(0).toUpperCase())}</span>
      <span class="store-info"><span class="strong">${esc(s.storeName)}</span><span class="small">${esc(s.city)} · ${esc(t('sell.productCount', { n: (s.products || []).length }))}</span></span></div>`).join('');
    $('#sell-status-btn').hidden = !mine.some((id) => sellers.some((s) => s.id === id));
  }

  /* ---------- application form ---------- */
  function emptyDraft() { return { name: '', priceUsd: '', image: '', description: '' }; }
  function readDrafts() {
    document.querySelectorAll('#sell-products .sell-product').forEach((row, i) => {
      if (!drafts[i]) return;
      drafts[i] = {
        name: row.querySelector('[data-f="name"]').value.trim(),
        priceUsd: row.querySelector('[data-f="price"]').value,
        image: row.querySelector('[data-f="image"]').value.trim(),
        description: row.querySelector('[data-f="desc"]').value.trim(),
      };
    });
  }
  function renderDrafts() {
    $('#sell-products').innerHTML = drafts.map((d, i) => `<div class="sell-product">
      <div class="row-between"><p class="eyebrow">${esc(t('sell.productN', { n: i + 1 }))}</p>
        ${drafts.length > 1 ? `<button class="remove-btn" type="button" data-remove-draft="${i}" aria-label="${esc(t('sell.removeProduct', { n: i + 1 }))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` : ''}</div>
      <div class="form-grid">
        <div class="field span-2"><label for="sp-name-${i}">${esc(t('sell.pName'))}</label><input id="sp-name-${i}" data-f="name" class="input" maxlength="80" value="${esc(d.name)}" placeholder="${esc(t('sell.pNamePh'))}" /></div>
        <div class="field"><label for="sp-price-${i}">${esc(t('sell.pPrice'))}</label><input id="sp-price-${i}" data-f="price" type="number" min="1" step="1" class="input" value="${esc(d.priceUsd)}" placeholder="25" /></div>
        <div class="field"><label for="sp-img-${i}">${esc(t('sell.pImage'))}</label><input id="sp-img-${i}" data-f="image" type="url" class="input" value="${esc(d.image)}" placeholder="https://…" /></div>
        <div class="field span-2"><label for="sp-desc-${i}">${esc(t('sell.pDesc'))}</label><input id="sp-desc-${i}" data-f="desc" class="input" maxlength="200" value="${esc(d.description)}" placeholder="${esc(t('sell.pDescPh'))}" /></div>
      </div></div>`).join('');
    $('#sell-add-product').hidden = drafts.length >= MAX_PRODUCTS;
  }
  function showForm() {
    form.reset();
    drafts = [emptyDraft()];
    renderDrafts();
    $('#sell-error').hidden = true;
    $('#sell-mine').hidden = true;
    form.hidden = false;
  }
  function showMine() {
    const list = sellers.filter((s) => mine.includes(s.id)).sort((a, b) => b.createdAt - a.createdAt);
    $('#sell-mine-list').innerHTML = list.map((s) => `<div class="panel">
      <div class="row-between"><div><p class="strong">${esc(s.storeName)}</p><p class="small muted">${esc(formatDate(s.createdAt))} · ${esc(t('sell.productCount', { n: (s.products || []).length }))}</p></div>
      <span class="status-chip status-${esc(s.status)}">${esc(t('sell.status.' + s.status))}</span></div>
      <p class="small">${esc(t('sell.statusText.' + s.status))}</p></div>`).join('');
    form.hidden = true;
    $('#sell-mine').hidden = false;
  }
  function open(view) {
    ctx.openDialog(dialog);
    if (view === 'mine' && mine.length) showMine(); else showForm();
  }
  async function submit(e) {
    e.preventDefault();
    readDrafts();
    const v = (id) => $(id).value.trim();
    const app = { storeName: v('#sell-store'), owner: v('#sell-owner'), email: v('#sell-email'), phone: v('#sell-phone'), city: v('#sell-city'), category: $('#sell-category').value, about: v('#sell-about') };
    const err = $('#sell-error');
    const fail = (key) => { err.textContent = t(key); err.hidden = false; };
    if (!app.storeName || !app.owner || !app.email || !app.city) return fail('sell.errRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app.email)) return fail('chk.errEmail');
    const products = drafts.filter((d) => d.name || d.priceUsd).map((d) => ({ name: d.name, priceUsd: Number(d.priceUsd), image: d.image, description: d.description }));
    if (!products.length) return fail('sell.errProducts');
    if (products.some((p) => !p.name || !(p.priceUsd > 0))) return fail('sell.errProduct');
    if (products.some((p) => p.image && !/^https:\/\//i.test(p.image))) return fail('sell.errImage');
    if (!$('#sell-agree').checked) return fail('sell.errAgree');
    err.hidden = true;
    const btn = $('#sell-submit'); btn.disabled = true;
    const record = { id: 'st-' + Date.now().toString(36), createdAt: Date.now(), status: 'pending', ...app, products };
    sellers.push(record);
    mine.push(record.id);
    const ok = await persist();
    await ctx.save(KEY_MINE, mine);
    btn.disabled = false;
    if (!ok) { sellers = sellers.filter((s) => s.id !== record.id); mine = mine.filter((id) => id !== record.id); return; }
    renderSection();
    showMine();
    toast(t('sell.submitted', { store: record.storeName }));
  }

  /* ---------- admin review ---------- */
  function renderAdminBadge() {
    const pending = sellers.filter((s) => s.status === 'pending').length;
    const badge = $('#admin-sellers-count');
    badge.hidden = pending === 0;
    badge.textContent = String(pending);
  }
  function renderAdmin() {
    const filter = $('#as-filter').value;
    const list = sellers.filter((s) => filter === 'all' || s.status === filter).sort((a, b) => b.createdAt - a.createdAt);
    $('#as-empty').hidden = list.length > 0;
    $('#as-list').innerHTML = list.map((s) => `<article class="panel seller-card">
      <div class="od-head"><div><p class="eyebrow">${esc(formatDate(s.createdAt))} · ${esc(t('cat.' + s.category))}</p><h4 class="display h4">${esc(s.storeName)}</h4>
        <p class="small muted">${esc([s.owner, s.email, s.phone, s.city].filter(Boolean).join(' · '))}</p></div>
        <span class="status-chip status-${esc(s.status)}">${esc(t('sell.status.' + s.status))}</span></div>
      ${s.about ? `<p class="small">${esc(s.about)}</p>` : ''}
      <div class="mini-items">${(s.products || []).map((p) => `<div class="mini-item"><img src="${esc(p.image || placeholder(p.name))}" data-fallback="${esc(placeholder(p.name))}" alt="" />
        <div class="mini-item-main"><p class="strong">${esc(p.name)}</p><p class="muted">${esc(p.description || '')}</p></div><span class="strong">${esc(fmt(Number(p.priceUsd) || 0))}</span></div>`).join('')}</div>
      <div class="row">
        ${s.status !== 'approved' ? `<button class="btn btn-primary btn-sm" type="button" data-seller-act="approved" data-id="${esc(s.id)}">${esc(t('sell.approve'))}</button>` : ''}
        ${s.status !== 'rejected' ? `<button class="btn btn-outline btn-sm" type="button" data-seller-act="rejected" data-id="${esc(s.id)}">${esc(s.status === 'approved' ? t('sell.unpublish') : t('sell.reject'))}</button>` : ''}
        <button class="btn btn-outline btn-sm" type="button" data-seller-act="delete" data-id="${esc(s.id)}">${esc(t('sell.delete'))}</button>
      </div></article>`).join('');
    ctx.attachFallbacks($('#as-list'));
  }
  async function adminAction(id, act) {
    const s = sellers.find((x) => x.id === id);
    if (!s) return;
    if (act === 'delete') {
      if (!window.confirm(t('sell.confirmDelete', { store: s.storeName }))) return;
      sellers = sellers.filter((x) => x.id !== id);
    } else s.status = act;
    if (act !== 'approved') ctx.pruneCart();
    await persist();
    renderAdmin();
    toast(t('sell.toast.' + act, { store: s.storeName }));
  }

  /* ---------- events ---------- */
  $('#sell-open').addEventListener('click', () => open('form'));
  $('#btn-sell').addEventListener('click', () => open(mine.length ? 'mine' : 'form'));
  $('#footer-sell').addEventListener('click', () => open('form'));
  $('#sell-status-btn').addEventListener('click', () => open('mine'));
  $('#sell-new').addEventListener('click', showForm);
  $('#sell-add-product').addEventListener('click', () => { readDrafts(); if (drafts.length < MAX_PRODUCTS) drafts.push(emptyDraft()); renderDrafts(); });
  $('#sell-products').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-draft]');
    if (!btn) return;
    readDrafts(); drafts.splice(+btn.dataset.removeDraft, 1); renderDrafts();
  });
  form.addEventListener('submit', submit);
  $('#as-filter').addEventListener('change', renderAdmin);
  $('#as-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-seller-act]');
    if (btn) adminAction(btn.dataset.id, btn.dataset.sellerAct);
  });

  return { load, open, renderAdmin };
}
