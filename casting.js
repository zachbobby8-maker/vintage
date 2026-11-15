// Feature: model casting call (ages 18–22, female & male) — public application + admin "Models" tab.
const KEY = 'bv_casting';
const MINE_KEY = 'bv_casting_mine';
const STATUSES = ['new', 'shortlisted', 'declined'];
const CHIP = { new: 'placed', shortlisted: 'delivered', declined: 'cancelled' };

function seed() {
  const now = Date.now();
  return [
    { id: 'MC-101', createdAt: now - 26 * 3600000, name: 'Tobi Adeyemi', age: 20, gender: 'male', city: 'Lagos', phone: '+234 803 555 0192', instagram: '@tobi.adeyemi', height: "6'1\" / 185 cm", photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', message: 'I walked for a campus fashion show last year and love vintage tailoring. Free on weekends.', status: 'new' },
    { id: 'MC-102', createdAt: now - 3 * 86400000, name: 'Zainab Bello', age: 19, gender: 'female', city: 'Abuja', phone: '+234 806 555 0147', instagram: '@zainab.b', height: "5'10\" / 178 cm", photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=300&q=80', message: 'Happy to travel to Lagos for the wig campaign. I have natural 4C hair.', status: 'shortlisted' },
  ];
}

export function initCasting(ctx) {
  const { t, esc, formatDate } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const dialog = $('#casting-dialog');
  let apps = [];
  let mine = [];

  /* ---------- admin tab (injected into the console) ---------- */
  const tabs = $('#admin-dialog .tabs');
  const tabBtn = document.createElement('button');
  tabBtn.className = 'tab';
  tabBtn.type = 'button';
  tabBtn.setAttribute('role', 'tab');
  tabBtn.setAttribute('aria-selected', 'false');
  tabBtn.dataset.tab = 'models';
  tabBtn.innerHTML = `<span>${esc(t('casting.tab'))}</span> <span id="admin-models-count" class="count-badge count-rose" hidden></span>`;
  const shipTab = tabs?.querySelector('[data-tab="shipping"]');
  if (shipTab) shipTab.before(tabBtn); else tabs?.appendChild(tabBtn);

  const panel = document.createElement('section');
  panel.id = 'admin-tab-models';
  panel.className = 'tab-panel';
  panel.hidden = true;
  panel.innerHTML = `<div class="row-between">
      <p id="cm-count" class="small muted"></p>
      <label for="cm-filter" class="sr-only">${esc(t('casting.filter'))}</label>
      <select id="cm-filter" class="input input-sm">
        <option value="all">${esc(t('casting.filterAll'))}</option>
        ${STATUSES.map((s) => `<option value="${s}">${esc(t('casting.status.' + s))}</option>`).join('')}
      </select>
    </div>
    <p class="hint">${esc(t('casting.adminHint'))}</p>
    <div id="cm-list" class="model-list"></div>
    <div id="cm-empty" class="empty-state" hidden><p class="muted">${esc(t('casting.adminEmpty'))}</p></div>`;
  $('#admin-tab-shipping')?.before(panel);

  /* ---------- storage ---------- */
  async function refresh() {
    const stored = await ctx.load(KEY, null);
    if (Array.isArray(stored)) apps = stored.filter((a) => a && a.id);
    return apps;
  }
  async function persist() {
    const ok = await ctx.save(KEY, apps);
    updateBadge();
    return ok;
  }
  async function load() {
    const stored = await ctx.load(KEY, null);
    if (Array.isArray(stored)) apps = stored.filter((a) => a && a.id);
    else { apps = seed(); await ctx.save(KEY, apps); }
    const m = await ctx.load(MINE_KEY, []);
    mine = Array.isArray(m) ? m : [];
    updateBadge();
    renderPublic();
  }

  /* ---------- public ---------- */
  function renderPublic() {
    // Main button sends the application straight to the admin. Telegram is an optional extra.
    const tg = ctx.contact?.publicLinks(t('casting.waText'))?.tg || '';
    const link = $('#casting-wa');
    link.hidden = !tg;
    if (tg) link.href = tg;
    const latest = apps.filter((a) => mine.includes(a.id)).sort((a, b) => b.createdAt - a.createdAt)[0];
    const note = $('#casting-mine');
    note.hidden = !latest;
    if (latest) note.textContent = t('casting.mineStatus', { date: formatDate(latest.createdAt), status: t('casting.status.' + latest.status) });
  }

  function resetForm() {
    $('#casting-form').reset();
    $('#cast-preview').hidden = true;
    $('#cast-upload-status').hidden = true;
    $('#cast-error').hidden = true;
    $('#cast-form-view').hidden = false;
    $('#cast-done').hidden = true;
    document.querySelectorAll('#casting-form .input').forEach((i) => i.classList.remove('is-invalid'));
  }
  function open() { resetForm(); ctx.openDialog(dialog); }

  function showPreview(url) {
    const img = $('#cast-preview');
    img.hidden = !url;
    if (url) img.src = url;
  }

  async function upload(file) {
    const status = $('#cast-upload-status');
    if (!file) return;
    status.textContent = t('pe.uploading');
    status.hidden = false;
    $('#cast-submit').disabled = true;
    try {
      const up = await window.miniappsAI.uploadFile(file, { persistence: 'durable' });
      $('#cast-photo').value = up.publicUrl;
      showPreview(up.publicUrl);
      status.textContent = t('pe.uploaded');
    } catch {
      status.textContent = t('pe.uploadFailed');
    } finally {
      $('#cast-submit').disabled = false;
    }
  }

  function fail(key, field) {
    const err = $('#cast-error');
    err.textContent = t(key);
    err.hidden = false;
    if (field) { $(field).classList.add('is-invalid'); $(field).focus(); }
  }

  async function submit(e) {
    e.preventDefault();
    document.querySelectorAll('#casting-form .input').forEach((i) => i.classList.remove('is-invalid'));
    const v = (sel) => $(sel).value.trim();
    const data = {
      name: v('#cast-name'), age: Number(v('#cast-age')), gender: v('#cast-gender'), city: v('#cast-city'),
      phone: v('#cast-phone'), instagram: v('#cast-ig'), height: v('#cast-height'), photo: v('#cast-photo'), message: v('#cast-message'),
    };
    if (!data.name) return fail('casting.errName', '#cast-name');
    if (!Number.isInteger(data.age) || data.age < 18 || data.age > 22) return fail('casting.errAge', '#cast-age');
    if (!data.gender) return fail('casting.errGender', '#cast-gender');
    if (!data.city) return fail('casting.errCity', '#cast-city');
    if (data.phone.replace(/\D/g, '').length < 7) return fail('casting.errPhone', '#cast-phone');
    if (data.photo && !/^https:\/\//i.test(data.photo)) return fail('sell.errImage', '#cast-photo');
    if (!$('#cast-consent').checked) return fail('casting.errConsent');
    $('#cast-error').hidden = true;
    const btn = $('#cast-submit');
    btn.disabled = true;
    await refresh();
    const max = apps.reduce((m, a) => Math.max(m, parseInt(String(a.id).replace(/\D/g, ''), 10) || 0), 100);
    const app = { id: 'MC-' + (max + 1), createdAt: Date.now(), ...data, status: 'new' };
    apps.push(app);
    const ok = await persist();
    btn.disabled = false;
    if (!ok) { apps = apps.filter((a) => a.id !== app.id); return; }
    mine.push(app.id);
    await ctx.save(MINE_KEY, mine);
    renderPublic();
    const genderText = t('casting.' + data.gender);
    const links = ctx.contact?.publicLinks(t('casting.waApply', { name: data.name, age: data.age, gender: genderText, city: data.city, id: app.id })) || {};
    const wa = $('#cast-done-wa'); wa.hidden = !links.wa; if (links.wa) wa.href = links.wa;
    const tg = $('#cast-done-tg'); tg.hidden = !links.tg; if (links.tg) tg.href = links.tg;
    $('#cast-done-text').textContent = t('casting.doneText', { id: app.id });
    $('#cast-form-view').hidden = true;
    $('#cast-done').hidden = false;
    ctx.toast(t('casting.sent'));
  }

  /* ---------- admin ---------- */
  function updateBadge() {
    const n = apps.filter((a) => a.status === 'new').length;
    const b = $('#admin-models-count');
    if (!b) return;
    b.hidden = n === 0;
    b.textContent = String(n);
  }

  function card(a) {
    const initials = String(a.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const meta = [t('casting.ageN', { n: a.age }), t('casting.' + a.gender), a.city, a.height].filter(Boolean).join(', ');
    const wa = ctx.contact?.phoneLink(a.phone, t('casting.waToModel', { name: a.name })) || '';
    const ig = String(a.instagram || '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
    return `<article class="model-card">
      <div class="model-photo">${a.photo ? `<img src="${esc(a.photo)}" alt="${esc(a.name)}" loading="lazy" />` : `<span>${esc(initials)}</span>`}</div>
      <div class="model-body">
        <div class="row-between"><p class="order-row-title">${esc(a.name)}</p><span class="status-chip status-${CHIP[a.status] || 'placed'}">${esc(t('casting.status.' + a.status))}</span></div>
        <p class="small muted">${esc(meta)}</p>
        <p class="small">${esc(a.phone)}${ig ? `, <a class="footer-link" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener noreferrer">@${esc(ig)}</a>` : ''}</p>
        ${a.message ? `<p class="small model-msg">${esc(a.message)}</p>` : ''}
        <p class="small muted">${esc(t('casting.appliedOn', { date: formatDate(a.createdAt, true), id: a.id }))}</p>
        <div class="model-actions">
          ${a.status !== 'shortlisted' ? `<button class="btn btn-gold btn-sm" type="button" data-cm-status="shortlisted" data-cm-id="${esc(a.id)}">${esc(t('casting.shortlist'))}</button>` : ''}
          ${a.status !== 'declined' ? `<button class="btn btn-outline btn-sm" type="button" data-cm-status="declined" data-cm-id="${esc(a.id)}">${esc(t('casting.decline'))}</button>` : ''}
          ${a.status !== 'new' ? `<button class="btn btn-outline btn-sm" type="button" data-cm-status="new" data-cm-id="${esc(a.id)}">${esc(t('casting.markNew'))}</button>` : ''}
          ${wa ? `<a class="btn btn-wa btn-sm" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${esc(t('casting.whatsapp'))}</a>` : ''}
          <button class="btn btn-outline btn-sm btn-danger" type="button" data-cm-delete="${esc(a.id)}">${esc(t('casting.delete'))}</button>
        </div>
      </div>
    </article>`;
  }

  function renderList() {
    const filter = $('#cm-filter').value;
    const order = { new: 0, shortlisted: 1, declined: 2 };
    const list = apps.filter((a) => filter === 'all' || a.status === filter)
      .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.createdAt - a.createdAt);
    $('#cm-count').textContent = t('casting.count', { n: apps.length, fresh: apps.filter((a) => a.status === 'new').length });
    $('#cm-empty').hidden = list.length > 0;
    $('#cm-list').innerHTML = list.map(card).join('');
  }
  async function renderAdmin() { renderList(); await refresh(); updateBadge(); renderList(); }

  $('#cm-filter').addEventListener('change', renderList);
  $('#cm-list').addEventListener('click', async (e) => {
    const sBtn = e.target.closest('[data-cm-status]');
    const dBtn = e.target.closest('[data-cm-delete]');
    if (sBtn) {
      const a = apps.find((x) => x.id === sBtn.dataset.cmId);
      if (!a) return;
      a.status = sBtn.dataset.cmStatus;
      if (await persist()) ctx.toast(t('casting.toast.' + a.status, { name: a.name }));
      renderList();
    } else if (dBtn) {
      const a = apps.find((x) => x.id === dBtn.dataset.cmDelete);
      if (!a || !window.confirm(t('casting.confirmDelete', { name: a.name }))) return;
      apps = apps.filter((x) => x.id !== a.id);
      if (await persist()) ctx.toast(t('casting.deleted'));
      renderList();
    }
  });

  /* ---------- wiring ---------- */
  $('#casting-apply').addEventListener('click', open);
  $('#casting-form').addEventListener('submit', submit);
  $('#cast-upload').addEventListener('change', (e) => upload(e.target.files?.[0]));
  $('#cast-photo').addEventListener('change', () => { const u = $('#cast-photo').value.trim(); showPreview(/^https:\/\//i.test(u) ? u : ''); });

  return { load, open, renderAdmin, renderPublic };
}
