// Contact feature: WhatsApp / Telegram links for buyers and the merchant's contact settings tab.
const KEY = 'bv_contact';
const DEFAULTS = {
  whatsapp: '+234 801 234 5678',
  telegram: 'BraidVintageBot',
  hours: 'Mon–Sat · 9am–7pm WAT',
  showWhatsapp: true,
  showTelegram: true,
};
const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/></svg>';
const TG_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/></svg>';

export function initContact(ctx) {
  const { t, esc } = ctx;
  const $ = (sel) => document.querySelector(sel);
  let settings = { ...DEFAULTS };

  /* ---------- link helpers ---------- */
  function digits(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('0')) d = '234' + d.slice(1);
    return d;
  }
  function handle(value) {
    return String(value || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '');
  }
  function waLink(phone, text) {
    const d = digits(phone);
    return d.length >= 8 ? `https://wa.me/${d}${text ? '?text=' + encodeURIComponent(text) : ''}` : '';
  }
  function tgLink(value, orderId) {
    const h = handle(value);
    if (h.length < 4) return '';
    const isBot = /bot$/i.test(h);
    const start = orderId ? 'order_' + String(orderId).replace(/[^A-Za-z0-9_-]/g, '') : '';
    return `https://t.me/${h}${isBot && start ? '?start=' + start : ''}`;
  }
  function setLink(a, href) {
    a.hidden = !href;
    if (href) a.href = href;
  }

  /* ---------- injected markup (kept out of the oversized index.html) ---------- */
  function anchor(id, cls, icon, key) {
    return `<a id="${id}" class="btn ${cls}" target="_blank" rel="noopener noreferrer" hidden>${icon}<span>${esc(t(key))}</span></a>`;
  }

  // Buyer order detail: contact box under shipping panel
  const shipPanel = $('#od-tracking')?.closest('.panel');
  const orderBox = document.createElement('div');
  orderBox.className = 'contact-box';
  orderBox.hidden = true;
  orderBox.innerHTML = `<p class="eyebrow">${esc(t('contact.orderTitle'))}</p>
    <p class="small muted">${esc(t('contact.orderHint'))}</p>
    <div class="contact-actions">${anchor('od-wa', 'btn-wa btn-sm', WA_ICON, 'contact.whatsapp')}${anchor('od-tg', 'btn-tg btn-sm', TG_ICON, 'contact.telegram')}</div>
    <p id="od-hours" class="small muted"></p>`;
  shipPanel?.after(orderBox);

  // Footer concierge links
  const footerItem = $('#footer-chat')?.closest('li');
  const footerWa = document.createElement('li');
  footerWa.innerHTML = `<a id="footer-wa" class="footer-link" target="_blank" rel="noopener noreferrer">${esc(t('contact.footerWa'))}</a>`;
  const footerTg = document.createElement('li');
  footerTg.innerHTML = `<a id="footer-tg" class="footer-link" target="_blank" rel="noopener noreferrer">${esc(t('contact.footerTg'))}</a>`;
  footerItem?.after(footerWa, footerTg);

  // Admin order detail: WhatsApp the buyer
  const aoCustomer = $('#ao-customer');
  const buyerLink = document.createElement('div');
  buyerLink.className = 'contact-actions';
  buyerLink.innerHTML = anchor('ao-wa-buyer', 'btn-wa btn-sm', WA_ICON, 'contact.waBuyer');
  aoCustomer?.after(buyerLink);

  // Admin tab + panel
  const tabs = $('#admin-dialog .tabs');
  const tabBtn = document.createElement('button');
  tabBtn.className = 'tab';
  tabBtn.type = 'button';
  tabBtn.setAttribute('role', 'tab');
  tabBtn.setAttribute('aria-selected', 'false');
  tabBtn.dataset.tab = 'contact';
  tabBtn.textContent = t('contact.tab');
  const overviewTab = tabs?.querySelector('[data-tab="overview"]');
  if (overviewTab) overviewTab.before(tabBtn); else tabs?.appendChild(tabBtn);

  const panel = document.createElement('section');
  panel.id = 'admin-tab-contact';
  panel.className = 'tab-panel';
  panel.hidden = true;
  panel.innerHTML = `<form id="contact-form" class="panel stack" novalidate>
      <div><p class="eyebrow">${esc(t('contact.adminEyebrow'))}</p><p class="small muted">${esc(t('contact.adminHint'))}</p></div>
      <div class="form-grid">
        <div class="field"><label for="ct-wa">${esc(t('contact.waLabel'))}</label>
          <input id="ct-wa" class="input" type="tel" inputmode="tel" autocomplete="off" placeholder="${esc(t('contact.waPh'))}" /></div>
        <div class="field"><label for="ct-tg">${esc(t('contact.tgLabel'))}</label>
          <input id="ct-tg" class="input" autocomplete="off" placeholder="${esc(t('contact.tgPh'))}" /></div>
        <div class="field span-2"><label for="ct-hours">${esc(t('contact.hoursLabel'))}</label>
          <input id="ct-hours" class="input" maxlength="80" placeholder="${esc(t('contact.hoursPh'))}" /></div>
      </div>
      <label class="check-row"><input id="ct-show-wa" type="checkbox" /><span>${esc(t('contact.showWa'))}</span></label>
      <label class="check-row"><input id="ct-show-tg" type="checkbox" /><span>${esc(t('contact.showTg'))}</span></label>
      <p id="ct-error" class="form-error" role="alert" hidden></p>
      <div class="row">
        <button class="btn btn-primary" type="submit">${esc(t('contact.save'))}</button>
        ${anchor('ct-test-wa', 'btn-outline btn-sm', WA_ICON, 'contact.testWa')}
        ${anchor('ct-test-tg', 'btn-outline btn-sm', TG_ICON, 'contact.testTg')}
      </div>
    </form>
    <div class="panel stack inbox-note">
      <p class="eyebrow">${esc(t('contact.inboxTitle'))}</p>
      <p class="small">${esc(t('contact.inboxText'))}</p>
      <button id="ct-open-inbox" class="btn btn-outline btn-sm" type="button">${esc(t('contact.openInbox'))}</button>
    </div>`;
  $('#admin-tab-overview')?.before(panel);

  /* ---------- rendering ---------- */
  function renderPublic() {
    const wa = settings.showWhatsapp ? waLink(settings.whatsapp, t('contact.waGeneral')) : '';
    const tg = settings.showTelegram ? tgLink(settings.telegram) : '';
    setLink($('#footer-wa'), wa);
    footerWa.hidden = !wa;
    setLink($('#footer-tg'), tg);
    footerTg.hidden = !tg;
  }

  function fillOrderLinks(order) {
    if (!order) { orderBox.hidden = true; return; }
    const wa = settings.showWhatsapp ? waLink(settings.whatsapp, t('contact.waOrder', { id: order.id })) : '';
    const tg = settings.showTelegram ? tgLink(settings.telegram, order.id) : '';
    setLink($('#od-wa'), wa);
    setLink($('#od-tg'), tg);
    $('#od-hours').textContent = settings.hours ? t('contact.hours', { hours: settings.hours }) : '';
    $('#od-hours').hidden = !settings.hours;
    orderBox.hidden = !wa && !tg;
  }

  function fillBuyerLink(order) {
    const name = order?.customer?.name || '';
    setLink($('#ao-wa-buyer'), order ? waLink(order.customer?.phone, t('contact.waToBuyer', { name, id: order.id })) : '');
  }

  function updateTestLinks() {
    setLink($('#ct-test-wa'), waLink($('#ct-wa').value, t('contact.waGeneral')));
    setLink($('#ct-test-tg'), tgLink($('#ct-tg').value));
  }

  function renderAdmin() {
    $('#ct-wa').value = settings.whatsapp || '';
    $('#ct-tg').value = settings.telegram || '';
    $('#ct-hours').value = settings.hours || '';
    $('#ct-show-wa').checked = !!settings.showWhatsapp;
    $('#ct-show-tg').checked = !!settings.showTelegram;
    $('#ct-error').hidden = true;
    updateTestLinks();
  }

  $('#ct-wa').addEventListener('input', updateTestLinks);
  $('#ct-tg').addEventListener('input', updateTestLinks);
  $('#ct-open-inbox').addEventListener('click', () => tabs?.querySelector('[data-tab="orders"]')?.click());

  $('#contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#ct-error');
    const next = {
      whatsapp: $('#ct-wa').value.trim(),
      telegram: handle($('#ct-tg').value),
      hours: $('#ct-hours').value.trim(),
      showWhatsapp: $('#ct-show-wa').checked,
      showTelegram: $('#ct-show-tg').checked,
    };
    let msg = '';
    if (next.whatsapp && digits(next.whatsapp).length < 8) msg = 'contact.errWa';
    else if (next.telegram && next.telegram.length < 4) msg = 'contact.errTg';
    else if (next.showWhatsapp && !next.whatsapp && next.showTelegram && !next.telegram) msg = 'contact.errNone';
    if (msg) { err.textContent = t(msg); err.hidden = false; return; }
    err.hidden = true;
    settings = next;
    const ok = await ctx.save(KEY, settings);
    renderPublic();
    renderAdmin();
    if (ok) ctx.toast(t('contact.saved'));
  });

  async function load() {
    const stored = await ctx.load(KEY, null);
    if (stored && typeof stored === 'object') settings = { ...DEFAULTS, ...stored };
    else await ctx.save(KEY, settings);
    renderPublic();
  }

  function publicLinks(text) {
    return {
      wa: settings.showWhatsapp ? waLink(settings.whatsapp, text) : '',
      tg: settings.showTelegram ? tgLink(settings.telegram) : '',
    };
  }
  function phoneLink(phone, text) { return waLink(phone, text); }

  return { load, renderAdmin, fillOrderLinks, fillBuyerLink, publicLinks, phoneLink };
}
