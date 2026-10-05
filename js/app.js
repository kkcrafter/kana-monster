// ---------- app: shared state, home screen, settings, keyboard, start-up ----------

const $ = (id) => document.getElementById(id);
const app = $('app');   // the card a session draws into

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

// Inline stroke icons (24×24), so they take the text colour and need no files.
const ICONS = {
  settings: '<path d="M4 6h10M4 12h4M12 12h8M4 18h12"/><circle cx="17" cy="6" r="2.2"/><circle cx="9.5" cy="12" r="2.2"/><circle cx="18" cy="18" r="2.2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M6 12h12M12 6v12"/>',
  speaker: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  undo: '<path d="M3.5 15a9 9 0 1 0 2.1-9.4L3 9"/><path d="M3 3v6h6"/>',
  wrong: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  right: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
};

function icon(name, size = 20, width = 2) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
  svg.innerHTML = ICONS[name];
  return svg;
}

const kbd = (text, onDark = false) => el('kbd', { className: onDark ? 'kbd on-dark' : 'kbd', textContent: text });
const UNDO_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z';

// A row of mutually exclusive buttons (practice / challenge, languages).
function seg(options, value, pick, label) {
  return el('div', { className: 'seg' }, ...options.map((o) => {
    const b = el('button', { textContent: label(o), onclick: () => pick(o) });
    b.setAttribute('aria-pressed', o === value);
    return b;
  }));
}

// ---------- settings and saved state ----------

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));

let lang = I18N[load(LANG_KEY, 'zh')] ? load(LANG_KEY, 'zh') : 'zh';
let S = I18N[lang];
let mode = load(MODE_KEY, 'read') === 'write' ? 'write' : 'read';
let sessionType = load(SESSION_KEY, 'practice') === 'challenge' ? 'challenge' : 'practice';
let practiceCount = clamp(load(COUNT_KEY, 10), 5, 100);
let challengeMins = clamp(load(MINS_KEY, 1), 1, 30);
let showCue = load(CUE_KEY, false);      // image as cue (easy) vs reveal-only (real reading practice)
let autoSpeak = load(SPEAK_KEY, false);  // the play button on the answer screen works either way
let showGuide = load(GUIDE_KEY, true);
let showNums = load(NUMS_KEY, true);
const best = load(BEST_KEY, {});          // `${mode}-${minutes}` -> most correct in one challenge

let session = null;
let screen = 'home';                     // home | question | answer | write | writeAnswer | intro | summary
let asking = null;                       // the name currently being asked, for redraws
let shown = null;                        // the read answer on screen, for redraws
let shownWrite = null;                   // the write answer on screen, for redraws
let writing = null;                      // {name, cells, order, grid}; the grid node is reused so strokes survive
let revealedAt = 0;

function showView(name) {
  $('home').hidden = name !== 'home';
  $('session').hidden = name !== 'session';
  scrollTo(0, 0);
}

// ---------- home ----------

function counts(ids) {
  let learned = 0, learning = 0;
  for (const id of ids) { const box = progress[id]; if (box >= 4) learned++; else if (box) learning++; }
  return { learned, learning, unseen: ids.length - learned - learning };
}

