// Feature: admin product management — add, edit, duplicate, hide and delete store products.
import { PRODUCTS, getStoreProducts, setStoreProducts, normalizeProduct, placeholderImage } from './products.js';

const KEY = 'bv_products';
const SEED_KEY = 'bv_products_seed';
const SEED_VERSION = 3; // v2 adds the wigs collection, v3 adds vintage watches
const SEED_ADDS = { 2: 'wigs', 3: 'watches' };
const CATS = ['couture', 'bags', 'watches', 'beauty', 'vanity', 'wigs'];
const TAGS = ['archive', 'sealed', 'essential'];

export function initCatalogAdmin(ctx) {
  const { t, esc, fmt, state } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const dialog = $('#pe-dialog');
  const form = $('#pe-form');
  const err = $('#pe-error');
  let editingId = null;

  /* ---------- storage ---------- */
  async function load() {
    const saved = await ctx.load(KEY, null);
    if (Array.isArray(saved)) {
      setStoreProducts(saved);
      const seen = Number(await ctx.load(SEED_KEY, 1)) || 1;
      if (seen < SEED_VERSION) {
        const ids = new Set(saved.map((p) => p?.id));
        const cats = Object.entries(SEED_ADDS).filter(([v]) => Number(v) > seen).map(([, c]) => c);
        const added = PRODUCTS.filter((p) => cats.includes(p.category) && !ids.has(p.id));
        if (added.length) { setStoreProducts([...saved, ...added]); await ctx.save(KEY, getStoreProducts()); }
        await ctx.save(SEED_KEY, SEED_VERSION);
      }
    } else {
      setStoreProducts(PRODUCTS);
      await ctx.save(KEY, getStoreProducts());
      await ctx.save(SEED_KEY, SEED_VERSION);
    }
  }
  async function persist(list) {
    setStoreProducts(list);
    const ok = await ctx.save(KEY, getStoreProducts());
    ctx.pruneCart();
    ctx.refreshCatalog();
    ctx.quickView?.refresh();
    render();
    return ok;
  }
  async function consumeStock(lines) {
    let changed = false;
    const list = getStoreProducts().map((p) => {
      const line = lines.find((l) => l.id === p.id);
      if (!line || p.stock == null) return p;
      changed = true;
      return { ...p, stock: Math.max(0, p.stock - line.qty) };
    });
    if (changed) await persist(list);
  }

  /* ---------- list ---------- */
  function statusText(p) {
    if (p.hidden) return t('ap.hidden');
    if (state.sold.has(p.id)) return t('card.archived');
    if (p.oneOfOne) return t('qv.oneOfOne');
    if (p.stock == null) return t('ap.unlimited');
    return p.stock <= 0 ? t('card.soldOut') : t('qv.inStock', { n: p.stock });
  }
  function render() {
    const q = $('#ap-search').value.trim().toLowerCase();
    const cat = $('#ap-filter').value;
    const list = getStoreProducts().filter((p) => (cat === 'all' || p.category === cat)
      && (!q || `${p.name} ${p.sku} ${p.era}`.toLowerCase().includes(q)));
    $('#ap-count').textContent = t('ap.count', { n: getStoreProducts().length });
    $('#ap-empty').hidden = list.length > 0;
    $('#ap-list').innerHTML = list.map((p) => `<div class="product-row ${p.hidden ? 'is-hidden' : ''}">
      <img src="${esc(p.image)}" data-fallback="${esc(p.fallback)}" alt="" loading="lazy" />
      <div class="order-row-main"><span class="order-row-title">${esc(p.name)}</span>
        <span class="order-row-sub">${esc([t('cat.' + p.category), fmt(p.priceUsd), statusText(p)].join(' · '))}</span></div>
      <div class="product-row-actions">
        <button class="btn btn-primary btn-sm" type="button" data-pedit="${esc(p.id)}">${esc(t('ap.edit'))}</button>
        <button class="btn btn-outline btn-sm" type="button" data-pdup="${esc(p.id)}">${esc(t('ap.duplicate'))}</button>
        <button class="btn btn-outline btn-sm" type="button" data-ptoggle="${esc(p.id)}">${esc(t(p.hidden ? 'ap.show' : 'ap.hide'))}</button>
      </div></div>`).join('');
    ctx.attachFallbacks($('#ap-list'));
  }

  /* ---------- editor ---------- */
  const f = (id) => $('#pe-' + id);
  const lines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);

  function fillTemplateSelect() {
    f('template').innerHTML = `<option value="">${esc(t('pe.blank'))}</option>`
      + getStoreProducts().map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  }
  function fillForm(p) {
    const v = p || {};
    f('name').value = v.name || '';
    f('sku').value = v.sku || '';
    f('category').value = CATS.includes(v.category) ? v.category : 'couture';
    f('tag').value = TAGS.includes(v.tag) ? v.tag : 'archive';
    f('oneofone').checked = p ? !!v.oneOfOne : true;
    f('price').value = v.priceUsd ?? '';
    f('compare').value = v.compareUsd ?? '';
    f('stock').value = v.stock ?? '';
    f('era').value = v.era || '';
    f('image').value = v.image && v.image !== v.fallback ? v.image : '';
    f('gallery').value = (v.gallery || []).join('\n');
    f('shades').value = (v.shades || []).join(', ');
    f('description').value = v.description || '';
    f('highlights').value = (v.highlights || []).join('\n');
    f('measurements').value = v.measurements || '';
    f('fit').value = v.fit || '';
    f('materials').value = v.materials || '';
    f('condition').value = v.condition || '';
    f('care').value = v.care || '';
    f('provenance').value = v.provenance || '';
    f('hidden').checked = !!v.hidden;
    syncOneOfOne();
    updatePreview();
  }
  function syncOneOfOne() {
    const one = f('oneofone').checked;
    f('stock').disabled = one;
    if (one) f('stock').value = '';
  }
  function updatePreview() {
    const url = f('image').value.trim();
    const img = f('preview');
    img.dataset.fallback = placeholderImage(f('name').value.trim());
    img.src = url || img.dataset.fallback;
    ctx.attachFallbacks(img.parentElement);
  }

  function openEditor(id, sourceId) {
    const list = getStoreProducts();
    const product = id ? list.find((p) => p.id === id) : null;
    const source = sourceId ? list.find((p) => p.id === sourceId) : null;
    editingId = product ? product.id : null;
    $('#pe-title').textContent = t(product ? 'pe.editTitle' : 'pe.newTitle');
    $('#pe-template-wrap').hidden = !!product;
    $('#pe-delete').hidden = !product;
    fillTemplateSelect();
    f('template').value = source ? source.id : '';
    if (product) fillForm(product);
    else if (source) { fillForm({ ...source, name: t('pe.copyName', { name: source.name }), sku: '', hidden: false }); }
    else fillForm(null);
    err.hidden = true;
    $('#pe-upload-status').hidden = true;
    $$('#pe-form .input').forEach((i) => i.classList.remove('is-invalid'));
    ctx.openDialog(dialog);
    form.scrollTop = 0;
    f('name').focus();
  }

  function readForm() {
    const num = (id) => { const raw = f(id).value.trim(); return raw === '' ? null : Number(raw); };
    const oneOfOne = f('oneofone').checked;
    const name = f('name').value.trim();
    return {
      name, sku: f('sku').value.trim(), category: f('category').value, tag: f('tag').value, oneOfOne,
      priceUsd: num('price'), compareUsd: num('compare'), stock: oneOfOne ? null : num('stock'),
      era: f('era').value.trim(), image: f('image').value.trim(), fallback: placeholderImage(name),
      gallery: lines(f('gallery').value), shades: f('shades').value.split(',').map((s) => s.trim()).filter(Boolean),
      description: f('description').value.trim(), highlights: lines(f('highlights').value),
      measurements: f('measurements').value.trim(), fit: f('fit').value.trim(), materials: f('materials').value.trim(),
      condition: f('condition').value.trim(), care: f('care').value.trim(), provenance: f('provenance').value.trim(),
      hidden: f('hidden').checked,
    };
  }
  function fail(key, field) {
    err.textContent = t(key);
    err.hidden = false;
    if (field) { f(field).classList.add('is-invalid'); f(field).focus(); }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $$('#pe-form .input').forEach((i) => i.classList.remove('is-invalid'));
    const data = readForm();
    if (!data.name) return fail('pe.errName', 'name');
    if (!Number.isFinite(data.priceUsd) || data.priceUsd <= 0) return fail('pe.errPrice', 'price');
    if (data.compareUsd != null && (!Number.isFinite(data.compareUsd) || data.compareUsd < 0)) return fail('pe.errCompare', 'compare');
    if (data.stock != null && (!Number.isFinite(data.stock) || data.stock < 0)) return fail('pe.errStock', 'stock');
    err.hidden = true;
    const btn = $('#pe-submit');
    btn.disabled = true;
    const list = [...getStoreProducts()];
    if (editingId) {
      const i = list.findIndex((p) => p.id === editingId);
      if (i >= 0) list[i] = normalizeProduct({ ...list[i], ...data });
    } else {
      list.unshift(normalizeProduct({ ...data, id: 'bv-' + Date.now().toString(36) }));
    }
    const ok = await persist(list);
    btn.disabled = false;
    if (ok) { ctx.closeDialog(dialog); ctx.toast(t(editingId ? 'pe.saved' : 'pe.added')); }
  });

  $('#pe-delete').addEventListener('click', async () => {
    if (!editingId || !window.confirm(t('pe.confirmDelete'))) return;
    const ok = await persist(getStoreProducts().filter((p) => p.id !== editingId));
    if (ok) { ctx.closeDialog(dialog); ctx.toast(t('pe.deleted')); }
  });

  f('template').addEventListener('change', () => {
    const src = getStoreProducts().find((p) => p.id === f('template').value);
    fillForm(src ? { ...src, name: t('pe.copyName', { name: src.name }), sku: '', hidden: false } : null);
  });
  f('oneofone').addEventListener('change', syncOneOfOne);
  f('tag').addEventListener('change', () => { f('oneofone').checked = f('tag').value === 'archive'; syncOneOfOne(); });
  f('image').addEventListener('change', updatePreview);

  async function upload(input, onUrl) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const status = $('#pe-upload-status');
    status.textContent = t('pe.uploading');
    status.hidden = false;
    try {
      if (!window.miniappsAI?.uploadFile) throw new Error('no sdk');
      const res = await window.miniappsAI.uploadFile(file, { persistence: 'durable' });
      onUrl(res.publicUrl);
      status.textContent = t('pe.uploaded');
    } catch {
      status.textContent = t('pe.uploadFailed');
    }
  }
  f('upload').addEventListener('change', (e) => upload(e.target, (url) => { f('image').value = url; updatePreview(); }));
  f('gallery-upload').addEventListener('change', (e) => upload(e.target, (url) => {
    f('gallery').value = [...lines(f('gallery').value), url].join('\n');
  }));

  /* ---------- list events ---------- */
  $('#ap-add').addEventListener('click', () => openEditor(null, null));
  $('#ap-search').addEventListener('input', render);
  $('#ap-filter').addEventListener('change', render);
  $('#ap-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-pedit],[data-pdup],[data-ptoggle]');
    if (!btn) return;
    if (btn.dataset.pedit) openEditor(btn.dataset.pedit, null);
    else if (btn.dataset.pdup) openEditor(null, btn.dataset.pdup);
    else {
      const id = btn.dataset.ptoggle;
      const list = getStoreProducts().map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p));
      const ok = await persist(list);
      if (ok) ctx.toast(t(list.find((p) => p.id === id)?.hidden ? 'ap.hiddenToast' : 'ap.shownToast'));
    }
  });

  return { load, render, consumeStock };
}
