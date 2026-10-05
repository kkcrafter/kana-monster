// ---------- ui ----------

const app = document.getElementById('app');
const statsEl = document.getElementById('stats');
const cueBox = document.getElementById('cue');
const speakBox = document.getElementById('autospeak');
const genBar = document.getElementById('gens');
const langBar = document.getElementById('langs');
const modeBar = document.getElementById('modes');
const sessionsBar = document.getElementById('sessions');
const sessionBar = document.getElementById('sessionbar');
const countBox = document.getElementById('count');
const minsBox = document.getElementById('mins');
const countWrap = document.getElementById('count-wrap');
const minsWrap = document.getElementById('mins-wrap');
const countLabel = document.getElementById('count-label');
const minsLabel = document.getElementById('mins-label');
const guideBox = document.getElementById('guide');
const guideWrap = document.getElementById('guide-wrap');
const guideLabel = document.getElementById('guide-label');
const numsBox = document.getElementById('nums');
const numsWrap = document.getElementById('nums-wrap');
const numsLabel = document.getElementById('nums-label');
const footerEl = document.getElementById('footer');
const cueLabel = document.getElementById('cue-label');
const speakLabel = document.getElementById('speak-label');

let showCue = load(CUE_KEY, false);      // image as cue (easy) vs reveal-only (real reading practice)
let autoSpeak = load(SPEAK_KEY, false);  // 🔊 on the answer screen still works when this is off
let lang = I18N[load(LANG_KEY, 'zh')] ? load(LANG_KEY, 'zh') : 'zh';
let S = I18N[lang];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));

let sessionType = load(SESSION_KEY, 'practice') === 'challenge' ? 'challenge' : 'practice';
let practiceCount = clamp(load(COUNT_KEY, 10), 1, 200);
let challengeMins = clamp(load(MINS_KEY, 1), 1, 60);
const best = load(BEST_KEY, {});          // `${mode}-${minutes}` -> most correct in one challenge
let session = null;

let mode = load(MODE_KEY, 'read') === 'write' ? 'write' : 'read';
let showGuide = load(GUIDE_KEY, true);
let showNums = load(NUMS_KEY, true);

let asking = null;                       // the name currently being asked, for the cue toggle
let shown = null;                        // the answer on screen, for re-rendering on language change
let shownWrite = null;
let writing = null;                      // {name, grid, cells} — the grid node is reused so strokes survive
let screen = 'loading';                  // loading | question | answer | write | writeAnswer | intro | summary
let revealedAt = 0;

// Redraw whatever is on screen with current settings, without re-scoring or wiping strokes.
function rerender() {
  if (screen === 'question') ask(asking, app.querySelector('#app input')?.value ?? '');
  else if (screen === 'answer') showAnswer(shown.name, shown.answer, shown.correct);
  else if (screen === 'write') renderWrite();
  else if (screen === 'writeAnswer') showWriteAnswer(shownWrite.name);
  else if (screen === 'intro') renderIntro();
  else if (screen === 'summary') renderSummary();
}

cueBox.checked = showCue;
cueBox.addEventListener('change', () => {
  showCue = cueBox.checked;
  save(CUE_KEY, showCue);
  rerender();
});

speakBox.checked = autoSpeak;
speakBox.addEventListener('change', () => {
  autoSpeak = speakBox.checked;
  save(SPEAK_KEY, autoSpeak);
  if (!autoSpeak) speechSynthesis?.cancel();
});

countBox.value = practiceCount;
countBox.addEventListener('change', () => {
  countBox.value = practiceCount = clamp(countBox.value, 1, 200);
  save(COUNT_KEY, practiceCount);
  startSession();
});

minsBox.value = challengeMins;
minsBox.addEventListener('change', () => {
  minsBox.value = challengeMins = clamp(minsBox.value, 1, 60);
  save(MINS_KEY, challengeMins);
  startSession();
});

guideBox.checked = showGuide;
guideBox.addEventListener('change', () => {
  showGuide = guideBox.checked;
  save(GUIDE_KEY, showGuide);
  writing?.grid.classList.toggle('noguide', !showGuide);
});

numsBox.checked = showNums;
numsBox.addEventListener('change', () => {
  showNums = numsBox.checked;
  save(NUMS_KEY, showNums);
  writing?.grid.classList.toggle('nonums', !showNums);
});

