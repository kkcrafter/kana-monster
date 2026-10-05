// ---------- storage ----------

const PROGRESS_KEY = 'kanamon.progress';
const CUE_KEY = 'kanamon.cue', SPEAK_KEY = 'kanamon.autospeak';
const GENS_KEY = 'kanamon.gens', LANG_KEY = 'kanamon.lang';
const MODE_KEY = 'kanamon.mode', GUIDE_KEY = 'kanamon.guide';
const SESSION_KEY = 'kanamon.session', COUNT_KEY = 'kanamon.count';
const MINS_KEY = 'kanamon.mins', BEST_KEY = 'kanamon.best', NUMS_KEY = 'kanamon.strokenums';

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const progress = load(PROGRESS_KEY, {}); // id -> Leitner box 1..5
try { localStorage.removeItem('kanamon.names.v2'); } catch {}   // old per-name PokéAPI cache, now js/names.js

// ---------- deck ----------

// National dex ranges, gen 1..9. Titles live in I18N[lang].gens.
const GENS = [
  [1, 151], [152, 251], [252, 386], [387, 493], [494, 649],
  [650, 721], [722, 809], [810, 905], [906, 1025],
];

let gens = load(GENS_KEY, [1]).filter(g => g >= 1 && g <= GENS.length);
if (!gens.length) gens = [1];

let IDS = buildDeck();
const WEIGHTS = [16, 8, 4, 2, 1];
let current = null;

function buildDeck() {
  const ids = [];
  for (const g of gens) {
    const [from, to] = GENS[g - 1];
    for (let id = from; id <= to; id++) ids.push(id);
  }
  return ids;
}

// Leitner-weighted draw, skipping ids already used this session (all of them once the deck runs out).
// ponytail: rebuilds the weighted pool each draw — ~1000 ids at most, nobody will notice
function pick(exclude = new Set()) {
  let ids = IDS.filter(id => !exclude.has(id));
  if (!ids.length) ids = IDS;
  const pool = [];
  for (const id of ids) {
    const w = WEIGHTS[(progress[id] || 1) - 1];
    for (let i = 0; i < w; i++) pool.push(id);
  }
  return pool[Math.random() * pool.length | 0];
}

// A writable katakana: excludes ・ and symbols like the ♀ in ニドラン♀; keeps ー.
const isKana = (ch) => /[\u30A1-\u30FA\u30FC]/.test(ch);

function nameOf(id) {
  const [ja, en] = NAMES[id - 1];
  return { ja, en };
}

// Same files, different hosts — raw.githubusercontent.com is blocked on some networks.
const SPRITE_HOSTS = [
  (id) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`,
  (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  (id) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${id}.png`,
];

function spriteEl(id, alt, className = '') {
  let attempt = 0;
  const img = el('img', { id: 'sprite', className, src: SPRITE_HOSTS[0](id), alt });
  img.onerror = () => {
    if (++attempt < SPRITE_HOSTS.length) { img.src = SPRITE_HOSTS[attempt](id); return; }
    img.replaceWith(el('div', { id: 'sprite', className: `${className} noimg`.trim(), textContent: S.imgFail }));
  };
  return img;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[♀♂]/g, ''));   // ニドラン♂ would be read "…osu"
  u.lang = 'ja-JP';
  u.rate = 0.85;
  speechSynthesis.speak(u);
}
