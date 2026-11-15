// Markup for the admin product editor dialog (injected by partials.js).
export default `
  <dialog id="pe-dialog" class="modal" aria-labelledby="pe-title">
    <form id="pe-form" class="modal-card" novalidate>
      <div class="modal-head dark">
        <div>
          <p class="eyebrow gold" data-i18n="pe.eyebrow">Product catalog</p>
          <h3 id="pe-title" class="display h3"></h3>
        </div>
        <button class="close-btn close-btn-dark" type="button" data-close data-i18n-aria-label="common.close" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div id="pe-template-wrap" class="field hint">
          <label for="pe-template" data-i18n="pe.template">Start from an existing product</label>
          <select id="pe-template" class="input"></select>
        </div>
        <fieldset class="fieldset">
          <legend data-i18n="pe.basics">Basics</legend>
          <div class="form-grid">
            <div class="field span-2"><label for="pe-name" data-i18n="pe.name">Product name</label><input id="pe-name" class="input" maxlength="90" /></div>
            <div class="field"><label for="pe-category" data-i18n="pe.category">Category</label>
              <select id="pe-category" class="input">
                <option value="couture" data-i18n="cat.couture">Vintage Couture</option>
                <option value="bags" data-i18n="cat.bags">Bags & Leather</option>
                <option value="watches" data-i18n="cat.watches">Vintage Watches</option>
                <option value="beauty" data-i18n="cat.beauty">Sealed Beauty</option>
                <option value="vanity" data-i18n="cat.vanity">Vanity & Hair</option>
                <option value="wigs" data-i18n="cat.wigs">Wigs & Hair Units</option>
              </select>
            </div>
            <div class="field"><label for="pe-tag" data-i18n="pe.tag">Label</label>
              <select id="pe-tag" class="input">
                <option value="archive" data-i18n="tag.archive">1 of 1 archive</option>
                <option value="sealed" data-i18n="tag.sealed">Factory sealed</option>
                <option value="essential" data-i18n="tag.essential">Curated essential</option>
              </select>
            </div>
            <div class="field span-2"><label for="pe-era" data-i18n="pe.era">Era / subtitle</label><input id="pe-era" class="input" maxlength="80" data-i18n-placeholder="pe.eraPh" placeholder="1994 · Milan" /></div>
            <div class="field"><label for="pe-sku" data-i18n="pe.sku">SKU (optional)</label><input id="pe-sku" class="input" maxlength="30" /></div>
            <div class="field"><label class="check-row pe-check"><input type="checkbox" id="pe-oneofone" /><span data-i18n="pe.oneOfOne">One-of-a-kind piece</span></label></div>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <legend data-i18n="pe.pricing">Price & stock</legend>
          <div class="form-grid">
            <div class="field"><label for="pe-price" data-i18n="pe.price">Price (USD)</label><input id="pe-price" type="number" min="0" step="0.01" inputmode="decimal" class="input" /></div>
            <div class="field"><label for="pe-compare" data-i18n="pe.compare">Was price (optional)</label><input id="pe-compare" type="number" min="0" step="0.01" inputmode="decimal" class="input" /></div>
            <div class="field span-2"><label for="pe-stock" data-i18n="pe.stock">Units in stock (blank = unlimited)</label><input id="pe-stock" type="number" min="0" step="1" inputmode="numeric" class="input" /></div>
            <div class="field span-2"><label for="pe-shades" data-i18n="pe.shades">Shades / variants (comma separated)</label><input id="pe-shades" class="input" data-i18n-placeholder="pe.shadesPh" placeholder="Crushed Berry, Espresso Nude" /></div>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <legend data-i18n="pe.photos">Photos</legend>
          <div class="pe-photo">
            <div class="pe-preview"><img id="pe-preview" alt="" /></div>
            <div class="stack">
              <div class="field"><label for="pe-image" data-i18n="pe.image">Main photo link</label><input id="pe-image" type="url" class="input" placeholder="https://" /></div>
              <label class="btn btn-outline btn-sm file-btn"><input id="pe-upload" type="file" accept="image/*" class="sr-only" /><span data-i18n="pe.upload">Upload main photo</span></label>
            </div>
          </div>
          <div class="field"><label for="pe-gallery" data-i18n="pe.gallery">More photos (one link per line)</label><textarea id="pe-gallery" class="input" rows="2"></textarea></div>
          <label class="btn btn-outline btn-sm file-btn"><input id="pe-gallery-upload" type="file" accept="image/*" class="sr-only" /><span data-i18n="pe.uploadGallery">Upload extra photo</span></label>
          <p id="pe-upload-status" class="small muted" role="status" hidden></p>
        </fieldset>
        <fieldset class="fieldset">
          <legend data-i18n="pe.details">Details buyers see</legend>
          <div class="field"><label for="pe-description" data-i18n="pe.description">Description</label><textarea id="pe-description" class="input" rows="3" maxlength="1200"></textarea></div>
          <div class="field"><label for="pe-highlights" data-i18n="pe.highlights">Highlights (one per line)</label><textarea id="pe-highlights" class="input" rows="3"></textarea></div>
          <div class="field"><label for="pe-measurements" data-i18n="pe.measurements">Measurements / size</label><input id="pe-measurements" class="input" maxlength="200" /></div>
          <div class="field"><label for="pe-fit" data-i18n="pe.fit">Fit & sizing notes</label><textarea id="pe-fit" class="input" rows="2" maxlength="400"></textarea></div>
          <div class="field"><label for="pe-materials" data-i18n="pe.materials">Materials & composition</label><textarea id="pe-materials" class="input" rows="2" maxlength="400"></textarea></div>
          <div class="field"><label for="pe-condition" data-i18n="pe.condition">Condition</label><textarea id="pe-condition" class="input" rows="2" maxlength="400"></textarea></div>
          <div class="field"><label for="pe-care" data-i18n="pe.care">Care guide</label><textarea id="pe-care" class="input" rows="2" maxlength="400"></textarea></div>
          <div class="field"><label for="pe-provenance" data-i18n="pe.provenance">Provenance & authenticity</label><textarea id="pe-provenance" class="input" rows="2" maxlength="400"></textarea></div>
        </fieldset>
        <label class="check-row"><input type="checkbox" id="pe-hidden" /><span data-i18n="pe.hidden">Hide from the shop for now</span></label>
        <p id="pe-error" class="form-error" role="alert" hidden></p>
        <button id="pe-submit" class="btn btn-primary btn-lg btn-block" type="submit" data-i18n="pe.save">Save product</button>
        <button id="pe-delete" class="btn btn-outline btn-block btn-danger" type="button" hidden data-i18n="pe.delete">Delete product</button>
      </div>
    </form>
  </dialog>
`;
