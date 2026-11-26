// Product page (quick view) markup. Filled by quickview.js, reviews.js and shop.js.
export default `
  <dialog id="qv-dialog" class="modal modal-wide" aria-labelledby="qv-name">
    <div class="modal-card qv">
      <button class="close-btn close-float" type="button" data-close data-i18n-aria-label="common.close" aria-label="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <div class="qv-media">
        <div id="qv-zoom" class="qv-main-img" role="button" tabindex="0" data-i18n-aria-label="qv.zoomAria" aria-label="Tap to zoom the photo">
          <img id="qv-img" alt="" />
          <span class="qv-zoom-hint" data-i18n="qv.zoomHint">Tap to zoom, swipe for more</span>
          <span id="qv-photo-count" class="qv-photo-count" hidden></span>
        </div>
        <div id="qv-thumbs" class="qv-thumbs" hidden></div>
      </div>
      <div class="qv-body">
        <div class="row-between">
          <div class="row"><span id="qv-badge" class="tag"></span><span id="qv-deal" class="tag tag-deal" hidden></span><span id="qv-stock" class="tag tag-outline" hidden></span></div>
          <button id="qv-wish" class="heart-btn heart-inline" type="button" aria-pressed="false" data-i18n-aria-label="shop.saveShort" aria-label="Save for later"></button>
        </div>
        <p id="qv-era" class="eyebrow"></p>
        <h3 id="qv-name" class="display h3"></h3>
        <button id="qv-rating" class="rating-btn" type="button"></button>
        <p class="row"><span id="qv-price" class="price-lg rose"></span><span id="qv-compare" class="strike" hidden></span></p>
        <p id="qv-deal-ends" class="small strong rose" hidden></p>
        <ul id="qv-delivery" class="delivery-list" hidden></ul>
        <p id="qv-desc" class="qv-desc" hidden></p>
        <ul id="qv-highlights" class="qv-highlights" hidden></ul>
        <div id="qv-shade-wrap" class="field" hidden>
          <label for="qv-shade" data-i18n="qv.shade">Shade / variant</label>
          <select id="qv-shade" class="input"></select>
        </div>
        <label id="qv-bundle-wrap" class="check-card">
          <input type="checkbox" id="qv-bundle" checked />
          <span>
            <strong><span data-i18n="qv.bundleTitle">Complete the look</span> (+<span class="bundle-price"></span>)</strong>
            <span class="small muted block" data-i18n="qv.bundleText">Add the velvet lip oil & gold tortoise claw clip set. Save 35%.</span>
          </span>
        </label>
        <label id="qv-bonnet-wrap" class="check-card" hidden>
          <input type="checkbox" id="qv-bonnet" checked />
          <span>
            <strong><span data-i18n="qv.bonnetTitle">Add a 22-momme mulberry silk bonnet</span> (+<span class="bonnet-price"></span>)</strong>
            <span class="small muted block" data-i18n="qv.bonnetText">Protects HD lace edges and keeps roller-set curls fresh overnight.</span>
          </span>
        </label>
        <div class="qv-buttons">
          <button id="qv-add" class="btn btn-outline btn-lg" type="button"></button>
          <button id="qv-buy" class="btn btn-primary btn-lg" type="button" data-i18n="qv.buyNow">Buy now</button>
        </div>

        <div id="qv-notify" class="panel stack" hidden>
          <p id="nt-title" class="strong small"></p>
          <form id="qv-notify-form" class="chat-form" novalidate>
            <label for="nt-email" class="sr-only" data-i18n="field.email">Email</label>
            <input id="nt-email" type="email" class="input" autocomplete="email" data-i18n-placeholder="notify.emailPh" placeholder="Your email" />
            <button class="btn btn-gold" type="submit" data-i18n="notify.cta">Notify me</button>
          </form>
          <p id="nt-error" class="form-error" role="alert" hidden></p>
          <p id="qv-notify-done" class="small" hidden data-i18n="notify.done">You're on the list. We'll email you.</p>
        </div>

        <section id="qv-fbt" class="fbt" aria-labelledby="fbt-title" hidden>
          <p id="fbt-title" class="eyebrow eyebrow-rose" data-i18n="fbt.title">Frequently bought together</p>
          <div id="qv-fbt-list" class="fbt-list"></div>
          <div class="row-between">
            <span class="small"><span data-i18n="fbt.total">Total for selected</span> <span id="qv-fbt-total" class="strong"></span></span>
            <button id="qv-fbt-add" class="btn btn-gold btn-sm" type="button"></button>
          </div>
        </section>

        <div class="qv-details">
          <details open>
            <summary data-i18n="qv.secMeasure">Measurements & fit</summary>
            <p id="qv-measure"></p>
            <p id="qv-fit" class="muted" hidden></p>
          </details>
          <details id="qv-sec-materials">
            <summary data-i18n="qv.secMaterials">Materials & composition</summary>
            <p id="qv-materials"></p>
          </details>
          <details id="qv-sec-condition">
            <summary data-i18n="qv.condition">Curator condition</summary>
            <p id="qv-condition"></p>
          </details>
          <details id="qv-sec-care">
            <summary data-i18n="qv.secCare">Care guide</summary>
            <p id="qv-care"></p>
          </details>
          <details id="qv-sec-prov">
            <summary data-i18n="qv.secProvenance">Provenance & authenticity</summary>
            <p id="qv-provenance"></p>
          </details>
          <details>
            <summary data-i18n="qv.secShipping">Shipping & returns</summary>
            <ul id="qv-ship-list" class="qv-highlights"></ul>
            <p class="muted" data-i18n="qv.returns">1-of-1 archive pieces are final sale. Sealed beauty can be returned unopened within 14 days. Message us from your order for help.</p>
          </details>
        </div>
        <p id="qv-sku" class="small muted" hidden></p>
      </div>

      <div class="qv-more">
        <section id="qv-reviews-sec" class="stack" aria-labelledby="rv-title">
          <div class="row-between">
            <h4 id="rv-title" class="display h4" data-i18n="rev.title">Ratings & reviews</h4>
            <button id="qv-review-toggle" class="btn btn-outline btn-sm" type="button" aria-expanded="false" aria-controls="qv-review-form" data-i18n="rev.write">Write a review</button>
          </div>
          <p id="qv-reviews-summary" class="row"></p>
          <form id="qv-review-form" class="panel stack" novalidate hidden>
            <fieldset class="fieldset">
              <legend data-i18n="rev.yourRating">Your rating</legend>
              <div class="star-input">
                <input type="radio" id="rv-s5" name="rv-stars" value="5" /><label for="rv-s5" data-i18n-aria-label="rev.s5" aria-label="5 stars"></label>
                <input type="radio" id="rv-s4" name="rv-stars" value="4" /><label for="rv-s4" data-i18n-aria-label="rev.s4" aria-label="4 stars"></label>
                <input type="radio" id="rv-s3" name="rv-stars" value="3" /><label for="rv-s3" data-i18n-aria-label="rev.s3" aria-label="3 stars"></label>
                <input type="radio" id="rv-s2" name="rv-stars" value="2" /><label for="rv-s2" data-i18n-aria-label="rev.s2" aria-label="2 stars"></label>
                <input type="radio" id="rv-s1" name="rv-stars" value="1" /><label for="rv-s1" data-i18n-aria-label="rev.s1" aria-label="1 star"></label>
              </div>
            </fieldset>
            <div class="field"><label for="rv-name" data-i18n="rev.name">Your name</label><input id="rv-name" class="input" maxlength="40" autocomplete="name" /></div>
            <div class="field"><label for="rv-text" data-i18n="rev.text">Your review</label><textarea id="rv-text" class="input" rows="3" maxlength="800" data-i18n-placeholder="rev.textPh" placeholder="How was the fit, quality and delivery?"></textarea></div>
            <div class="field"><label for="rv-photo" data-i18n="rev.photo">Add a photo (optional)</label><input id="rv-photo" type="file" accept="image/*" class="input" /></div>
            <img id="rv-photo-preview" class="review-photo" alt="" hidden />
            <p id="rv-error" class="form-error" role="alert" hidden></p>
            <button class="btn btn-primary btn-block" type="submit" data-i18n="rev.submit">Post review</button>
          </form>
          <div id="qv-review-list" class="stack"></div>
          <p id="qv-review-empty" class="small muted" hidden data-i18n="rev.none">No reviews yet. Be the first to share your thoughts.</p>
        </section>

        <section class="stack" aria-labelledby="qa-title">
          <h4 id="qa-title" class="display h4" data-i18n="qa.title">Questions & answers</h4>
          <div id="qv-qa-list" class="stack"></div>
          <p id="qv-qa-empty" class="small muted" hidden data-i18n="qa.none">No questions yet. Ask the merchant anything about this piece.</p>
          <form id="qv-ask-form" class="panel stack" novalidate>
            <div class="form-grid">
              <div class="field"><label for="qa-name" data-i18n="rev.name">Your name</label><input id="qa-name" class="input" maxlength="40" autocomplete="name" /></div>
              <div class="field"><label for="qa-text" data-i18n="qa.question">Your question</label><input id="qa-text" class="input" maxlength="400" data-i18n-placeholder="qa.questionPh" placeholder="e.g. Does it run true to size?" /></div>
            </div>
            <p id="qa-error" class="form-error" role="alert" hidden></p>
            <button class="btn btn-outline btn-block" type="submit" data-i18n="qa.ask">Ask a question</button>
          </form>
        </section>

        <section id="qv-related-sec" class="stack" aria-labelledby="rel-title" hidden>
          <h4 id="rel-title" class="display h4" data-i18n="fbt.related">Customers also bought</h4>
          <div id="qv-related" class="strip"></div>
        </section>
      </div>
    </div>
  </dialog>
`;
