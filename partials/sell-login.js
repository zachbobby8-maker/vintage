// Markup for the partner-store application and admin login dialogs (injected by partials.js).
export default `
  <dialog id="sell-dialog" class="modal" aria-labelledby="sell-dlg-title">
    <div class="modal-card">
      <div class="modal-head dark">
        <div>
          <p class="eyebrow gold" data-i18n="sell.dlgEyebrow">Partner store</p>
          <h3 id="sell-dlg-title" class="display h3" data-i18n="sell.dlgTitle">Open your Braid store</h3>
        </div>
        <button class="close-btn close-btn-dark" type="button" data-close data-i18n-aria-label="common.close" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <form id="sell-form" class="stack" novalidate>
          <p class="hint" data-i18n="sell.formHint">Tell us about your store and add the pieces you want to sell.</p>
          <fieldset class="fieldset">
            <legend data-i18n="sell.aboutStore">Your store</legend>
            <div class="form-grid">
              <div class="field span-2"><label for="sell-store" data-i18n="sell.storeName">Store name</label><input id="sell-store" class="input" maxlength="60" data-i18n-placeholder="sell.storeNamePh" placeholder="Adunni Braid Studio" /></div>
              <div class="field"><label for="sell-owner" data-i18n="sell.owner">Your name</label><input id="sell-owner" class="input" autocomplete="name" maxlength="60" /></div>
              <div class="field"><label for="sell-city" data-i18n="field.city">City</label><input id="sell-city" class="input" autocomplete="address-level2" maxlength="40" data-i18n-placeholder="field.cityPh" placeholder="Lagos" /></div>
              <div class="field"><label for="sell-email" data-i18n="field.email">Email</label><input id="sell-email" type="email" class="input" autocomplete="email" /></div>
              <div class="field"><label for="sell-phone" data-i18n="field.phone">Phone / WhatsApp</label><input id="sell-phone" type="tel" class="input" autocomplete="tel" /></div>
              <div class="field span-2"><label for="sell-category" data-i18n="sell.category">What do you sell?</label>
                <select id="sell-category" class="input">
                  <option value="vanity" data-i18n="sell.catVanity">Hair & vanity accessories</option>
                  <option value="beauty" data-i18n="sell.catBeauty">Sealed beauty & makeup</option>
                  <option value="bags" data-i18n="sell.catBags">Bags & leather</option>
                  <option value="couture" data-i18n="sell.catCouture">Vintage clothing</option>
                  <option value="watches" data-i18n="sell.catWatches">Women's vintage watches</option>
                </select>
              </div>
              <div class="field span-2"><label for="sell-about" data-i18n="sell.about">Short story (optional)</label><textarea id="sell-about" class="input" rows="2" maxlength="300" data-i18n-placeholder="sell.aboutPh" placeholder="What makes your pieces special?"></textarea></div>
            </div>
          </fieldset>
          <fieldset class="fieldset">
            <legend data-i18n="sell.products">Your first pieces</legend>
            <div id="sell-products" class="stack"></div>
            <button id="sell-add-product" class="btn btn-outline btn-sm" type="button" data-i18n="sell.addProduct">+ Add another piece</button>
          </fieldset>
          <label class="check-row"><input type="checkbox" id="sell-agree" /><span data-i18n="sell.agree">I agree to the 12% commission and ship sold items within 3 days.</span></label>
          <p id="sell-error" class="form-error" role="alert" hidden></p>
          <button id="sell-submit" class="btn btn-primary btn-lg btn-block" type="submit" data-i18n="sell.submit">Submit my store</button>
        </form>
        <div id="sell-mine" class="stack" hidden>
          <p class="eyebrow eyebrow-rose" data-i18n="sell.mineTitle">Your store applications</p>
          <div id="sell-mine-list" class="stack"></div>
          <button id="sell-new" class="btn btn-outline" type="button" data-i18n="sell.applyAnother">Apply with another store</button>
        </div>
      </div>
    </div>
  </dialog>

  <dialog id="login-dialog" class="modal modal-sm" aria-labelledby="login-title">
    <form id="login-form" class="modal-card" novalidate>
      <div class="modal-head">
        <div>
          <p class="eyebrow eyebrow-rose" data-i18n="login.eyebrow">Merchant access</p>
          <h3 id="login-title" class="display h3" data-i18n="login.title">Admin login</h3>
        </div>
        <button class="close-btn" type="button" data-close data-i18n-aria-label="common.close" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <p id="login-setup-hint" class="hint" hidden data-i18n="login.setupHint">First time here? Create an admin passcode (at least 6 characters).</p>
        <div class="field"><label for="login-pass" data-i18n="login.pass">Passcode</label><input id="login-pass" type="password" class="input" autocomplete="current-password" /></div>
        <div id="login-confirm-wrap" class="field" hidden><label for="login-pass2" data-i18n="login.confirm">Confirm passcode</label><input id="login-pass2" type="password" class="input" autocomplete="new-password" /></div>
        <p id="login-error" class="form-error" role="alert" hidden></p>
        <button id="login-submit" class="btn btn-primary btn-lg btn-block" type="submit"></button>
      </div>
    </form>
  </dialog>
`;
