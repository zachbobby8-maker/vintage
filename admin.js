// Merchant feature: server-checked admin login, order inbox with chat, shipping edits and settings.
// Login is checked by api/admin-login.js on Vercel against the ADMIN_* environment variables.
const LOGIN_URL = '/api/admin-login';

export function initAdmin(ctx) {
  const { t, esc, fmt, formatDate, state, KEYS } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const loginDialog = $('#login-dialog');
  const adminDialog = $('#admin-dialog');
  const passInput = $('#login-pass');
  const userInput = $('#login-user');
  const loginError = $('#login-error');
  const norm = (v) => String(v || '').trim().toLowerCase();
  let currentId = null;
  let activeTab = 'inbox';
  let methodsDraft = [];
  let lastUnread = state.orders.reduce((s, o) => s + (o.unreadAdmin || 0), 0);
  let adminName = '';

  // Shows which admin is signed in, next to "Log out".
  const who = document.createElement('span');
  who.className = 'small admin-who';
  who.hidden = true;
  $('#admin-logout')?.before(who);

  // Old self-made logins from earlier versions no longer work: wipe them.
  ctx.remove(KEYS.adminHash);
  ctx.remove(KEYS.adminUser);

  // Inbox filter: "Unread messages" quick option
  const unreadOpt = document.createElement('option');
  unreadOpt.value = 'unread';
  unreadOpt.textContent = t('admin.filterUnread');
  $('#ao-filter').options[0]?.after(unreadOpt);

  /* ---------- login ---------- */
  async function validSession() {
    const s = await ctx.load(KEYS.adminSession, null, { area: 'session' });
    if (!s || typeof s !== 'object' || !s.token || !s.exp || s.exp < Date.now()) return null;
    return s;
  }

  async function open() {
    const session = await validSession();
    if (session) { setWho(session.name); openConsole(); return; }
    await ctx.remove(KEYS.adminSession, { area: 'session' });
    passInput.value = '';
    userInput.value = '';
    loginError.hidden = true;
    ctx.openDialog(loginDialog);
    userInput.focus();
  }

  function setWho(name) {
    adminName = name || '';
    who.textContent = adminName ? t('login.signedInAs', { name: adminName }) : '';
    who.hidden = !adminName;
  }

  function showLoginError(key) { loginError.textContent = t(key); loginError.hidden = false; }

  $('#login-show').addEventListener('click', (e) => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    e.currentTarget.textContent = t(show ? 'login.hide' : 'login.show');
    e.currentTarget.setAttribute('aria-pressed', String(show));
  });

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = passInput.value;
    const user = norm(userInput.value);
    const btn = $('#login-submit');
    if (!user || !pass) { showLoginError('login.errEmpty'); return; }
    btn.disabled = true;
    loginError.hidden = true;
    try {
      let res; let data = null;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        res = await fetch(LOGIN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: user, passcode: pass }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        try { data = await res.json(); } catch { data = null; }
      } catch {
        showLoginError('login.errNetwork');
        return;
      }
      if (!data) { showLoginError('login.errSetup'); return; }
      if (data.error === 'not_configured') { showLoginError('login.errNoAdmins'); return; }
      if (!res.ok || !data.ok || !data.token) { showLoginError('login.errWrong'); passInput.select(); return; }
      await ctx.save(KEYS.adminSession, { name: data.name, token: data.token, exp: data.exp }, { area: 'session' });
      setWho(data.name);
      passInput.value = '';
      ctx.closeDialog(loginDialog);
      ctx.toast(t('login.welcomeName', { name: data.name }));
      openConsole();
    } finally {
      btn.disabled = false;
    }
  });

  async function logout() {
    await ctx.remove(KEYS.adminSession, { area: 'session' });
    setWho('');
    ctx.closeDialog(adminDialog);
    ctx.toast(t('admin.loggedOut'));
  }

  /* ---------- console ---------- */
  function openConsole() {
    ctx.openDialog(adminDialog);
    setTab(activeTab);
    if (currentId) renderDetail(); else showList();
    updateUnread();
  }

  function setTab(tab) {
    activeTab = tab;
    $$('#admin-dialog .tab').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    ['inbox', 'orders', 'products', 'sellers', 'models', 'shipping', 'contact', 'site', 'deals', 'reviews', 'overview'].forEach((name) => { const p = $('#admin-tab-' + name); if (p) p.hidden = name !== tab; });
    if (tab === 'deals') ctx.deals?.renderAdmin();
    if (tab === 'reviews') ctx.reviews?.renderAdmin();
    if (tab === 'site') ctx.siteEditor?.renderAdmin();
    if (tab === 'inbox') ctx.inbox?.renderAdmin();
    if (tab === 'models') ctx.casting?.renderAdmin();
    if (tab === 'products') ctx.catalogAdmin?.render();
    if (tab === 'sellers') ctx.sellers?.renderAdmin();
    if (tab === 'shipping') fillSettings();
    if (tab === 'contact') ctx.contact?.renderAdmin();
    if (tab === 'overview') renderOverview();
  }

  function updateUnread() {
    const n = state.orders.reduce((s, o) => s + (o.unreadAdmin || 0), 0);
    const badge = $('#admin-unread');
    badge.hidden = n === 0;
    badge.textContent = String(n);
    if (n > lastUnread && adminDialog.open) ctx.toast(t('admin.newMessage'));
    lastUnread = n;
  }

  /* ---------- orders inbox ---------- */
  function lastChat(o) {
    return (o.messages || []).filter((m) => m.from !== 'system').slice(-1)[0];
  }
  function lastActivity(o) {
    const m = (o.messages || []).slice(-1)[0];
    return m?.at || o.createdAt;
  }
  function renderList() {
    const filter = $('#ao-filter').value;
    const orders = [...state.orders]
      .filter((o) => filter === 'all' || (filter === 'unread' ? o.unreadAdmin > 0 : o.status === filter))
      .sort((a, b) => (b.unreadAdmin || 0) - (a.unreadAdmin || 0) || lastActivity(b) - lastActivity(a));
    $('#ao-empty').hidden = orders.length > 0;
    $('#ao-list').innerHTML = orders.map((o) => {
      const last = lastChat(o);
      const sub = last
        ? `${last.from === 'merchant' ? t('chat.you') : (o.customer?.name || t('chat.buyer'))}: ${last.text}`
        : [o.shipping?.city, o.shipping?.methodName, formatDate(o.createdAt)].filter(Boolean).join(', ');
      return `<button class="order-row" type="button" data-admin-order="${esc(o.id)}">
      <span class="order-row-main"><span class="order-row-title">${esc(o.id)}, ${esc(o.customer?.name || '')}</span>
      <span class="order-row-sub ${o.unreadAdmin ? 'msg-preview-unread' : ''}">${esc(sub)}</span></span>
      <span class="order-row-side"><span class="status-chip status-${esc(o.status)}">${esc(t('status.' + o.status))}</span>
      <span class="row"><span class="small strong">${esc(fmt(o.totalUsd))}</span>${o.unreadAdmin ? `<span class="count-badge count-rose" aria-label="${esc(t('orders.unread', { n: o.unreadAdmin }))}">${o.unreadAdmin}</span>` : ''}</span></span>
    </button>`;
    }).join('');
  }

  function showList() {
    currentId = null;
    $('#ao-detail').hidden = true;
    $('#ao-list-view').hidden = false;
    renderList();
  }

  function fillMethodSelect(o) {
    const methods = [...(state.shipping.methods || [])];
    const s = o.shipping || {};
    if (s.methodId && !methods.some((m) => m.id === s.methodId)) methods.push({ id: s.methodId, name: s.methodName || s.methodId });
    $('#ao-method').innerHTML = methods.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
    $('#ao-method').value = s.methodId || methods[0]?.id || '';
  }

  function renderDetail(fillForm = true) {
    const o = state.orders.find((x) => x.id === currentId);
    if (!o) { showList(); return; }
    $('#ao-list-view').hidden = true;
    $('#ao-detail').hidden = false;
    $('#ao-id').textContent = t('orders.orderNo', { id: o.id });
    $('#ao-date').textContent = formatDate(o.createdAt, true);
    $('#ao-customer').textContent = [o.customer?.name, o.customer?.email, o.customer?.phone].filter(Boolean).join(', ');
    ctx.contact?.fillBuyerLink(o);
    ctx.statusChip($('#ao-status-chip'), o.status);
    $('#ao-items').innerHTML = o.items.map((i) => `<div class="mini-item"><img src="${esc(i.image)}" alt="" />
      <div class="mini-item-main"><p class="strong">${esc(i.name)}</p><p class="muted">${esc(i.shade || t('cart.oneOfOne'))}, ×${i.qty}</p></div>
      <span class="strong">${esc(fmt(i.priceUsd * i.qty))}</span></div>`).join('');
    $('#ao-total').textContent = t('admin.totalLine', {
      total: fmt(o.totalUsd), shipping: o.shippingUsd ? fmt(o.shippingUsd) : t('chk.free'),
      rail: t(o.rail === 'braid' ? 'admin.railBraid' : 'admin.railFiat'),
    });
    const note = $('#ao-buyer-note');
    note.hidden = !o.note;
    note.textContent = t('admin.buyerNote', { note: o.note || '' });
    if (fillForm) {
      const s = o.shipping || {};
      $('#ao-status').value = o.status;
      $('#ao-name').value = o.customer?.name || '';
      $('#ao-phone').value = o.customer?.phone || '';
      $('#ao-address').value = s.address || '';
      $('#ao-city').value = s.city || '';
      $('#ao-country').value = s.country || '';
      $('#ao-carrier').value = s.carrier || '';
      $('#ao-tracking').value = s.tracking || '';
      fillMethodSelect(o);
    }
    ctx.renderChat($('#ao-chat-log'), o, 'merchant');
  }

  function markRead() {
    const o = state.orders.find((x) => x.id === currentId);
    if (o && o.unreadAdmin > 0) ctx.updateOrder(o.id, (x) => { x.unreadAdmin = 0; });
  }

  function openDetail(id) {
    currentId = id;
    renderDetail(true);
    markRead();
  }

  $('#ao-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-admin-order]');
    if (btn) openDetail(btn.dataset.adminOrder);
  });
  $('#ao-back').addEventListener('click', showList);
  $('#ao-filter').addEventListener('change', renderList);

  $('#ao-ship-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentId) return;
    const v = (sel) => $(sel).value.trim();
    if (!v('#ao-address') || !v('#ao-city') || !v('#ao-country')) { ctx.toast(t('admin.errAddress')); return; }
    const methodId = $('#ao-method').value;
    const methodName = $('#ao-method').selectedOptions[0]?.textContent || '';
    const status = $('#ao-status').value;
    const notify = $('#ao-notify').checked;
    const ok = await ctx.updateOrder(currentId, (o) => {
      o.status = status;
      o.customer = { ...(o.customer || {}), name: v('#ao-name'), phone: v('#ao-phone') };
      o.shipping = { ...(o.shipping || {}), address: v('#ao-address'), city: v('#ao-city'), country: v('#ao-country'), methodId, methodName, carrier: v('#ao-carrier'), tracking: v('#ao-tracking') };
      if (notify) {
        o.messages = o.messages || [];
        o.messages.push({ from: 'system', key: 'chat.sys.shipUpdated', vars: { status, carrier: o.shipping.carrier, tracking: o.shipping.tracking, method: methodName }, at: Date.now() });
        o.unreadBuyer = (o.unreadBuyer || 0) + 1;
      }
    });
    if (ok) ctx.toast(t('admin.saved'));
  });

  $('#ao-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#ao-chat-input');
    const text = input.value.trim();
    if (!text || !currentId) return;
    input.value = '';
    const ok = await ctx.addMessage(currentId, 'merchant', text);
    if (!ok) input.value = text;
  });

  /* ---------- shipping settings ---------- */
  function fillSettings() {
    const s = state.shipping;
    $('#set-threshold').value = s.freeThresholdUsd;
    $('#set-rate').value = s.ngnRate;
    $('#set-note').value = s.dispatchNote || '';
    methodsDraft = (s.methods || []).map((m) => ({ ...m }));
    $('#set-error').hidden = true;
    renderMethodsDraft();
  }

  function renderMethodsDraft() {
    const box = $('#set-methods');
    if (!methodsDraft.length) { box.innerHTML = `<p class="small muted">${esc(t('admin.noMethods'))}</p>`; return; }
    box.innerHTML = methodsDraft.map((m, i) => `<div class="method-edit-row">
      <div class="field"><label for="mname-${i}">${esc(t('admin.methodName'))}</label><input id="mname-${i}" class="input" data-mi="${i}" data-mk="name" value="${esc(m.name)}" /></div>
      <div class="field"><label for="mprice-${i}">${esc(t('admin.methodPrice'))}</label><input id="mprice-${i}" type="number" min="0" step="0.5" class="input" data-mi="${i}" data-mk="priceUsd" value="${esc(m.priceUsd)}" /></div>
      <div class="field"><label for="meta-${i}">${esc(t('admin.methodEta'))}</label><input id="meta-${i}" class="input" data-mi="${i}" data-mk="eta" value="${esc(m.eta)}" /></div>
      <button class="remove-btn" type="button" data-mremove="${i}" aria-label="${esc(t('admin.removeMethod', { name: m.name || '' }))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>`).join('');
  }

  $('#set-methods').addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.mi == null) return;
    const m = methodsDraft[+el.dataset.mi];
    if (m) m[el.dataset.mk] = el.dataset.mk === 'priceUsd' ? el.value : el.value;
  });
  $('#set-methods').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mremove]');
    if (!btn) return;
    methodsDraft.splice(+btn.dataset.mremove, 1);
    renderMethodsDraft();
  });
  $('#set-add-method').addEventListener('click', () => {
    methodsDraft.push({ id: 'm-' + Date.now().toString(36), name: '', priceUsd: 0, eta: '' });
    renderMethodsDraft();
    const inputs = $$('#set-methods [data-mk="name"]');
    inputs[inputs.length - 1]?.focus();
  });

  $('#ship-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#set-error');
    const threshold = Number($('#set-threshold').value);
    const rate = Number($('#set-rate').value);
    const methods = methodsDraft
      .map((m) => ({ id: m.id, name: String(m.name || '').trim(), priceUsd: Number(m.priceUsd), eta: String(m.eta || '').trim() }))
      .filter((m) => m.name);
    let msg = '';
    if (!Number.isFinite(threshold) || threshold < 0) msg = 'admin.errThreshold';
    else if (!Number.isFinite(rate) || rate < 1) msg = 'admin.errRate';
    else if (!methods.length) msg = 'admin.errMethods';
    else if (methods.some((m) => !Number.isFinite(m.priceUsd) || m.priceUsd < 0)) msg = 'admin.errPrice';
    if (msg) { err.textContent = t(msg); err.hidden = false; return; }
    err.hidden = true;
    const ok = await ctx.saveShipping({ freeThresholdUsd: threshold, ngnRate: rate, dispatchNote: $('#set-note').value.trim(), methods });
    if (ok) { ctx.toast(t('admin.settingsSaved')); fillSettings(); }
  });

  /* ---------- overview ---------- */
  function renderOverview() {
    const live = state.orders.filter((o) => o.status !== 'cancelled');
    const revenue = live.reduce((s, o) => s + (o.totalUsd || 0), 0);
    $('#m-revenue').textContent = fmt(revenue);
    $('#m-orders').textContent = String(live.length);
    $('#m-aov').textContent = fmt(live.length ? revenue / live.length : 0);
    $('#m-open').textContent = String(state.orders.filter((o) => o.status === 'placed' || o.status === 'processing').length);
    // House treasury: 70.2% blended net margin, 65% of net profit swept to the $BRAID vault.
    const MARGIN = 0.702; const SWEEP = 0.65; const BRAID_USD = 0.42;
    const net = revenue * MARGIN;
    const sweep = net * SWEEP;
    $('#tr-gross').textContent = fmt(revenue);
    $('#tr-margin').textContent = `${(MARGIN * 100).toFixed(1)}%`;
    $('#tr-net').textContent = fmt(net);
    $('#tr-sweep').textContent = fmt(sweep);
    $('#tr-braid').textContent = t('treasury.braid', { n: (sweep / BRAID_USD).toLocaleString('en-US', { maximumFractionDigits: 2 }) });
  }

  $('#admin-restock').addEventListener('click', async () => {
    await ctx.restoreStock();
    ctx.toast(t('admin.restocked'));
  });

  $$('#admin-dialog .tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#admin-logout').addEventListener('click', logout);

  ctx.onOrdersChange(() => {
    updateUnread();
    if (!adminDialog.open) return;
    if (activeTab === 'overview') renderOverview();
    if (currentId) { renderDetail(false); markRead(); } else renderList();
  });

  // Used by the Inbox tab to jump straight into an order's chat.
  function openOrder(id) {
    setTab('orders');
    openDetail(id);
  }

  return { open, openOrder };
}
