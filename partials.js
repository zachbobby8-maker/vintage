// Injects secondary markup (kept out of index.html) before feature modules start.
// Markup ships as JS modules so it loads reliably everywhere (no runtime fetch needed).
import productEditor from './partials/product-editor.js';
import casting from './partials/casting.js';
import sellLogin from './partials/sell-login.js';
import checkout from './partials/checkout.js';
import stores from './partials/stores.js';
import quickview from './partials/quickview.js';
import orders from './partials/orders.js';

const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
// Plain strings go before the toast (dialogs); objects can target a page position.
const PARTIALS = [quickview, checkout, orders, sellLogin, productEditor, casting, { html: stores, before: '#casting' }];

export function translate(root, t) {
  const tr = (key) => { const v = t(key); return v && v !== key ? v : null; };
  root.querySelectorAll('[data-i18n]').forEach((el) => { const v = tr(el.dataset.i18n); if (v) el.textContent = v; });
  ATTRS.forEach((attr) => {
    root.querySelectorAll(`[data-i18n-${attr}]`).forEach((el) => {
      const v = tr(el.getAttribute(`data-i18n-${attr}`));
      if (v) el.setAttribute(attr, v);
    });
  });
}

export function loadPartials(t) {
  const toastAnchor = document.getElementById('toast');
  PARTIALS.forEach((entry) => {
    const html = typeof entry === 'string' ? entry : entry.html;
    const anchor = (typeof entry === 'object' && entry.before && document.querySelector(entry.before)) || toastAnchor;
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    translate(tpl.content, t);
    if (anchor) anchor.before(tpl.content); else document.body.appendChild(tpl.content);
  });
}
