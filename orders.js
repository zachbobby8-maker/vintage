// Buyer feature: order history, shipping status and chat with the merchant.
export function initOrders(ctx) {
  const { t, esc, fmt, formatDate, state } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const dialog = $('#orders-dialog');
  const listView = $('#orders-list-view');
  const detail = $('#order-detail');
  const chatInput = $('#od-chat-input');
  let currentId = null;

  const sorted = () => [...state.orders].sort((a, b) => b.createdAt - a.createdAt);
  const lastMessage = (o) => (o.messages || []).filter((m) => m.from !== 'system').slice(-1)[0];
  const STEPS = ['placed', 'processing', 'shipped', 'delivered'];

  // Tracking timeline: Placed → Packed → Shipped → Delivered (or Cancelled).
  function renderTimeline(o) {
    const box = $('#od-timeline');
    if (o.status === 'cancelled') {
      box.innerHTML = `<li class="tl-step is-cancelled"><span class="tl-dot" aria-hidden="true"></span><span class="tl-label">${esc(t('track.cancelled'))}</span></li>`;
      return;
    }
    const at = Math.max(0, STEPS.indexOf(o.status));
    box.innerHTML = STEPS.map((s, i) => `<li class="tl-step ${i < at ? 'is-done' : i === at ? 'is-current' : ''}" ${i === at ? 'aria-current="step"' : ''}>
      <span class="tl-dot" aria-hidden="true"></span><span class="tl-label">${esc(t('track.' + s))}</span>
      ${i === 0 ? `<span class="tl-sub">${esc(formatDate(o.createdAt))}</span>` : ''}</li>`).join('');
  }

  function renderList() {
    const orders = sorted();
    $('#orders-empty').hidden = orders.length > 0;
    $('#orders-list').innerHTML = orders.map((o) => {
      const last = lastMessage(o);
      const sub = last ? `${last.from === 'buyer' ? t('chat.you') : t('chat.merchant')}: ${last.text}` : t('orders.itemsCount', { n: o.items.reduce((s, i) => s + i.qty, 0) });
      return `<button class="order-row" type="button" data-open-order="${esc(o.id)}">
        <span class="order-row-main"><span class="order-row-title">${esc(o.id)}, ${esc(fmt(o.totalUsd))}</span>
        <span class="order-row-sub">${esc(sub)}</span></span>
        <span class="order-row-side"><span class="status-chip status-${esc(o.status)}">${esc(t('status.' + o.status))}</span>
        ${o.unreadBuyer ? `<span class="count-badge count-rose" aria-label="${esc(t('orders.unread', { n: o.unreadBuyer }))}">${o.unreadBuyer}</span>` : `<span class="small muted">${esc(formatDate(o.createdAt))}</span>`}</span>
      </button>`;
    }).join('');
  }

  function renderDetail() {
    const o = state.orders.find((x) => x.id === currentId);
    if (!o) { showList(); return; }
    $('#od-id').textContent = t('orders.orderNo', { id: o.id });
    $('#od-date').textContent = formatDate(o.createdAt);
    ctx.statusChip($('#od-status'), o.status);
    renderTimeline(o);
    const items = $('#od-items');
    items.innerHTML = o.items.map((i) => `<div class="mini-item"><img src="${esc(i.image)}" alt="" />
      <div class="mini-item-main"><p class="strong">${esc(i.name)}</p><p class="muted">${esc(i.shade || t('cart.oneOfOne'))}, ×${i.qty}</p>
      ${o.status === 'delivered' ? `<button class="link-btn small" type="button" data-qv="${esc(i.id)}">${esc(t('rev.write'))}</button>` : ''}</div>
      <span class="strong">${esc(fmt(i.priceUsd * i.qty))}</span></div>`).join('')
      + `<div class="row-between small"><span class="muted">${esc(t('chk.total'))}</span><span class="strong">${esc(fmt(o.totalUsd))}</span></div>`;
    const s = o.shipping || {};
    $('#od-ship').textContent = [o.customer?.name, s.address, s.city, s.country].filter(Boolean).join(', ');
    $('#od-method').textContent = s.methodName || '';
    const tracking = $('#od-tracking');
    tracking.hidden = !s.tracking;
    tracking.textContent = t('orders.tracking', { carrier: s.carrier || t('common.carrier'), tracking: s.tracking || '' });
    ctx.contact?.fillOrderLinks(o);
    ctx.renderChat($('#od-chat-log'), o, 'buyer');
  }

  function showList() {
    currentId = null;
    detail.hidden = true;
    listView.hidden = false;
    renderList();
  }

  function openDetail(id) {
    currentId = id;
    listView.hidden = true;
    detail.hidden = false;
    renderDetail();
    markRead();
  }

  function markRead() {
    const o = state.orders.find((x) => x.id === currentId);
    if (o && o.unreadBuyer > 0) ctx.updateOrder(o.id, (x) => { x.unreadBuyer = 0; });
  }

  function open(id) {
    ctx.openDialog(dialog);
    if (id && state.orders.some((o) => o.id === id)) openDetail(id);
    else showList();
  }

  $('#orders-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-order]');
    if (btn) openDetail(btn.dataset.openOrder);
  });
  $('#od-back').addEventListener('click', showList);
  $('#od-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !currentId) return;
    chatInput.value = '';
    const ok = await ctx.addMessage(currentId, 'buyer', text);
    if (ok) ctx.toast(t('toast.messageSent'));
    else chatInput.value = text;
  });

  ctx.onOrdersChange(() => {
    if (!dialog.open) return;
    if (currentId) { renderDetail(); markRead(); } else renderList();
  });

  return { open };
}
