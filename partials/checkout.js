// Checkout dialog markup (moved out of index.html to keep it small).
export default `
  <dialog id="checkout-dialog" class="modal" aria-labelledby="chk-title">
    <form id="checkout-form" class="modal-card" novalidate>
      <div class="modal-head dark">
        <div>
          <p class="eyebrow gold" data-i18n="chk.eyebrow">Secure settlement</p>
          <h3 id="chk-title" class="display h3" data-i18n="chk.title">Checkout</h3>
        </div>
        <button class="close-btn close-btn-dark" type="button" data-close data-i18n-aria-label="common.close" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <fieldset class="fieldset">
          <legend data-i18n="chk.contact">Contact</legend>
          <div class="form-grid">
            <div class="field"><label for="chk-name" data-i18n="field.name">Full name</label><input id="chk-name" class="input" autocomplete="name" data-i18n-placeholder="field.namePh" placeholder="Amara Okafor" /></div>
            <div class="field"><label for="chk-email" data-i18n="field.email">Email</label><input id="chk-email" type="email" class="input" autocomplete="email" data-i18n-placeholder="field.emailPh" placeholder="amara@email.com" /></div>
            <div class="field span-2"><label for="chk-phone" data-i18n="field.phone">Phone / WhatsApp</label><input id="chk-phone" type="tel" class="input" autocomplete="tel" data-i18n-placeholder="field.phonePh" placeholder="Your phone number with country code" /></div>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <legend data-i18n="chk.delivery">Delivery address</legend>
          <div class="form-grid">
            <div class="field span-2"><label for="chk-address" data-i18n="field.address">Street address</label><input id="chk-address" class="input" autocomplete="street-address" data-i18n-placeholder="field.addressPh" placeholder="14 Adeola Odeku St, Victoria Island" /></div>
            <div class="field"><label for="chk-city" data-i18n="field.city">City</label><input id="chk-city" class="input" autocomplete="address-level2" data-i18n-placeholder="field.cityPh" placeholder="Lagos" /></div>
            <div class="field"><label for="chk-country" data-i18n="field.country">Country</label><input id="chk-country" class="input" autocomplete="country-name" data-i18n-placeholder="field.countryPh" placeholder="Nigeria" /></div>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <legend data-i18n="chk.method">Shipping method</legend>
          <div id="chk-methods" class="method-list"></div>
          <p id="chk-dispatch-note" class="small muted"></p>
        </fieldset>
        <fieldset class="fieldset">
          <legend data-i18n="chk.payment">Payment</legend>
          <div class="seg seg-lg">
            <button id="rail-fiat" class="seg-btn is-active" type="button" data-rail="fiat" aria-pressed="true" data-i18n="chk.railFiat">Card / Paystack</button>
            <button id="rail-braid" class="seg-btn" type="button" data-rail="braid" aria-pressed="false" data-i18n="chk.railBraid">$BRAID wallet (5% off)</button>
          </div>
          <p id="rail-panel-fiat" class="rail-panel small" data-i18n="chk.fiatText">Visa, Mastercard, Apple Pay and Paystack (NGN/USD). Same-day courier in Lagos.</p>
          <p id="rail-panel-braid" class="rail-panel rail-dark small" hidden data-i18n="chk.braidText">Settle from BraidWallet, Ledger or MetaMask. Holders get 5% off.</p>
        </fieldset>
        <div class="field">
          <label for="chk-note" data-i18n="chk.note">Note to the merchant (optional)</label>
          <textarea id="chk-note" class="input" rows="2" maxlength="600" data-i18n-placeholder="chk.notePh" placeholder="Gift wrap, delivery time, sizing questions…"></textarea>
        </div>
        <div class="totals">
          <div class="row-between"><span data-i18n="chk.subtotal">Subtotal</span><span id="chk-subtotal"></span></div>
          <div class="row-between"><span data-i18n="chk.shipping">Shipping</span><span id="chk-shipping"></span></div>
          <div id="chk-discount-row" class="row-between rose" hidden><span data-i18n="chk.discount">$BRAID holder rebate</span><span id="chk-discount"></span></div>
          <div class="row-between total-row"><span data-i18n="chk.total">Total due today</span><span id="chk-total" class="price-lg"></span></div>
          <p id="chk-tokens" class="small muted right" hidden></p>
        </div>
        <p id="chk-error" class="form-error" role="alert" hidden></p>
        <label class="check-card">
          <input type="checkbox" id="chk-send-wa" checked />
          <span>
            <strong data-i18n="chk.sendWaTitle">Also send my order to the merchant</strong>
            <span class="small muted block" data-i18n="chk.sendWaText">Opens WhatsApp (or Telegram) with your order details ready to send, so the merchant sees it straight away.</span>
          </span>
        </label>
        <button id="chk-submit" class="btn btn-primary btn-lg btn-block" type="submit" data-i18n="chk.submit">Confirm & place order</button>
      </div>
    </form>
  </dialog>
`;
