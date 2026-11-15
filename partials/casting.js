// Markup for the model casting application dialog (injected by partials.js).
export default `
  <dialog id="casting-dialog" class="modal" aria-labelledby="cast-title">
    <form id="casting-form" class="modal-card" novalidate>
      <div class="modal-head dark">
        <div>
          <p class="eyebrow gold" data-i18n="casting.dlgEyebrow">Model casting · Ages 18–22</p>
          <h3 id="cast-title" class="display h3" data-i18n="casting.dlgTitle">Apply to model for Braid Vintage</h3>
        </div>
        <button class="close-btn close-btn-dark" type="button" data-close data-i18n-aria-label="common.close" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div id="cast-form-view" class="stack">
          <p class="hint" data-i18n="casting.formHint">Fill this in and your application goes straight to the admin's inbox.</p>
          <div class="form-grid">
            <div class="field span-2"><label for="cast-name" data-i18n="casting.name">Full name</label><input id="cast-name" class="input" maxlength="80" autocomplete="name" /></div>
            <div class="field"><label for="cast-age" data-i18n="casting.age">Age</label><input id="cast-age" class="input" type="number" min="18" max="22" step="1" inputmode="numeric" /></div>
            <div class="field"><label for="cast-gender" data-i18n="casting.gender">Gender</label>
              <select id="cast-gender" class="input">
                <option value="" data-i18n="casting.genderPick">Choose…</option>
                <option value="female" data-i18n="casting.female">Female</option>
                <option value="male" data-i18n="casting.male">Male</option>
              </select>
            </div>
            <div class="field"><label for="cast-city" data-i18n="casting.city">City</label><input id="cast-city" class="input" maxlength="60" data-i18n-placeholder="field.cityPh" placeholder="Lagos" /></div>
            <div class="field"><label for="cast-height" data-i18n="casting.height">Height (optional)</label><input id="cast-height" class="input" maxlength="20" data-i18n-placeholder="casting.heightPh" placeholder="175 cm" /></div>
            <div class="field"><label for="cast-phone" data-i18n="casting.phone">WhatsApp number</label><input id="cast-phone" class="input" type="tel" inputmode="tel" maxlength="30" data-i18n-placeholder="field.phonePh" placeholder="+234 801 234 5678" /></div>
            <div class="field"><label for="cast-ig" data-i18n="casting.instagram">Instagram (optional)</label><input id="cast-ig" class="input" maxlength="40" placeholder="@username" /></div>
          </div>
          <div class="pe-photo">
            <div class="pe-preview"><img id="cast-preview" alt="" hidden /></div>
            <div class="stack">
              <div class="field"><label for="cast-photo" data-i18n="casting.photo">Photo link (optional)</label><input id="cast-photo" class="input" type="url" placeholder="https://" /></div>
              <label class="btn btn-outline btn-sm file-btn"><input id="cast-upload" type="file" accept="image/*" class="sr-only" /><span data-i18n="casting.upload">Upload a clear photo</span></label>
              <p id="cast-upload-status" class="small muted" role="status" hidden></p>
            </div>
          </div>
          <div class="field"><label for="cast-message" data-i18n="casting.message">Message to the admin</label><textarea id="cast-message" class="input" rows="3" maxlength="600" data-i18n-placeholder="casting.messagePh" placeholder="Tell us a little about yourself."></textarea></div>
          <label class="check-row"><input id="cast-consent" type="checkbox" /><span data-i18n="casting.consent">I'm aged 18–22 and happy to be contacted about castings.</span></label>
          <p id="cast-error" class="form-error" role="alert" hidden></p>
          <button id="cast-submit" class="btn btn-primary btn-lg btn-block" type="submit" data-i18n="casting.submit">Send my application</button>
        </div>
        <div id="cast-done" class="stack cast-done" hidden>
          <p class="eyebrow eyebrow-rose" data-i18n="casting.doneEyebrow">Application sent</p>
          <h4 class="display h4" data-i18n="casting.doneTitle">Thank you! The admin will message you.</h4>
          <p id="cast-done-text" class="small muted"></p>
          <div class="contact-actions">
            <a id="cast-done-wa" class="btn btn-wa btn-sm" target="_blank" rel="noopener noreferrer" hidden><span data-i18n="casting.doneWa">Also message on WhatsApp</span></a>
            <a id="cast-done-tg" class="btn btn-tg btn-sm" target="_blank" rel="noopener noreferrer" hidden><span data-i18n="contact.telegram">Telegram</span></a>
          </div>
          <button class="btn btn-outline btn-block" type="button" data-close data-i18n="casting.doneClose">Back to the shop</button>
        </div>
      </div>
    </form>
  </dialog>
`;
