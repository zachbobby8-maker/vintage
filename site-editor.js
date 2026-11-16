// Feature: admin "Edit site" tab — change page wording, pictures, brand lists and store details.
// Everything is saved under one storage key and applied on every visit.
import { translate } from './partials.js';
import { STORES } from './stores.js';
import { BEAUTY_BRANDS, HAIR_BRANDS } from './brands.js';

const KEY = 'bv_site';

// Page sections whose words the admin can change (every [data-i18n] text inside them).
const GROUPS = [
  { id: 'announce', sel: '.announce' },
  { id: 'header', sel: '.header, .tabbar' },
  { id: 'hero', sel: '.hero' },
  { id: 'house', sel: '#house' },
  { id: 'catalog', sel: '#catalog > .section-head, #grid-empty, .bundle', extra: ['heading.all', 'heading.couture', 'heading.bags', 'heading.watches', 'heading.beauty', 'heading.vanity', 'heading.wigs', 'heading.partners'] },
  { id: 'brands', sel: '#brands' },
  { id: 'watches', sel: '#watches' },
  { id: 'casting', sel: '#casting' },
  { id: 'stores', sel: '#stores' },
  { id: 'sell', sel: '#sell' },
  { id: 'footer', sel: '.footer' },
];

const IMAGES = [
  { id: 'heroMain', sel: '.hero-main img' },
  { id: 'heroSquare', sel: '.hero-sq img' },
  { id: 'houseMain', sel: '.house-main img' },
  { id: 'houseSquare', sel: '.house-sq img' },
  { id: 'bundle1', sel: '.bundle-imgs img:nth-child(1)' },
  { id: 'bundle2', sel: '.bundle-imgs img:nth-child(2)' },
  { id: 'bundle3', sel: '.bundle-imgs img:nth-child(3)' },
  { id: 'watch', sel: '.watch-band-img' },
  { id: 'casting', sel: '.casting-media img' },
];

const ORIGINAL = {
  beauty: BEAUTY_BRANDS.map((b) => ({ ...b })),
  hair: HAIR_BRANDS.map((b) => ({ ...b })),
  stores: STORES.map((s) => ({ ...s, hours: s.hours.map((h) => (h ? [...h] : null)) })),
};

