// Feature: physical store locations (Lagos HQ + Kenya, South Africa, Ghana).
// hours: index 0 = Sunday … 6 = Saturday, each [open, close] in 24h "HH:MM" or null when closed.
const WEEK = [['12:00', '17:00'], ['10:00', '19:00'], ['10:00', '19:00'], ['10:00', '19:00'], ['10:00', '19:00'], ['10:00', '20:00'], ['10:00', '20:00']];

export const STORES = [
  {
    id: 'lagos', hq: true, country: 'NG', city: 'Lagos', name: 'Braid Vintage Head Store',
    area: 'Victoria Island', address: '14 Adeola Odeku Street, Victoria Island, Lagos',
    tz: 'Africa/Lagos', whatsapp: '', hours: WEEK,
    services: ['archive', 'wigs', 'watches', 'casting', 'collect'],
    img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'nairobi', country: 'KE', city: 'Nairobi', name: 'Braid Vintage Nairobi',
    area: 'Westlands', address: 'Westlands Road, Westlands, Nairobi',
    tz: 'Africa/Nairobi', whatsapp: '', hours: WEEK,
    services: ['archive', 'wigs', 'collect'],
    img: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'johannesburg', country: 'ZA', city: 'Johannesburg', name: 'Braid Vintage Johannesburg',
    area: 'Rosebank', address: 'Tyrwhitt Avenue, Rosebank, Johannesburg',
    tz: 'Africa/Johannesburg', whatsapp: '', hours: WEEK,
    services: ['archive', 'watches', 'collect'],
    img: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'accra', country: 'GH', city: 'Accra', name: 'Braid Vintage Accra',
    area: 'Osu', address: 'Oxford Street, Osu, Accra',
    tz: 'Africa/Accra', whatsapp: '', hours: WEEK,
    services: ['wigs', 'beauty', 'collect'],
    img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=80',
  },
];

const FALLBACK = 'https://placehold.co/600x400/F3EDE3/1A1715?text=Braid+Vintage+Store';
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };

// Current weekday + minutes in the store's own time zone.
function localNow(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value || '';
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: day < 0 ? new Date().getDay() : day, min: Number(get('hour')) * 60 + Number(get('minute')) };
  } catch {
    const d = new Date();
    return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
  }
}

function openStatus(store) {
  const { day, min } = localNow(store.tz);
  const today = store.hours[day];
  if (today && min >= toMin(today[0]) && min < toMin(today[1])) return { open: true, key: 'stores.openUntil', time: today[1] };
  if (today && min < toMin(today[0])) return { open: false, key: 'stores.opensAt', time: today[0] };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (store.hours[d]) return { open: false, key: i === 1 ? 'stores.opensTomorrow' : 'stores.opensOn', time: store.hours[d][0], dayKey: DAY_KEYS[d] };
  }
  return { open: false, key: 'stores.closed', time: '' };
}

export function initStores(ctx) {
  const { esc, t } = ctx;
  const grid = document.querySelector('#stores-grid');
  const empty = document.querySelector('#stores-empty');
  if (!grid) return { render: () => {} };
  let country = 'all';

  const hoursLine = (s) => {
    const wk = s.hours[1]; const sat = s.hours[6]; const sun = s.hours[0];
    return [
      t('stores.hoursWeek', { open: wk?.[0] || '—', close: wk?.[1] || '—' }),
      t('stores.hoursSat', { open: sat?.[0] || '—', close: sat?.[1] || '—' }),
      sun ? t('stores.hoursSun', { open: sun[0], close: sun[1] }) : t('stores.sunClosed'),
    ];
  };

  function render() {
    const list = STORES.filter((s) => country === 'all' || s.country === country);
    empty.hidden = list.length > 0;
    grid.innerHTML = list.map((s) => {
      const st = openStatus(s);
      const status = t(st.key, { time: st.time, day: st.dayKey ? t('day.' + st.dayKey) : '' });
      const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.address);
      return `<article class="store-card${s.hq ? ' is-hq' : ''}">
        <div class="store-media">
          <img src="${esc(s.img)}" alt="${esc(t('stores.imgAlt', { city: s.city }))}" loading="lazy" data-store-img />
          ${s.hq ? `<span class="store-hq">${esc(t('stores.hq'))}</span>` : ''}
        </div>
        <div class="store-body">
          <p class="eyebrow">${esc(s.area)}, ${esc(t('country.' + s.country))}</p>
          <h3 class="display h4">${esc(s.city)}</h3>
          <p class="small strong">${esc(s.name)}</p>
          <p class="small muted">${esc(s.address)}</p>
          <p class="store-status ${st.open ? 'is-open' : 'is-closed'}"><span class="store-dot" aria-hidden="true"></span>${esc(status)}</p>
          <ul class="store-hours small">${hoursLine(s).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
          <ul class="store-services">${s.services.map((k) => `<li>${esc(t('stores.svc.' + k))}</li>`).join('')}</ul>
          <div class="store-actions">
            <a class="btn btn-outline btn-sm" href="${maps}" target="_blank" rel="noopener noreferrer">${esc(t('stores.directions'))}</a>
            <button class="btn btn-primary btn-sm" type="button" data-store-msg="${esc(s.id)}">${esc(t('stores.message'))}</button>
          </div>
        </div>
      </article>`;
    }).join('');
    grid.querySelectorAll('[data-store-img]').forEach((img) => {
      img.addEventListener('error', () => { if (img.src !== FALLBACK) img.src = FALLBACK; }, { once: true });
    });
  }

  document.querySelectorAll('[data-store-country]').forEach((btn) => {
    btn.addEventListener('click', () => {
      country = btn.dataset.storeCountry;
      document.querySelectorAll('[data-store-country]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      render();
    });
  });

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-store-msg]');
    if (!btn) return;
    const s = STORES.find((x) => x.id === btn.dataset.storeMsg);
    if (!s) return;
    const text = t('stores.waText', { city: s.city, name: s.name });
    // Goes straight to the admin inbox (no WhatsApp needed).
    window.dispatchEvent(new CustomEvent('bv:compose', { detail: { topic: 'store', text } }));
  });

  render();
  // Refresh open/closed labels every minute.
  setInterval(render, 60000);
  return { render };
}