function renderHome() {
  const total = IDS.length, c = counts(IDS), pct = (n) => `${(100 * n / total).toFixed(1)}%`;
  const swatch = (kind, label, n) => el('span', {}, el('i', { className: `swatch ${kind}` }), `${label} ${n}`);
  $('stats').replaceChildren(
    el('div', { className: 'stats-top' },
      el('div', { className: 'stats-num' }, el('b', { textContent: c.learned }), el('span', { textContent: S.learnedOf(total) })),
      el('span', { className: 'label-note', textContent: S.gensSelected(gens.length) })),
    el('div', { className: 'meter' },
      el('span', { className: 'learned', style: `width:${pct(c.learned)}` }),
      el('span', { className: 'learning', style: `width:${pct(c.learning)}` })),
    el('div', { className: 'legend' },
      swatch('learned', S.learned, c.learned), swatch('learning', S.learning, c.learning), swatch('unseen', S.unseen, c.unseen)));

  const arrow = () => el('span', { className: 'arrow', textContent: '→' });
  $('modes').replaceChildren(...['read', 'write'].map((m) => {
    const glyph = m === 'read' ? ['ア ', arrow(), ' a'] : ['a ', arrow(), ' ', el('span', { className: 'ink', textContent: 'ア' })];
    const card = el('button', { className: 'mode-card', onclick: () => setMode(m) },
      el('span', { className: 'mode-glyph', lang: 'ja' }, ...glyph),
      el('b', { textContent: S[m] }),
      el('small', { textContent: S[`${m}Desc`] }),
      ...(m === mode ? [el('span', { className: 'tick' }, icon('check', 14, 3))] : []));
    card.setAttribute('aria-pressed', m === mode);
    return card;
  }));

  const practice = sessionType === 'practice';
  const step = (d) => {
    if (practice) save(COUNT_KEY, practiceCount = clamp(practiceCount + 5 * d, 5, 100));
    else save(MINS_KEY, challengeMins = clamp(challengeMins + d, 1, 30));
    renderHome();
  };
  $('method').replaceChildren(
    seg(['practice', 'challenge'], sessionType, setSessionType, (t) => S[t]),
    el('div', { className: 'stepper-row' },
      el('div', { className: 'stepper-text' },
        el('b', { textContent: practice ? S.countTitle : S.minsTitle }),
        el('small', { textContent: practice ? S.countDesc : S.minsDesc })),
      el('div', { className: 'stepper' },
        el('button', { className: 'step', ariaLabel: S.less, onclick: () => step(-1) }, icon('minus', 18, 2.2)),
        el('span', { className: 'step-value' }, `${practice ? practiceCount : challengeMins}`,
          el('small', { textContent: practice ? S.countUnit : S.minsUnit })),
        el('button', { className: 'step', ariaLabel: S.more, onclick: () => step(1) }, icon('plus', 18, 2.2)))));

  $('gens').replaceChildren(...GENS.map(([from, to], i) => {
    const n = i + 1, size = to - from + 1;
    let learned = 0;
    for (let id = from; id <= to; id++) if (progress[id] >= 4) learned++;
    const share = Math.round(100 * learned / size);
    const b = el('button', { className: 'gen', onclick: () => toggleGen(n) },
      el('span', { className: 'gen-box' }, icon('check', 12, 3.2)),
      el('span', { className: 'gen-title' }, el('b', { textContent: n }), el('span', { className: 'gen-name', textContent: S.gens[i] })),
      el('span', { className: 'gen-bar' }, el('span', { style: `width:${share}%` })),
      el('span', { className: 'gen-pct', textContent: `${share}%` }));
    b.setAttribute('aria-pressed', gens.includes(n));
    return b;
  }));
  $('gens-count').textContent = S.gensCount(total);

  $('start').replaceChildren(practice ? S.startPractice(practiceCount) : S.startChallenge(challengeMins), kbd('⏎', true));
}

function setMode(m) {
  if (m === mode) return;
  save(MODE_KEY, mode = m);
  renderHome();
}

function setSessionType(t) {
  if (t === sessionType) return;
  save(SESSION_KEY, sessionType = t);
  renderHome();
}

function toggleGen(n) {
  const next = gens.includes(n) ? gens.filter(g => g !== n) : [...gens, n].sort((a, b) => a - b);
  if (!next.length) return;   // keep at least one generation in the deck
  save(GENS_KEY, gens = next);
  IDS = buildDeck();
  renderHome();
}

function goHome() {
  stopSessionTimer();
  askToken++;
  speechSynthesis?.cancel();
  session = null;
  writing = null;
  screen = 'home';
  renderHome();
  showView('home');
}

// ---------- settings sheet ----------

const settings = $('settings');

function renderLangs() {
  const names = Object.keys(I18N);
  for (const id of ['lang-bar', 'lang-sheet']) $(id).replaceChildren(...seg(names, lang, setLang, (l) => I18N[l].name).children);
}

