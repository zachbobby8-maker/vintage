// Feature: extensive product detail view (gallery, story, specs, care, provenance, shipping).
import { findProduct, BUNDLE } from './products.js';

export function initQuickView(ctx) {
  const { t, esc, fmt, state } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const dialog = $('#qv-dialog');
  const img = $('#qv-img');
  let currentId = null;

  function setSection(sectionSel, textSel, text) {
    $(textSel).textContent = text || '';
    $(sectionSel).hidden = !text;
  }

  function showImage(src, fallback, alt) {
    img.dataset.fallback = fallback || '';
    img.src = src || fallback || '';
    img.alt = alt || '';
    ctx.attachFallbacks(img.parentElement);
  }

  function renderThumbs(p) {
    const images = [p.image, ...(p.gallery || [])].filter(Boolean);
    const box = $('#qv-thumbs');
    box.hidden = images.length < 2;
    box.innerHTML = images.map((src, i) => `<button class="qv-thumb ${i === 0 ? 'is-active' : ''}" type="button" data-qv-img="${esc(src)}" aria-label="${esc(t('qv.photoN', { n: i + 1 }))}">
      <img src="${esc(src)}" data-fallback="${esc(p.fallback)}" alt="" loading="lazy" /></button>`).join('');
    ctx.attachFallbacks(box);
  }

  function stockText(p) {
    if (p.oneOfOne) return t('qv.oneOfOne');
    if (p.stock == null) return '';
    if (p.stock <= 0) return t('card.soldOut');
    return p.stock <= 5 ? t('qv.onlyLeft', { n: p.stock }) : t('qv.inStock', { n: p.stock });
  }

  function renderShipping() {
    const s = state.shipping || {};
    const methods = s.methods || [];
    const rows = methods.map((m) => `<li><span class="strong">${esc(m.name)}</span> · ${esc(m.eta || '')} · ${esc(fmt(Number(m.priceUsd) || 0))}</li>`);
    if (Number(s.freeThresholdUsd) > 0) rows.push(`<li>${esc(t('qv.freeOver', { amount: fmt(Number(s.freeThresholdUsd)) }))}</li>`);
    if (s.dispatchNote) rows.push(`<li>${esc(s.dispatchNote)}</li>`);
    $('#qv-ship-list').innerHTML = rows.join('');
  }

  function render() {
    const p = findProduct(currentId);
    if (!p) { ctx.closeDialog(dialog); return; }
    showImage(p.image, p.fallback, p.name);
    renderThumbs(p);
    const badge = $('#qv-badge');
    badge.className = `tag tag-${p.tag}`;
    badge.textContent = t('tag.' + p.tag);
    const stock = $('#qv-stock');
    stock.textContent = stockText(p);
    stock.hidden = !stock.textContent;
    $('#qv-era').textContent = p.era || '';
    $('#qv-name').textContent = p.name;
    $('#qv-price').textContent = fmt(p.priceUsd);
    const compare = $('#qv-compare');
    compare.hidden = !(p.compareUsd > p.priceUsd);
    compare.textContent = p.compareUsd ? fmt(p.compareUsd) : '';
    const desc = $('#qv-desc');
    desc.textContent = p.description || '';
    desc.hidden = !p.description;
    const hl = $('#qv-highlights');
    const highlights = Array.isArray(p.highlights) ? p.highlights : [];
    hl.hidden = !highlights.length;
    hl.innerHTML = highlights.map((h) => `<li>${esc(h)}</li>`).join('');
    $('#qv-measure').textContent = p.measurements || t('common.none');
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
    $('#qv-shade-wrap').hidden = !p.shades;
    shadeSel.innerHTML = (p.shades || []).map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    const unav = ctx.unavailable(p);
    const addBtn = $('#qv-add');
    addBtn.disabled = unav;
    addBtn.textContent = unav ? t(ctx.isSold(p) ? 'card.soldOut' : 'card.inBag') : t('qv.add');
  }

  function open(id) {
    const p = findProduct(id);
    if (!p || p === BUNDLE) return;
    currentId = id;
    $('#qv-bundle').checked = true;
    render();
    dialog.querySelector('.qv')?.scrollTo?.(0, 0);
    ctx.openDialog(dialog);
  }

  $('#qv-thumbs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qv-img]');
    if (!btn) return;
    const p = findProduct(currentId);
    showImage(btn.dataset.qvImg, p?.fallback, p?.name);
    document.querySelectorAll('#qv-thumbs .qv-thumb').forEach((b) => b.classList.toggle('is-active', b === btn));
  });

  $('#qv-add').addEventListener('click', () => {
    const p = findProduct(currentId);
    if (!p) return;
    ctx.addToCart(currentId, p.shades ? $('#qv-shade').value : null, false);
    if ($('#qv-bundle').checked) ctx.addBundle(false);
    ctx.closeDialog(dialog);
    ctx.openDialog($('#cart-dialog'));
  });

  return {
    open,
    refresh() { if (dialog.open && currentId) render(); },
  };
}
