// Buyer "Orders & messages" dialog markup. Filled by orders.js.
export default `
  <dialog id="orders-dialog" class="modal" aria-labelledby="orders-title">
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <p class="eyebrow eyebrow-rose" data-i18n="orders.eyebrow">Client concierge</p>
          <h3 id="orders-title" class="display h3" data-i18n="orders.title">Your orders & messages</h3>
        </div>
        <button class="close-btn" type="button" data-close data-i18n-aria-label="common.close" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div id="orders-list-view">
          <p class="small muted" data-i18n="orders.hint">Tap an order to see its shipping status and message the merchant.</p>
          <div id="orders-list" class="order-list"></div>
          <div id="orders-empty" class="empty-state" hidden>
            <p class="display h4" data-i18n="orders.emptyTitle">No orders yet</p>
            <p class="small muted" data-i18n="orders.emptyText">Once you place an order you can chat with the merchant about it here.</p>
          </div>
        </div>
        <div id="order-detail" hidden>
          <button id="od-back" class="link-btn back-link" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            <span data-i18n="common.allOrders">All orders</span>
          </button>
          <div class="od-head">
            <div><p id="od-date" class="eyebrow"></p><h4 id="od-id" class="display h4"></h4></div>
            <span id="od-status" class="status-chip"></span>
          </div>
          <ol id="od-timeline" class="timeline" data-i18n-aria-label="track.label" aria-label="Order progress"></ol>
          <div id="od-items" class="mini-items"></div>
          <div class="panel">
            <p class="eyebrow" data-i18n="od.shipTo">Shipping to</p>
            <p id="od-ship" class="small"></p>
            <p id="od-method" class="small muted"></p>
            <p id="od-tracking" class="small strong" hidden></p>
          </div>
          <div class="chat">
            <p class="eyebrow" data-i18n="chat.title">Messages with the merchant</p>
            <div id="od-chat-log" class="chat-log" aria-live="polite"></div>
            <form id="od-chat-form" class="chat-form">
              <label for="od-chat-input" class="sr-only" data-i18n="chat.label">Message</label>
              <input id="od-chat-input" class="input" autocomplete="off" maxlength="600" data-i18n-placeholder="chat.placeholder" placeholder="Ask about sizing, delivery, changes…" />
              <button class="btn btn-primary" type="submit" data-i18n="chat.send">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </dialog>
`;
