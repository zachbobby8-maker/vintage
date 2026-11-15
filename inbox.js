// Feature: visitor/buyer messages (no order needed) + admin "Inbox" tab that also lists order chats.
const KEY = 'bv_inbox';
const MINE_KEY = 'bv_inbox_mine';
const TOPICS = ['product', 'sizing', 'delivery', 'watch', 'model', 'store', 'selling', 'other'];
const ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>';

function seed() {
  const now = Date.now();
  return [
    {
      id: 'MSG-2001', createdAt: now - 50 * 60000, topic: 'product',
      customer: { name: 'Chioma N.', contact: '+234 809 555 0133' },
      messages: [{ from: 'buyer', text: 'Hello! Is the 1994 silk slip dress still available? Can I see a photo of the back?', at: now - 50 * 60000 }],
      unreadAdmin: 1, unreadBuyer: 0,
    },
    {
      id: 'MSG-2002', createdAt: now - 2 * 86400000, topic: 'delivery',
      customer: { name: 'Grace Mensah', contact: 'grace.mensah@example.com' },
      messages: [
        { from: 'buyer', text: 'Do you deliver to Kumasi? I would like to order two wigs.', at: now - 2 * 86400000 },
        { from: 'merchant', text: 'Hi Grace, yes! Standard Tracked reaches Kumasi in 5 to 7 days, or you can pick up at our Accra store in Osu.', at: now - 2 * 86400000 + 5400000 },
      ],
      unreadAdmin: 0, unreadBuyer: 0,
    },
  ];
}