// The name whose pronunciation Space should play, or null where hearing it would give the answer away.
function speakable() {
  if (screen === 'answer') return shown.name.ja;
  if (screen === 'writeAnswer') return shownWrite.name.ja;
  if (screen === 'write') return writing.name.ja;   // the reading is already on screen as romaji
  return null;
}

const UNDO_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z';

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key.toLowerCase() === 'z' || e.code === 'KeyZ')) {
    if (screen !== 'write' || e.target.closest?.('input, textarea')) return;   // inputs keep their own undo
    e.preventDefault();
    undoCell();
    return;
  }

  // Space is always pronunciation — it never scrolls, toggles a checkbox or presses a button.
  if (e.key === ' ') {
    if (e.target.matches?.('input[type="text"]')) return;   // the romaji box; nothing to speak there anyway
    e.preventDefault();
    if (e.target !== document.body) e.target.blur?.();   // keyup would otherwise activate the focused control
    const text = speakable();
    if (text && !e.repeat) speak(text);
    return;
  }

  if (e.key !== 'Enter') return;
  if (e.target.closest?.('input, textarea, select')) return;
  // Handled here rather than by focusing a button, so the keypress that opened
  // this screen cannot also activate something on it — hence the guard window.
  if (performance.now() - revealedAt < 300) return;
  if (screen === 'answer') { e.preventDefault(); askNext(); }
  else if (screen === 'write') { e.preventDefault(); finishWrite(writing.name); }
  else if (screen === 'intro') { e.preventDefault(); startChallenge(); }
});

function renderStats() {
  const learned = IDS.filter(id => (progress[id] || 1) >= 4).length;
  statsEl.textContent = S.stats(learned, IDS.length);
}

function renderGens() {
  genBar.replaceChildren(...GENS.map((_, i) => {
    const n = i + 1;
    const chip = el('button', { className: 'chip', onclick: () => toggleGen(n) },
      el('b', { textContent: n }),
      el('span', { textContent: S.gens[i] })
    );
    chip.setAttribute('aria-pressed', gens.includes(n));
    return chip;
  }));
}

function renderLangs() {
  langBar.replaceChildren(...Object.entries(I18N).map(([code, strings]) => {
    const b = el('button', { className: 'lang', textContent: strings.name, onclick: () => setLang(code) });
    b.setAttribute('aria-pressed', code === lang);
    return b;
  }));
}

function renderModes() {
  modeBar.replaceChildren(...['read', 'write'].map((m) => {
    const b = el('button', { className: 'lang', textContent: S[m], onclick: () => setMode(m) });
    b.setAttribute('aria-pressed', m === mode);
    return b;
  }));
  guideWrap.hidden = numsWrap.hidden = mode !== 'write';
}

function setMode(m) {
  if (m === mode) return;
  mode = m;
  save(MODE_KEY, mode);
  renderModes();
  startSession();
}

function renderSessions() {
  sessionsBar.replaceChildren(...['practice', 'challenge'].map((t) => {
    const b = el('button', { className: 'lang', textContent: S[t], onclick: () => setSessionType(t) });
    b.setAttribute('aria-pressed', t === sessionType);
    return b;
  }));
  countWrap.hidden = sessionType !== 'practice';
  minsWrap.hidden = sessionType !== 'challenge';
}

function setSessionType(t) {
  if (t === sessionType) return;
  sessionType = t;
  save(SESSION_KEY, sessionType);
  renderSessions();
  startSession();
}

function applyLang() {
  S = I18N[lang];
  document.documentElement.lang = S.htmlLang;
  cueLabel.textContent = S.cue;
  speakLabel.textContent = S.autospeak;
  guideLabel.textContent = S.guide;
  numsLabel.textContent = S.numbers;
  countLabel.textContent = S.countUnit;
  minsLabel.textContent = S.minsUnit;
  footerEl.replaceChildren(
    S.footer, ' ', S.strokeCredit, ' ',
    el('a', { href: 'https://kanjivg.tagaini.net', textContent: 'KanjiVG', target: '_blank', rel: 'noopener' }),
    ' (CC BY-SA 3.0)'
  );
  renderLangs();
  renderSessions();
  renderModes();
  renderGens();
  renderStats();
  renderSessionBar();
  rerender();
}

function setLang(code) {
  if (code === lang) return;
  lang = code;
  save(LANG_KEY, lang);
  applyLang();
}

function toggleGen(n) {
  const next = gens.includes(n) ? gens.filter(g => g !== n) : [...gens, n].sort((a, b) => a - b);
  if (!next.length) return;   // keep at least one generation in the deck
  gens = next;
  save(GENS_KEY, gens);
  IDS = buildDeck();
  renderGens();
  renderStats();
  startSession();
}

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

