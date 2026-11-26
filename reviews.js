// Feature: star ratings & reviews (with photo + "Verified purchase"), product
// questions & answers, and "Notify me" back-in-stock alerts, plus their admin tab.
import { findProduct } from './products.js';

export function initReviews(ctx) {
  const { t, esc, formatDate, state } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const KEYS = { reviews: 'bv_reviews', qa: 'bv_questions', notify: 'bv_notify' };
  let reviews = [];
  let questions = [];
  let alerts = [];
  let currentId = null;
  let photoData = '';

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const bought = (id) => state.orders.some((o) => o.status !== 'cancelled' && (o.items || []).some((i) => i.id === id));

  function summary(id) {
    const list = reviews.filter((r) => r.productId === id);
    if (!list.length) return { avg: 0, count: 0 };
    return { avg: list.reduce((s, r) => s + r.stars, 0) / list.length, count: list.length };
  }
  const stars = (n) => `<span class="stars" style="--pct:${Math.round((n / 5) * 100)}%" role="img" aria-label="${esc(t('rev.outOf', { n: Number(n).toFixed(1) }))}"></span>`;

  /* ---------- product page ---------- */
  function renderFor(id) {
    currentId = id;
    const p = findProduct(id);
    const s = summary(id);
    $('#qv-rating').innerHTML = s.count
      ? `${stars(s.avg)}<span>${esc(t('rev.summary', { avg: s.avg.toFixed(1), n: s.count }))}</span>`
      : `<span>${esc(t('rev.noneShort'))}</span>`;
    $('#qv-reviews-summary').innerHTML = s.count ? `${stars(s.avg)} <span class="strong">${esc(t('rev.summary', { avg: s.avg.toFixed(1), n: s.count }))}</span>` : '';
    const list = reviews.filter((r) => r.productId === id).sort((a, b) => b.at - a.at);
    $('#qv-review-empty').hidden = list.length > 0;
    $('#qv-review-list').innerHTML = list.map((r) => `<article class="review">
        <div class="row-between"><span class="row">${stars(r.stars)}<span class="strong small">${esc(r.name)}</span></span><span class="small muted">${esc(formatDate(r.at))}</span></div>
        ${r.verified ? `<span class="verified">${esc(t('rev.verified'))}</span>` : ''}
        <p class="small">${esc(r.text)}</p>
        ${r.photo ? `<img class="review-photo" src="${esc(r.photo)}" alt="${esc(t('rev.photoAlt', { name: r.name }))}" loading="lazy" />` : ''}
      </article>`).join('');
    const qs = questions.filter((q) => q.productId === id).sort((a, b) => b.at - a.at);
    $('#qv-qa-empty').hidden = qs.length > 0;
    $('#qv-qa-list').innerHTML = qs.map((q) => `<div class="qa">
        <p class="small"><span class="qa-label">${esc(t('qa.q'))}</span> ${esc(q.text)}</p>
        <p class="small ${q.answer ? '' : 'muted'}"><span class="qa-label qa-label-a">${esc(t('qa.a'))}</span> ${esc(q.answer || t('qa.waiting'))}</p>
        <p class="tiny muted">${esc(t('qa.askedBy', { name: q.name, date: formatDate(q.at) }))}</p>
      </div>`).join('');
    // Back-in-stock / similar-piece alerts for sold-out items.
    const sold = p && ctx.isSold(p);
    $('#qv-notify').hidden = !sold;
    if (sold) {
      $('#nt-title').textContent = t(p.oneOfOne ? 'notify.titleSimilar' : 'notify.title');
      const mine = alerts.some((a) => a.productId === id && a.email === (state.buyer?.email || '').toLowerCase());
      $('#qv-notify-form').hidden = mine;
      $('#qv-notify-done').hidden = !mine;
      if (!$('#nt-email').value) $('#nt-email').value = state.buyer?.email || '';
    }
  }
  function resetForms() {
    $('#qv-review-form').hidden = true;
    $('#qv-review-toggle').setAttribute('aria-expanded', 'false');
    $('#qv-review-form').reset();
    $('#rv-photo-preview').hidden = true;
    photoData = '';
    $('#rv-error').hidden = true;
    $('#qa-error').hidden = true;
    $('#nt-error').hidden = true;
    $('#rv-name').value = state.buyer?.name || '';
    $('#qa-name').value = state.buyer?.name || '';
  }

  $('#qv-rating').addEventListener('click', () => $('#qv-reviews-sec').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  $('#qv-review-toggle').addEventListener('click', () => {
    const form = $('#qv-review-form');
    form.hidden = !form.hidden;
    $('#qv-review-toggle').setAttribute('aria-expanded', String(!form.hidden));
    if (!form.hidden) $('#rv-name').focus();
  });
  $('#rv-photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    photoData = '';
    $('#rv-photo-preview').hidden = true;
    if (!file) return;
    if (!file.type.startsWith('image/')) { $('#rv-error').textContent = t('rev.errPhoto'); $('#rv-error').hidden = false; return; }
    try {
      photoData = await shrink(file);
      $('#rv-photo-preview').src = photoData;
      $('#rv-photo-preview').hidden = false;
    } catch { $('#rv-error').textContent = t('rev.errPhoto'); $('#rv-error').hidden = false; }
  });
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 480 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }
  $('#qv-review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#rv-name').value.trim();
    const text = $('#rv-text').value.trim();
    const starsVal = Number(document.querySelector('input[name="rv-stars"]:checked')?.value || 0);
    const err = $('#rv-error');
    if (!name || !text || !starsVal) { err.textContent = t('rev.errRequired'); err.hidden = false; return; }
    const review = { id: uid(), productId: currentId, name: name.slice(0, 40), stars: starsVal, text: text.slice(0, 800), at: Date.now(), verified: bought(currentId) };
    if (photoData && JSON.stringify(reviews).length + photoData.length < 850000) review.photo = photoData;
    reviews.push(review);
    if (!(await ctx.save(KEYS.reviews, reviews))) { reviews.pop(); return; }
    resetForms();
    renderFor(currentId);
    ctx.refreshCatalog();
    ctx.toast(t('rev.thanks'));
  });
  $('#qv-ask-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#qa-name').value.trim();
    const text = $('#qa-text').value.trim();
    const err = $('#qa-error');
    if (!name || text.length < 3) { err.textContent = t('qa.errRequired'); err.hidden = false; return; }
    err.hidden = true;
    questions.push({ id: uid(), productId: currentId, name: name.slice(0, 40), text: text.slice(0, 400), answer: '', at: Date.now() });
    if (!(await ctx.save(KEYS.qa, questions))) { questions.pop(); return; }
    $('#qa-text').value = '';
    renderFor(currentId);
    ctx.toast(t('qa.sent'));
  });
  $('#qv-notify-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#nt-email').value.trim().toLowerCase();
    const err = $('#nt-error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = t('chk.errEmail'); err.hidden = false; return; }
    err.hidden = true;
    if (!alerts.some((a) => a.productId === currentId && a.email === email)) {
      alerts.push({ id: uid(), productId: currentId, email, at: Date.now() });
      if (!(await ctx.save(KEYS.notify, alerts))) { alerts.pop(); return; }
    }
    state.buyer = { ...(state.buyer || {}), email };
    $('#qv-notify-form').hidden = true;
    $('#qv-notify-done').hidden = false;
    ctx.toast(t('notify.saved'));
  });

  /* ---------- admin tab ---------- */
  const tabs = $('#admin-dialog .tabs');
  const tabBtn = document.createElement('button');
  Object.assign(tabBtn, { className: 'tab', type: 'button' });
  tabBtn.setAttribute('role', 'tab');
  tabBtn.setAttribute('aria-selected', 'false');
  tabBtn.dataset.tab = 'reviews';
  tabBtn.innerHTML = `<span>${esc(t('rev.tab'))}</span> <span id="admin-qa-count" class="count-badge count-rose" hidden></span>`;
  const overviewTab = tabs?.querySelector('[data-tab="overview"]');
  if (overviewTab) overviewTab.before(tabBtn); else tabs?.appendChild(tabBtn);
  const panel = document.createElement('section');
  panel.id = 'admin-tab-reviews';
  panel.className = 'tab-panel';
  panel.hidden = true;
  panel.innerHTML = `<div class="stack">
    <p class="eyebrow">${esc(t('qa.adminWaiting'))}</p><div id="ar-questions" class="stack"></div>
    <p class="eyebrow">${esc(t('notify.adminTitle'))}</p><div id="ar-alerts" class="order-list"></div>
    <p class="eyebrow">${esc(t('rev.adminTitle'))}</p><div id="ar-reviews" class="order-list"></div></div>`;
  $('#admin-tab-overview')?.before(panel);

  const nameOf = (id) => findProduct(id)?.name || id;
  function updateBadge() {
    const n = questions.filter((q) => !q.answer).length;
    const b = $('#admin-qa-count');
    b.hidden = n === 0; b.textContent = String(n);
  }
  function renderAdmin() {
    const qs = [...questions].sort((a, b) => Number(!!a.answer) - Number(!!b.answer) || b.at - a.at);
    $('#ar-questions').innerHTML = qs.length ? qs.map((q) => `<form class="panel stack" data-answer="${esc(q.id)}">
        <p class="small"><span class="strong">${esc(nameOf(q.productId))}</span>, ${esc(t('qa.askedBy', { name: q.name, date: formatDate(q.at) }))}</p>
        <p class="small">${esc(q.text)}</p>
        <label class="sr-only" for="ans-${esc(q.id)}">${esc(t('qa.answerLabel'))}</label>
        <textarea id="ans-${esc(q.id)}" class="input" rows="2" maxlength="600" placeholder="${esc(t('qa.answerPh'))}">${esc(q.answer)}</textarea>
        <div class="row"><button class="btn btn-primary btn-sm" type="submit">${esc(t(q.answer ? 'qa.update' : 'qa.answer'))}</button>
        <button class="btn btn-outline btn-sm" type="button" data-q-del="${esc(q.id)}">${esc(t('common.delete'))}</button></div></form>`).join('')
      : `<p class="small muted">${esc(t('qa.adminNone'))}</p>`;
    $('#ar-alerts').innerHTML = alerts.length ? alerts.map((a) => {
      const p = findProduct(a.productId);
      const back = p && !ctx.isSold(p);
      const mail = `mailto:${encodeURIComponent(a.email)}?subject=${encodeURIComponent(t('notify.mailSubject', { name: nameOf(a.productId) }))}`;
      return `<div class="order-row"><span class="order-row-main"><span class="order-row-title">${esc(a.email)}</span>
        <span class="order-row-sub">${esc(nameOf(a.productId))}, ${esc(t(back ? 'notify.backNow' : 'notify.stillOut'))}</span></span>
        <span class="order-row-side row"><a class="btn btn-gold btn-sm" href="${esc(mail)}">${esc(t('notify.email'))}</a>
        <button class="btn btn-outline btn-sm" type="button" data-alert-del="${esc(a.id)}">${esc(t('common.delete'))}</button></span></div>`;
    }).join('') : `<p class="small muted">${esc(t('notify.adminNone'))}</p>`;
    const rs = [...reviews].sort((a, b) => b.at - a.at);
    $('#ar-reviews').innerHTML = rs.length ? rs.map((r) => `<div class="order-row"><span class="order-row-main">
        <span class="order-row-title">${stars(r.stars)} ${esc(r.name)}${r.verified ? `, ${esc(t('rev.verified'))}` : ''}</span>
        <span class="order-row-sub">${esc(nameOf(r.productId))}: ${esc(r.text)}</span></span>
        <span class="order-row-side"><button class="btn btn-outline btn-sm" type="button" data-rev-del="${esc(r.id)}">${esc(t('common.delete'))}</button></span></div>`).join('')
      : `<p class="small muted">${esc(t('rev.adminNone'))}</p>`;
    updateBadge();
  }
  panel.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-answer]');
    if (!form) return;
    e.preventDefault();
    const q = questions.find((x) => x.id === form.dataset.answer);
    const text = form.querySelector('textarea').value.trim();
    if (!q || !text) return;
    q.answer = text.slice(0, 600);
    if (await ctx.save(KEYS.qa, questions)) { ctx.toast(t('qa.answered')); renderAdmin(); }
  });
  panel.addEventListener('click', async (e) => {
    const qd = e.target.closest('[data-q-del]');
    const ad = e.target.closest('[data-alert-del]');
    const rd = e.target.closest('[data-rev-del]');
    if (qd) { questions = questions.filter((x) => x.id !== qd.dataset.qDel); await ctx.save(KEYS.qa, questions); }
    else if (ad) { alerts = alerts.filter((x) => x.id !== ad.dataset.alertDel); await ctx.save(KEYS.notify, alerts); }
    else if (rd) {
      if (!window.confirm(t('rev.confirmDelete'))) return;
      reviews = reviews.filter((x) => x.id !== rd.dataset.revDel); await ctx.save(KEYS.reviews, reviews); ctx.refreshCatalog();
    } else return;
    renderAdmin();
  });

  /* ---------- load & seed ---------- */
  function seedReviews() {
    const day = 86400000; const now = Date.now();
    const r = (productId, name, starsN, text, ago) => ({ id: uid(), productId, name, stars: starsN, text, at: now - ago * day, verified: true });
    return [
      r('bv-06', 'Amara O.', 5, 'The berry shade is perfect on brown skin. Arrived sealed with the hologram sticker.', 3),
      r('bv-06', 'Tolu A.', 4, 'Lovely glossy finish, not sticky. I wish the tubes were a little bigger.', 9),
      r('bv-06', 'Grace M.', 5, 'Bought as a gift and my sister loved it. Fast Lagos delivery.', 16),
      r('bv-11', 'Chioma E.', 5, 'The HD lace really melts. Pre-plucked hairline needed almost no work.', 5),
      r('bv-11', 'Ruth K.', 4, 'Beautiful hair, very full. Took one wash to settle the shine.', 21),
      r('bv-12', 'Funmi B.', 5, 'Glueless and comfortable all day. The honey colour is gorgeous.', 7),
      r('bv-09', 'Ada N.', 5, 'Holds my thick braids without slipping. Feels expensive.', 12),
      r('bv-14', 'Zainab Y.', 4, 'Light on the head and the boho curls stay defined.', 18),
    ].filter((x) => findProduct(x.productId));
  }
  function seedQuestions() {
    const at = Date.now() - 4 * 86400000;
    return findProduct('bv-11') ? [{ id: uid(), productId: 'bv-11', name: 'Kemi', text: 'Can I dye this wig darker?', answer: 'Yes, it is 100% virgin hair. We recommend a professional colourist and a deep conditioning treatment after.', at }] : [];
  }
  async function loadList(key, seed) {
    const raw = await ctx.loadRaw(key);
    if (raw == null) { const v = seed(); await ctx.save(key, v); return v; }
    try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  async function load() {
    [reviews, questions, alerts] = await Promise.all([
      loadList(KEYS.reviews, seedReviews), loadList(KEYS.qa, seedQuestions), loadList(KEYS.notify, () => []),
    ]);
    updateBadge();
  }

  return { load, summary, renderFor, resetForms, renderAdmin };
}
