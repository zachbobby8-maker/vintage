// "Our stores" section markup. Store cards are rendered by stores.js.
export default `
  <section id="stores" class="stores" aria-labelledby="stores-title">
    <div class="container">
      <div class="stores-head">
        <div>
          <p class="eyebrow eyebrow-rose" data-i18n="stores.eyebrow">Visit us in person</p>
          <h2 id="stores-title" class="display h2"><span data-i18n="stores.title1">Braid Vintage stores</span> <em class="rose" data-i18n="stores.title2">across Africa.</em></h2>
          <p class="muted" data-i18n="stores.lead">Our head store is in Victoria Island, Lagos, with boutiques in Nairobi, Johannesburg and Accra. Try on archive pieces, get a wig fitted or sell us your watch.</p>
        </div>
        <div class="pills" role="group" data-i18n-aria-label="stores.filterLabel" aria-label="Filter stores by country">
          <button class="pill is-active" type="button" data-store-country="all" aria-pressed="true" data-i18n="stores.all">All countries</button>
          <button class="pill" type="button" data-store-country="NG" aria-pressed="false" data-i18n="country.NG">Nigeria</button>
          <button class="pill" type="button" data-store-country="KE" aria-pressed="false" data-i18n="country.KE">Kenya</button>
          <button class="pill" type="button" data-store-country="ZA" aria-pressed="false" data-i18n="country.ZA">South Africa</button>
          <button class="pill" type="button" data-store-country="GH" aria-pressed="false" data-i18n="country.GH">Ghana</button>
        </div>
      </div>
      <div id="stores-grid" class="stores-grid"></div>
      <p id="stores-empty" class="empty-state" hidden data-i18n="stores.empty">No stores in this country yet.</p>
      <p class="small muted stores-foot" data-i18n="stores.foot">Shop online from any country — orders ship from the store closest to you.</p>
    </div>
  </section>
`;