export function initInbox(ctx) {
  const { t, esc, formatDate, state } = ctx;
  const $ = (sel) => document.querySelector(sel);
  let threads = [];
  let mine = [];
  let lastRaw = '';
  let visitorId = null; // open thread in the visitor dialog
  let adminId = null; // open visitor thread in the admin inbox
  let lastAdminUnread = 0;

  /* ---------- visitor dialog ---------- */
  const dialog = document.createElement('dialog');
  dialog.id = 'msg-dialog';
  dialog.className = 'modal';
  dialog.setAttribute('aria-labelledby', 'msg-title');
  dialog.innerHTML = `<div class="modal-card">
    <div class="modal-head">
      <div><p class="eyebrow eyebrow-rose">${esc(t('inbox.eyebrow'))}</p><h3 id="msg-title" class="display h3">${esc(t('inbox.title'))}</h3></div>
      <button class="close-btn" type="button" data-close aria-label="${esc(t('common.close'))}">${ICON_CLOSE}</button>
    </div>
    <div class="modal-body">
      <div id="msg-list-view" hidden>
        <p class="eyebrow">${esc(t('inbox.mineTitle'))}</p>
        <div id="msg-mine-list" class="order-list"></div>
        <button id="msg-new" class="btn btn-outline btn-block" type="button">${esc(t('inbox.newMessage'))}</button>
      </div>
      <form id="msg-form" class="stack" novalidate hidden>
        <button id="msg-form-back" class="link-btn back-link" type="button" hidden>${ICON_BACK}<span>${esc(t('inbox.back'))}</span></button>
        <p class="small muted">${esc(t('inbox.lead'))}</p>
        <div class="form-grid">
          <div class="field"><label for="msg-name">${esc(t('inbox.name'))}</label><input id="msg-name" class="input" autocomplete="name" maxlength="80" placeholder="${esc(t('inbox.namePh'))}" /></div>
          <div class="field"><label for="msg-contact">${esc(t('inbox.contact'))}</label><input id="msg-contact" class="input" autocomplete="tel" maxlength="120" placeholder="${esc(t('inbox.contactPh'))}" /></div>
          <div class="field span-2"><label for="msg-topic">${esc(t('inbox.topic'))}</label>
            <select id="msg-topic" class="input">${TOPICS.map((k) => `<option value="${k}">${esc(t('inbox.topics.' + k))}</option>`).join('')}</select>
          </div>
          <div class="field span-2"><label for="msg-text">${esc(t('inbox.message'))}</label><textarea id="msg-text" class="input" rows="4" maxlength="600" placeholder="${esc(t('inbox.messagePh'))}"></textarea></div>
        </div>
        <p id="msg-error" class="form-error" role="alert" hidden></p>
        <button id="msg-submit" class="btn btn-primary btn-lg btn-block" type="submit">${esc(t('inbox.send'))}</button>
        <p class="small muted center" id="msg-alt-note" hidden>${esc(t('inbox.altNote'))}</p>
        <div class="contact-actions">
          <a id="msg-tg" class="btn btn-tg btn-sm" target="_blank" rel="noopener noreferrer" hidden>${esc(t('inbox.tgInstead'))}</a>
          <a id="msg-wa" class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" hidden>${esc(t('inbox.waInstead'))}</a>
        </div>
      </form>
      <div id="msg-thread" hidden>
        <button id="msg-thread-back" class="link-btn back-link" type="button">${ICON_BACK}<span>${esc(t('inbox.back'))}</span></button>
        <p id="msg-thread-topic" class="eyebrow"></p>
        <div class="chat">
          <div id="msg-chat-log" class="chat-log" aria-live="polite"></div>
          <form id="msg-chat-form" class="chat-form">
            <label for="msg-chat-input" class="sr-only">${esc(t('chat.label'))}</label>
            <input id="msg-chat-input" class="input" autocomplete="off" maxlength="600" placeholder="${esc(t('inbox.replyPh'))}" />
            <button class="btn btn-primary" type="submit">${esc(t('chat.send'))}</button>
          </form>
        </div>
      </div>
    </div>
  </div>`;
  ($('#toast') || document.body.lastChild).before(dialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  // Floating "Message us" button
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab-msg';
  fab.setAttribute('aria-label', t('inbox.fabAria'));
  fab.innerHTML = `${ICON_CHAT}<span class="fab-label">${esc(t('inbox.fab'))}</span><span id="fab-badge" class="count-badge count-rose" hidden></span>`;
  document.body.appendChild(fab);
  fab.addEventListener('click', () => open());

  /* ---------- admin tab ---------- */
  const tabs = $('#admin-dialog .tabs');
  const tabBtn = document.createElement('button');
  tabBtn.className = 'tab';
  tabBtn.type = 'button';
  tabBtn.setAttribute('role', 'tab');
  tabBtn.setAttribute('aria-selected', 'false');
  tabBtn.dataset.tab = 'inbox';
  tabBtn.innerHTML = `<span>${esc(t('inbox.tab'))}</span> <span id="admin-inbox-count" class="count-badge count-rose" hidden></span>`;
  tabs?.prepend(tabBtn);

  const panel = document.createElement('section');
  panel.id = 'admin-tab-inbox';
  panel.className = 'tab-panel';
  panel.hidden = true;
  panel.innerHTML = `<div id="ib-list-view">
      <div class="row-between">
        <p class="small muted">${esc(t('inbox.adminHint'))}</p>
        <label for="ib-filter" class="sr-only">${esc(t('inbox.filter'))}</label>
        <select id="ib-filter" class="input input-sm">
          ${['all', 'unread', 'visitors', 'orders'].map((k) => `<option value="${k}">${esc(t('inbox.filters.' + k))}</option>`).join('')}
        </select>
      </div>
      <div id="ib-list" class="order-list"></div>
      <div id="ib-empty" class="empty-state" hidden><p class="muted">${esc(t('inbox.empty'))}</p></div>
    </div>
    <div id="ib-detail" hidden>
      <button id="ib-back" class="link-btn back-link" type="button">${ICON_BACK}<span>${esc(t('inbox.back'))}</span></button>
      <div class="od-head">
        <div><p id="ib-topic" class="eyebrow"></p><h4 id="ib-name" class="display h4"></h4><p id="ib-contact" class="small muted"></p></div>
      </div>
      <div class="row ib-actions">
        <a id="ib-wa" class="btn btn-wa btn-sm" target="_blank" rel="noopener noreferrer" hidden>${esc(t('inbox.replyWa'))}</a>
        <a id="ib-mail" class="btn btn-outline btn-sm" hidden>${esc(t('inbox.replyEmail'))}</a>
        <button id="ib-delete" class="btn btn-outline btn-sm" type="button">${esc(t('inbox.delete'))}</button>
      </div>
      <div class="chat panel">
        <div id="ib-chat-log" class="chat-log" aria-live="polite"></div>
        <form id="ib-chat-form" class="chat-form">
          <label for="ib-chat-input" class="sr-only">${esc(t('chat.label'))}</label>
          <input id="ib-chat-input" class="input" autocomplete="off" maxlength="600" placeholder="${esc(t('chat.adminPlaceholder'))}" />
          <button class="btn btn-primary" type="submit">${esc(t('chat.send'))}</button>
        </form>
      </div>
    </div>`;
  $('#admin-tab-orders')?.before(panel);

  /* ---------- storage ---------- */
  const valid = (list) => (Array.isArray(list) ? list.filter((x) => x && x.id && Array.isArray(x.messages)) : null);
  async function refresh() {
    const raw = await ctx.loadRaw(KEY);
    if (raw == null || raw === lastRaw) return false;
    let parsed = null;
    try { parsed = valid(JSON.parse(raw)); } catch { parsed = null; }
    if (!parsed) return false;
    lastRaw = raw;
    threads = parsed;
    return true;
  }
  async function persist() {
    const ok = await ctx.save(KEY, threads);
    lastRaw = JSON.stringify(threads);
    renderAll();
    return ok;
  }
  // Re-read before writing so messages from other devices aren't lost.
  async function mutate(id, fn) {
    await refresh();
    const th = threads.find((x) => x.id === id);
    if (!th) return false;
    fn(th);
    return persist();
  }
  async function load() {
    const changed = await refresh();
    if (!changed && !lastRaw) { threads = seed(); await persist(); }
    const m = await ctx.load(MINE_KEY, []);
    mine = Array.isArray(m) ? m.filter((x) => typeof x === 'string') : [];
    lastAdminUnread = adminUnread();
    renderAll();
    setInterval(poll, 5000);
  }
  async function poll() {
    if (document.hidden) return;
    if (await refresh()) {
      const n = adminUnread();
      if (n > lastAdminUnread && $('#admin-dialog')?.open) {
        const latest = [...threads].filter((x) => x.unreadAdmin).sort((a, b) => lastAt(b) - lastAt(a))[0];
        ctx.toast(t('inbox.newVisitor', { name: latest?.customer?.name || t('chat.buyer') }));
      }
      lastAdminUnread = n;
      renderAll();
    }
  }

  /* ---------- helpers ---------- */
  const lastAt = (x) => (x.messages || []).slice(-1)[0]?.at || x.createdAt;
  const lastText = (x) => (x.messages || []).filter((m) => m.from !== 'system').slice(-1)[0];
  const visitorUnread = () => threads.filter((x) => mine.includes(x.id)).reduce((s, x) => s + (x.unreadBuyer || 0), 0);
  function adminUnread() {
    return threads.reduce((s, x) => s + (x.unreadAdmin || 0), 0) + state.orders.reduce((s, o) => s + (o.unreadAdmin || 0), 0);
  }
  const isEmail = (v) => /\S+@\S+\.\S+/.test(v || '');
  const setBadge = (el, n) => { if (!el) return; el.hidden = n === 0; el.textContent = String(n); };
  function renderAll() {
    setBadge($('#fab-badge'), visitorUnread());
    setBadge($('#admin-inbox-count'), adminUnread());
    if (dialog.open) renderVisitor();
    if (!panel.hidden) renderAdmin();
  }

  /* ---------- visitor views ---------- */
  function show(view) {
    $('#msg-list-view').hidden = view !== 'list';
    $('#msg-form').hidden = view !== 'form';
    $('#msg-thread').hidden = view !== 'thread';
  }
  function renderMineList() {
    const list = threads.filter((x) => mine.includes(x.id)).sort((a, b) => lastAt(b) - lastAt(a));
    $('#msg-mine-list').innerHTML = list.map((x) => {
      const last = lastText(x);
      const who = last?.from === 'merchant' ? t('chat.merchant') : t('chat.you');
      return `<button class="order-row" type="button" data-msg-thread="${esc(x.id)}">
        <span class="order-row-main"><span class="order-row-title">${esc(t('inbox.topics.' + (x.topic || 'other')))}</span>
        <span class="order-row-sub ${x.unreadBuyer ? 'msg-preview-unread' : ''}">${esc(last ? `${who}: ${last.text}` : '')}</span></span>
        <span class="order-row-side">${x.unreadBuyer ? `<span class="count-badge count-rose">${x.unreadBuyer}</span>` : `<span class="small muted">${esc(formatDate(lastAt(x)))}</span>`}</span>
      </button>`;
    }).join('');
    return list.length;
  }
  function renderVisitor() {
    if (visitorId) {
      const th = threads.find((x) => x.id === visitorId);
      if (!th) { visitorId = null; renderVisitor(); return; }
      $('#msg-thread-topic').textContent = t('inbox.topics.' + (th.topic || 'other'));
      ctx.renderChat($('#msg-chat-log'), th, 'buyer');
      if (th.unreadBuyer) mutate(th.id, (x) => { x.unreadBuyer = 0; });
      return;
    }
    if ($('#msg-form').hidden || !$('#msg-list-view').hidden) {
      if (renderMineList()) show('list');
    }
  }
  function openForm(preset) {
    visitorId = null;
    const buyer = state.buyer || {};
    const name = $('#msg-name'); const contact = $('#msg-contact');
    if (!name.value) name.value = buyer.name || '';
    if (!contact.value) contact.value = buyer.phone || buyer.email || '';
    if (preset?.topic && TOPICS.includes(preset.topic)) $('#msg-topic').value = preset.topic;
    if (preset?.text) $('#msg-text').value = preset.text;
    $('#msg-error').hidden = true;
    $('#msg-form-back').hidden = !mine.length;
    const links = ctx.contact?.publicLinks(t('inbox.waText')) || {};
    $('#msg-tg').hidden = !links.tg;
    if (links.tg) $('#msg-tg').href = links.tg;
    $('#msg-wa').hidden = !links.wa;
    if (links.wa) $('#msg-wa').href = links.wa;
    $('#msg-alt-note').hidden = !links.tg && !links.wa;
    show('form');
    if (preset) setTimeout(() => (name.value ? $('#msg-text') : name).focus(), 50);
  }
  function openThread(id) { visitorId = id; show('thread'); renderVisitor(); }
  function open() {
    ctx.openDialog(dialog);
    visitorId = null;
    if (renderMineList()) show('list'); else openForm();
  }
  // Any part of the store can open a ready-made message straight to the admin inbox.
  function compose(preset = {}) {
    ctx.openDialog(dialog);
    openForm(preset);
  }
  window.addEventListener('bv:compose', (e) => compose(e.detail || {}));

  $('#msg-new').addEventListener('click', () => openForm());
  $('#msg-form-back').addEventListener('click', () => { renderMineList(); show('list'); });
  $('#msg-thread-back').addEventListener('click', () => { visitorId = null; if (renderMineList()) show('list'); else openForm(); });
  $('#msg-mine-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-msg-thread]');
    if (b) openThread(b.dataset.msgThread);
  });
  $('#msg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#msg-name').value.trim();
    const contact = $('#msg-contact').value.trim();
    const text = $('#msg-text').value.trim();
    const err = $('#msg-error');
    let key = '';
    if (!name || !text) key = 'inbox.errRequired';
    else if (!isEmail(contact) && contact.replace(/\D/g, '').length < 7) key = 'inbox.errContact';
    if (key) { err.textContent = t(key); err.hidden = false; return; }
    err.hidden = true;
    const btn = $('#msg-submit');
    btn.disabled = true;
    btn.textContent = t('inbox.sending');
    try {
      await refresh();
      const now = Date.now();
      const th = {
        id: 'MSG-' + now.toString(36).toUpperCase().slice(-6), createdAt: now, topic: $('#msg-topic').value,
        customer: { name: name.slice(0, 80), contact: contact.slice(0, 120) },
        messages: [{ from: 'buyer', text: text.slice(0, 600), at: now }], unreadAdmin: 1, unreadBuyer: 0,
      };
      threads.push(th);
      const ok = await persist();
      if (!ok) { threads = threads.filter((x) => x.id !== th.id); return; }
      mine.push(th.id);
      await ctx.save(MINE_KEY, mine);
      $('#msg-text').value = '';
      ctx.toast(t('inbox.sent'));
      openThread(th.id);
    } finally {
      btn.disabled = false;
      btn.textContent = t('inbox.send');
    }
  });
  $('#msg-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#msg-chat-input');
    const text = input.value.trim();
    if (!text || !visitorId) return;
    input.value = '';
    const ok = await mutate(visitorId, (x) => {
      x.messages.push({ from: 'buyer', text: text.slice(0, 600), at: Date.now() });
      x.unreadAdmin = (x.unreadAdmin || 0) + 1;
    });
    if (!ok) input.value = text;
  });

  /* ---------- admin views ---------- */
  function adminRows() {
    const filter = $('#ib-filter').value;
    const rows = [];
    if (filter !== 'orders') threads.forEach((x) => rows.push({ kind: 'visitor', item: x, unread: x.unreadAdmin || 0, at: lastAt(x) }));
    if (filter !== 'visitors') {
      state.orders.forEach((o) => {
        if (!(o.messages || []).some((m) => m.from === 'buyer')) return;
        rows.push({ kind: 'order', item: o, unread: o.unreadAdmin || 0, at: lastAt(o) });
      });
    }
    return rows.filter((r) => filter !== 'unread' || r.unread > 0).sort((a, b) => b.unread - a.unread || b.at - a.at);
  }
  function renderAdminList() {
    const rows = adminRows();
    $('#ib-empty').hidden = rows.length > 0;
    $('#ib-list').innerHTML = rows.map(({ kind, item, unread }) => {
      const last = lastText(item);
      const name = item.customer?.name || t('chat.buyer');
      const sub = last ? `${last.from === 'merchant' ? t('chat.you') : name}: ${last.text}` : '';
      const tag = kind === 'order' ? t('inbox.kindOrder', { id: item.id }) : t('inbox.topics.' + (item.topic || 'other'));
      return `<button class="order-row" type="button" data-ib-${kind}="${esc(item.id)}">
        <span class="order-row-main"><span class="order-row-title">${esc(name)}</span>
        <span class="order-row-sub ${unread ? 'msg-preview-unread' : ''}">${esc(sub)}</span></span>
        <span class="order-row-side"><span class="status-chip ${kind === 'order' ? 'status-processing' : 'status-placed'}">${esc(tag)}</span>
        <span class="row"><span class="small muted">${esc(formatDate(lastAt(item), true))}</span>${unread ? `<span class="count-badge count-rose" aria-label="${esc(t('orders.unread', { n: unread }))}">${unread}</span>` : ''}</span></span>
      </button>`;
    }).join('');
  }
  function renderAdminDetail() {
    const th = threads.find((x) => x.id === adminId);
    if (!th) { showAdminList(); return; }
    $('#ib-list-view').hidden = true;
    $('#ib-detail').hidden = false;
    const c = th.customer || {};
    $('#ib-name').textContent = c.name || t('chat.buyer');
    $('#ib-contact').textContent = [c.contact, formatDate(th.createdAt, true)].filter(Boolean).join(', ');
    $('#ib-topic').textContent = t('inbox.topics.' + (th.topic || 'other'));
    const email = isEmail(c.contact);
    const wa = !email && c.contact ? ctx.contact?.phoneLink(c.contact, t('inbox.waReply', { name: c.name || '' })) : '';
    $('#ib-wa').hidden = !wa;
    if (wa) $('#ib-wa').href = wa;
    $('#ib-mail').hidden = !email;
    if (email) $('#ib-mail').href = `mailto:${encodeURIComponent(c.contact)}?subject=${encodeURIComponent(t('inbox.mailSubject'))}`;
    ctx.renderChat($('#ib-chat-log'), th, 'merchant');
    if (th.unreadAdmin) mutate(th.id, (x) => { x.unreadAdmin = 0; });
  }
  function showAdminList() {
    adminId = null;
    $('#ib-detail').hidden = true;
    $('#ib-list-view').hidden = false;
    renderAdminList();
  }
  function renderAdmin() {
    if (adminId) renderAdminDetail(); else showAdminList();
    lastAdminUnread = adminUnread();
  }

  $('#ib-filter').addEventListener('change', renderAdminList);
  $('#ib-back').addEventListener('click', showAdminList);
  $('#ib-list').addEventListener('click', (e) => {
    const v = e.target.closest('[data-ib-visitor]');
    if (v) { adminId = v.dataset.ibVisitor; renderAdminDetail(); return; }
    const o = e.target.closest('[data-ib-order]');
    if (o) ctx.admin?.openOrder(o.dataset.ibOrder);
  });
  $('#ib-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#ib-chat-input');
    const text = input.value.trim();
    if (!text || !adminId) return;
    input.value = '';
    const ok = await mutate(adminId, (x) => {
      x.messages.push({ from: 'merchant', text: text.slice(0, 600), at: Date.now() });
      x.unreadBuyer = (x.unreadBuyer || 0) + 1;
    });
    if (!ok) input.value = text;
  });
  $('#ib-delete').addEventListener('click', async () => {
    const th = threads.find((x) => x.id === adminId);
    if (!th || !window.confirm(t('inbox.confirmDelete', { name: th.customer?.name || '' }))) return;
    await refresh();
    threads = threads.filter((x) => x.id !== th.id);
    adminId = null;
    await persist();
    ctx.toast(t('inbox.deleted'));
  });

  ctx.onOrdersChange(() => renderAll());

  return { load, open, compose, renderAdmin, unread: adminUnread };
}