export function initSiteEditor(ctx) {
  const { t, esc } = ctx;
  const $ = (sel, root = document) => root.querySelector(sel);
  let site = { text: {}, images: {}, brands: null, stores: {} };
  const originalImg = {};
  IMAGES.forEach((im) => { const el = $(im.sel); if (el) originalImg[im.id] = el.getAttribute('src'); });

  /* ---------- apply saved edits to the page ---------- */
  function applyText() {
    ctx.setTextOverrides(site.text || {});
    GROUPS.forEach((g) => document.querySelectorAll(g.sel).forEach((root) => translate(root, t)));
    ctx.refreshHeading?.();
  }
  function applyImages() {
    IMAGES.forEach((im) => {
      const el = $(im.sel);
      if (!el) return;
      const url = site.images?.[im.id] || originalImg[im.id];
      if (url && el.getAttribute('src') !== url) el.src = url;
    });
  }
  function applyBrands() {
    const b = site.brands || {};
    BEAUTY_BRANDS.splice(0, BEAUTY_BRANDS.length, ...(Array.isArray(b.beauty) ? b.beauty : ORIGINAL.beauty));
    HAIR_BRANDS.splice(0, HAIR_BRANDS.length, ...(Array.isArray(b.hair) ? b.hair : ORIGINAL.hair));
    ctx.brands?.render();
  }
  function applyStores() {
    ORIGINAL.stores.forEach((orig, i) => {
      const edit = site.stores?.[orig.id] || {};
      STORES[i] = { ...orig, hours: orig.hours.map((h) => (h ? [...h] : null)), ...edit };
    });
    ctx.stores?.render();
  }
  function applyAll() { applyText(); applyImages(); applyBrands(); applyStores(); }

  async function load() {
    const saved = await ctx.load(KEY, null);
    if (saved && typeof saved === 'object') site = { text: {}, images: {}, brands: null, stores: {}, ...saved };
    applyAll();
  }

  /* ---------- admin tab ---------- */
  const tabs = $('#admin-dialog .tabs');
  const tabBtn = document.createElement('button');
  tabBtn.className = 'tab';
  tabBtn.type = 'button';
  tabBtn.setAttribute('role', 'tab');
  tabBtn.setAttribute('aria-selected', 'false');
  tabBtn.dataset.tab = 'site';
  tabBtn.textContent = t('site.tab');
  const overviewTab = tabs?.querySelector('[data-tab="overview"]');
  if (overviewTab) overviewTab.before(tabBtn); else tabs?.appendChild(tabBtn);

  const panel = document.createElement('section');
  panel.id = 'admin-tab-site';
  panel.className = 'tab-panel';
  panel.hidden = true;
  panel.innerHTML = `<form id="site-form" class="stack" novalidate>
    <p class="small muted">${esc(t('site.hint'))}</p>
    <details class="panel site-sec" open><summary class="site-sum">${esc(t('site.secText'))}</summary><div id="site-text" class="stack"></div></details>
    <details class="panel site-sec"><summary class="site-sum">${esc(t('site.secImages'))}</summary><div id="site-images" class="stack"></div></details>
    <details class="panel site-sec"><summary class="site-sum">${esc(t('site.secBrands'))}</summary><div class="stack">
      <p class="small muted">${esc(t('site.brandsHint'))}</p>
      <div class="field"><label for="site-beauty">${esc(t('brands.beauty'))}</label><textarea id="site-beauty" class="input" rows="8"></textarea></div>
      <div class="field"><label for="site-hair">${esc(t('brands.hair'))}</label><textarea id="site-hair" class="input" rows="8"></textarea></div>
    </div></details>
    <details class="panel site-sec"><summary class="site-sum">${esc(t('site.secStores'))}</summary><div id="site-stores" class="stack"></div></details>
    <div class="site-actions">
      <button class="btn btn-primary btn-lg btn-block" type="submit">${esc(t('site.save'))}</button>
      <button id="site-reset" class="btn btn-outline btn-block" type="button">${esc(t('site.reset'))}</button>
    </div>
  </form>`;
  $('#admin-tab-overview')?.before(panel);

  const baseT = (key) => ctx.baseT(key);
  let textKeys = [];

  function collectText() {
    const seen = new Set();
    return GROUPS.map((g) => {
      const fields = [];
      document.querySelectorAll(g.sel).forEach((root) => {
        root.querySelectorAll('[data-i18n]').forEach((el) => {
          const key = el.dataset.i18n;
          if (!key || seen.has(key)) return;
          seen.add(key);
          const kind = el.closest('h1,h2,h3,h4') ? 'heading' : el.closest('button,a') ? 'button' : 'text';
          fields.push({ key, kind });
        });
      });
      (g.extra || []).forEach((key) => { if (!seen.has(key)) { seen.add(key); fields.push({ key, kind: 'heading' }); } });
      return { id: g.id, fields };
    }).filter((g) => g.fields.length);
  }

  function renderText() {
    const groups = collectText();
    textKeys = [];
    $('#site-text').innerHTML = groups.map((g) => `<fieldset class="fieldset"><legend>${esc(t('site.group.' + g.id))}</legend><div class="stack">
      ${g.fields.map((f) => {
        const i = textKeys.push(f.key) - 1;
        const val = site.text?.[f.key] ?? baseT(f.key);
        const rows = Math.min(4, Math.max(1, Math.ceil(val.length / 55)));
        return `<div class="field"><label for="se-t-${i}">${esc(t('site.kind.' + f.kind))}</label><textarea id="se-t-${i}" class="input" rows="${rows}" data-tkey="${i}">${esc(val)}</textarea></div>`;
      }).join('')}
    </div></fieldset>`).join('');
  }

  function renderImages() {
    $('#site-images').innerHTML = IMAGES.map((im) => {
      const url = site.images?.[im.id] || originalImg[im.id] || '';
      return `<div class="site-img-row"><img src="${esc(url)}" alt="" data-preview="${im.id}" />
        <div class="field"><label for="se-img-${im.id}">${esc(t('site.img.' + im.id))}</label>
        <input id="se-img-${im.id}" class="input" type="url" inputmode="url" data-img="${im.id}" value="${esc(url)}" /></div></div>`;
    }).join('') + `<p class="small muted">${esc(t('site.imgHint'))}</p>`;
  }

  const brandLines = (list) => list.map((b) => (b.note ? `${b.name} | ${b.note}` : b.name)).join('\n');
  const parseBrands = (text) => String(text || '').split('\n').map((line) => {
    const [name, ...rest] = line.split('|');
    return { name: name.trim(), note: rest.join('|').trim() };
  }).filter((b) => b.name).slice(0, 60);

  function renderBrands() {
    $('#site-beauty').value = brandLines(BEAUTY_BRANDS);
    $('#site-hair').value = brandLines(HAIR_BRANDS);
  }

  function timeField(id, label, value) {
    return `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" class="input" type="time" value="${esc(value || '')}" /></div>`;
  }
  function renderStores() {
    $('#site-stores').innerHTML = STORES.map((s) => {
      const p = `se-s-${s.id}`;
      const wk = s.hours[1] || []; const sat = s.hours[6] || []; const sun = s.hours[0] || [];
      return `<fieldset class="fieldset" data-store="${esc(s.id)}"><legend>${esc(s.city)}</legend>
        <label class="check-row"><input type="checkbox" id="${p}-show" ${s.hidden ? '' : 'checked'} /><span>${esc(t('site.storeShow'))}</span></label>
        <div class="form-grid">
          <div class="field span-2"><label for="${p}-name">${esc(t('site.storeName'))}</label><input id="${p}-name" class="input" maxlength="80" value="${esc(s.name)}" /></div>
          <div class="field"><label for="${p}-city">${esc(t('field.city'))}</label><input id="${p}-city" class="input" maxlength="40" value="${esc(s.city)}" /></div>
          <div class="field"><label for="${p}-area">${esc(t('site.storeArea'))}</label><input id="${p}-area" class="input" maxlength="40" value="${esc(s.area)}" /></div>
          <div class="field span-2"><label for="${p}-address">${esc(t('field.address'))}</label><input id="${p}-address" class="input" maxlength="140" value="${esc(s.address)}" /></div>
          <div class="field span-2"><label for="${p}-img">${esc(t('site.storeImg'))}</label><input id="${p}-img" class="input" type="url" value="${esc(s.img)}" /></div>
          ${timeField(p + '-wo', t('site.wkOpen'), wk[0])}${timeField(p + '-wc', t('site.wkClose'), wk[1])}
          ${timeField(p + '-so', t('site.satOpen'), sat[0])}${timeField(p + '-sc', t('site.satClose'), sat[1])}
          ${timeField(p + '-uo', t('site.sunOpen'), sun[0])}${timeField(p + '-uc', t('site.sunClose'), sun[1])}
        </div>
        <p class="small muted">${esc(t('site.hoursHint'))}</p>
      </fieldset>`;
    }).join('');
  }

  function renderAdmin() { renderText(); renderImages(); renderBrands(); renderStores(); }

  panel.addEventListener('input', (e) => {
    const id = e.target.dataset?.img;
    if (!id) return;
    const img = panel.querySelector(`[data-preview="${id}"]`);
    const url = e.target.value.trim();
    if (img && /^https?:\/\//i.test(url)) img.src = url;
  });

  function readStores() {
    const out = {};
    for (const s of STORES) {
      const p = `#se-s-${s.id}`;
      const v = (suffix) => ($(p + suffix)?.value || '').trim();
      const pair = (o, c) => (v(o) && v(c) ? [v(o), v(c)] : null);
      const week = pair('-wo', '-wc'); const sat = pair('-so', '-sc'); const sun = pair('-uo', '-uc');
      out[s.id] = {
        hidden: !$(p + '-show')?.checked,
        name: v('-name') || s.name, city: v('-city') || s.city, area: v('-area'), address: v('-address') || s.address,
        img: v('-img') || s.img,
        hours: [sun, week, week, week, week, week, sat],
      };
    }
    return out;
  }

  $('#site-form', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = {};
    panel.querySelectorAll('[data-tkey]').forEach((el) => {
      const key = textKeys[+el.dataset.tkey];
      const val = el.value.trim();
      if (key && val && val !== baseT(key)) text[key] = val.slice(0, 600);
    });
    const images = {};
    for (const im of IMAGES) {
      const url = ($('#se-img-' + im.id)?.value || '').trim();
      if (url && url !== originalImg[im.id]) {
        if (!/^https?:\/\//i.test(url)) { ctx.toast(t('site.errImg')); return; }
        images[im.id] = url;
      }
    }
    const beauty = parseBrands($('#site-beauty').value);
    const hair = parseBrands($('#site-hair').value);
    const next = { text, images, brands: { beauty, hair }, stores: readStores() };
    const ok = await ctx.save(KEY, next);
    if (!ok) return;
    site = next;
    applyAll();
    renderAdmin();
    ctx.toast(t('site.saved'));
  });

  $('#site-reset', panel).addEventListener('click', async () => {
    if (!window.confirm(t('site.resetConfirm'))) return;
    await ctx.remove(KEY);
    site = { text: {}, images: {}, brands: null, stores: {} };
    applyAll();
    renderAdmin();
    ctx.toast(t('site.resetDone'));
  });

  return { load, renderAdmin };
}
