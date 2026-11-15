// Feature: "Brands we stock" lists for beauty and hair.
export const BEAUTY_BRANDS = [
  { name: 'Fenty Beauty', note: 'Foundation, Gloss Bomb' },
  { name: 'MAC Cosmetics', note: 'Lipstick, Studio Fix' },
  { name: 'Huda Beauty', note: 'Palettes, Lashes' },
  { name: 'Charlotte Tilbury', note: 'Pillow Talk, Flawless Filter' },
  { name: 'Rare Beauty', note: 'Soft Pinch blush' },
  { name: 'Black Opal', note: 'Deep-tone foundation' },
  { name: 'Zaron Cosmetics', note: 'Made in Nigeria' },
  { name: 'House of Tara', note: 'Made in Nigeria' },
  { name: 'Sleek MakeUP', note: 'Highlighters, Blush' },
  { name: 'Fashion Fair', note: 'Iconic for deep skin' },
  { name: 'The Ordinary', note: 'Serums, Skin prep' },
  { name: 'CeraVe', note: 'Cleansers, Moisturisers' },
];

export const HAIR_BRANDS = [
  { name: 'Mielle Organics', note: 'Rosemary mint oil' },
  { name: 'Cantu', note: 'Curl creams, Leave-ins' },
  { name: 'SheaMoisture', note: 'Natural hair care' },
  { name: 'Pattern Beauty', note: 'Curl & coil care' },
  { name: 'Olaplex', note: 'Bond repair' },
  { name: 'Ebin New York', note: 'Wonder Lace Bond' },
  { name: 'got2b', note: 'Glued edge gel' },
  { name: 'ORS Olive Oil', note: 'Edge control, Relaxers' },
  { name: 'Darling', note: 'Braids & crochet' },
  { name: 'X-pression', note: 'Braiding hair' },
  { name: 'Outre', note: 'Lace wigs' },
  { name: 'Sensationnel', note: 'Wigs, Bundles' },
  { name: 'Bobbi Boss', note: 'Wigs, Braids' },
  { name: 'FreeTress', note: 'Crochet, Ponytails' },
];

export function initBrands(ctx) {
  const { esc } = ctx;
  const render = (sel, list) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = list.map((b) => `<li class="brand-chip"><span class="brand-name">${esc(b.name)}</span><span class="brand-note">${esc(b.note)}</span></li>`).join('');
  };
  render('#brands-beauty', BEAUTY_BRANDS);
  render('#brands-hair', HAIR_BRANDS);

  // "We buy women's watches": open a ready-made message that goes straight to the admin inbox.
  const sellBtn = document.querySelector('#watch-sell');
  sellBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('bv:compose', { detail: { topic: 'watch', text: ctx.t('watch.waText') } }));
  });
}