function showError(message) {
  app.replaceChildren(
    el('div', { style: 'text-align:center;color:var(--no)' }, S.loadFail(message)),
    el('div', { className: 'row' }, el('button', { textContent: S.retry, onclick: askNext }))
  );
}

let askToken = 0;

// Bounded, not recursive: a deck with no usable katakana names must surface, not spin.
async function askNext() {
  const token = ++askToken;   // a newer askNext (e.g. the user switched generation) wins
  asking = null;
  writing = null;
  screen = 'loading';
  if (session.type === 'practice' && session.results.length >= session.queue.length) return endSession();
  session.at = session.results.length + 1;   // the question number the bar shows until the next card
  renderSessionBar();
  app.replaceChildren(el('div', { id: 'kana', textContent: '…' }));
  for (let tries = 0; tries < 8; tries++) {
    const slot = session.results.length;
    const id = session.type === 'practice' ? session.queue[slot] : pick(session.seen);
    let name;
    try {
      name = await getName(id);
    } catch (err) {
      if (token === askToken) showError(err.name === 'TimeoutError' || err.name === 'AbortError' ? S.timeout : err.message);
      return;
    }
    if (token !== askToken) return;
    if (name.ja) {
      if (mode === 'write') {
        // Load the stroke guides before showing the card, so the glyph doesn't visibly swap shape.
        const strokes = Promise.all([...name.ja].filter(isKana).map(getStrokes));
        await Promise.race([strokes, new Promise(r => setTimeout(r, 2000))]);
        if (token !== askToken) return;
      }
      current = id;
      session.seen?.add(id);
      return mode === 'write' ? askWrite(name) : ask(name);
    }
    // No katakana name on record: swap in another id so a practice set keeps its size.
    if (session.type === 'practice') session.queue[slot] = pick(new Set(session.queue));
    else session.seen.add(id);
  }
  if (token === askToken) showError(S.noKana);
}

function ask(name, keep = '') {
  asking = name;
  screen = 'question';
  const input = el('input', {
    type: 'text', autocapitalize: 'off', autocomplete: 'off',
    autocorrect: 'off', spellcheck: false, placeholder: 'romaji', value: keep,
  });
  const submit = () => reveal(name, input.value);

  app.replaceChildren(
    ...(showCue ? [spriteEl(current, '', 'cue')] : []),
    el('div', { id: 'kana', textContent: name.ja }),
    el('div', { id: 'hint', textContent: S.kanaCount([...name.ja].filter(isKana).length) }),
    input,
    el('div', { className: 'row' },
      el('button', { textContent: S.check, onclick: submit }),
      el('button', { className: 'ghost', textContent: S.skip, onclick: () => reveal(name, '') })
    )
  );
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();   // otherwise Enter's default action lands on whatever reveal() focuses next
    submit();
  });
  input.focus();
}

// Scoring happens once, here; showAnswer is pure render so it can be re-run on a language switch.
function reveal(name, answer) {
  const correct = answer.trim() !== '' && matches(answer, name.ja);
  const box = progress[current] || 1;
  progress[current] = correct ? Math.min(box + 1, 5) : 1;
  save(PROGRESS_KEY, progress);
  renderStats();
  record(name, correct, answer);
  if (autoSpeak) speak(name.ja);
  showAnswer(name, answer, correct);
}

function showAnswer(name, answer, correct) {
  asking = null;
  screen = 'answer';
  shown = { name, answer, correct };
  revealedAt = performance.now();
  const next = el('button', { textContent: S.next, onclick: askNext });

  app.replaceChildren(
    spriteEl(current, name.en || ''),
    el('div', { id: 'answer' },
      el('div', { id: 'kana', style: 'font-size:28px', textContent: name.ja }),
      el('div', { id: 'romaji', textContent: toRomaji(name.ja) }),
      el('div', { id: 'en', textContent: name.en || '' })
    ),
    el('div', {
      id: 'verdict', className: correct ? 'ok' : 'no',
      textContent: correct ? S.correct : (answer.trim() ? S.wrong(answer.trim()) : S.skipped),
    }),
    el('div', { className: 'row' },
      next,
      el('button', { className: 'speak', textContent: S.play, onclick: () => speak(name.ja) })
    )
  );
}

// ---------- start ----------

applyLang();
startSession();