function applyLang() {
  S = I18N[lang];
  document.documentElement.lang = S.htmlLang;
  $('open-settings').replaceChildren(icon('settings', 22));
  $('open-settings').ariaLabel = S.settings;
  $('home-title').textContent = S.homeTitle;
  $('mode-label').textContent = S.modeLabel;
  $('method-label').textContent = S.methodLabel;
  $('gens-label').textContent = S.gensLabel;
  $('or-press').replaceChildren(S.orPress, ' ', kbd('⏎'));
  $('settings-title').textContent = S.settings;
  $('close-settings').textContent = S.done;
  $('lang-label').textContent = S.uiLang;
  $('cue-label').textContent = S.cue;
  $('cue-desc').textContent = S.cueDesc;
  $('speak-label').textContent = S.autospeak;
  $('speak-desc').textContent = S.autospeakDesc;
  $('shortcuts-label').textContent = S.shortcuts;
  $('shortcuts').replaceChildren(...[['⏎ Enter', S.keyEnter], ['Space', S.keySpace], [UNDO_KEY, S.keyUndo], ['Esc', S.keyEsc]]
    .flatMap(([k, what]) => [el('dt', {}, kbd(k)), el('dd', { textContent: what })]));
  const link = (href, text) => el('a', { href, textContent: text, target: '_blank', rel: 'noopener' });
  $('credits').replaceChildren(S.namesCredit, link('https://pokeapi.co', 'PokéAPI'), ' · ', S.strokeCredit,
    link('https://kanjivg.tagaini.net', 'KanjiVG'), ' (CC BY-SA 3.0)');
  renderLangs();
  renderHome();
  if (session) { renderSessionChrome(); rerender(); }
}

function setLang(code) {
  if (code === lang) return;
  save(LANG_KEY, lang = code);
  applyLang();
}

$('open-settings').addEventListener('click', () => settings.showModal());
$('close-settings').addEventListener('click', () => settings.close());
settings.addEventListener('click', (e) => { if (e.target === settings) settings.close(); });   // tap outside the sheet

$('cue').checked = showCue;
$('cue').addEventListener('change', (e) => { save(CUE_KEY, showCue = e.target.checked); rerender(); });
$('autospeak').checked = autoSpeak;
$('autospeak').addEventListener('change', (e) => {
  save(SPEAK_KEY, autoSpeak = e.target.checked);
  if (!autoSpeak) speechSynthesis?.cancel();
});

$('start').addEventListener('click', () => startSession());
$('exit').addEventListener('click', goHome);

// Redraw whatever is on screen with current settings, without re-scoring or wiping strokes.
function rerender() {
  if (screen === 'question') ask(asking, app.querySelector('input')?.value ?? '');
  else if (screen === 'answer') showAnswer(shown.name, shown.answer, shown.correct);
  else if (screen === 'write') renderWrite();
  else if (screen === 'writeAnswer') showWriteAnswer(shownWrite.name);
  else if (screen === 'intro') renderIntro();
  else if (screen === 'summary') renderSummary();
}

// ---------- keyboard ----------

// The name whose pronunciation Space should play, or null where hearing it would give the answer away.
function speakable() {
  if (screen === 'answer') return shown.name.ja;
  if (screen === 'writeAnswer') return shownWrite.name.ja;
  if (screen === 'write') return writing.name.ja;   // the reading is already on screen as romaji
  return null;
}

// What Enter does on each screen that has one main action.
const ENTER = {
  home: () => startSession(),
  answer: () => askNext(),
  write: () => finishWrite(writing.name),
  writeAnswer: () => shownWrite.grade(true),
  intro: () => startChallenge(),
  summary: () => session.primary(),
};

document.addEventListener('keydown', (e) => {
  if (settings.open) return;   // the dialog keeps its own keys; Esc closes it

  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key.toLowerCase() === 'z' || e.code === 'KeyZ')) {
    if (screen !== 'write' || e.target.closest?.('input, textarea')) return;   // inputs keep their own undo
    e.preventDefault();
    undoCell();
    return;
  }

  // Space is always pronunciation: it never scrolls, toggles a checkbox or presses a button.
  if (e.key === ' ') {
    if (e.target.matches?.('input[type="text"]')) return;   // the romaji box; nothing to speak there anyway
    e.preventDefault();
    if (e.target !== document.body) e.target.blur?.();   // keyup would otherwise activate the focused control
    const text = speakable();
    if (text && !e.repeat) speak(text);
    return;
  }

  if (e.key === 'Escape' && session) { e.preventDefault(); goHome(); return; }

  if (e.key !== 'Enter' || e.target.closest?.('input, textarea, select')) return;
  // Handled here rather than by a focused button, so the keypress that opened a screen can't also
  // press something on it (hence the guard window), and Enter means the main action, not the last click.
  if (performance.now() - revealedAt < 300 || !ENTER[screen]) return;
  e.preventDefault();
  ENTER[screen]();
});

// ---------- start ----------

applyLang();
