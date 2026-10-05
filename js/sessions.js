// ---------- sessions ----------
// Practice: a fixed set of N, untimed, ending in a summary with review / redo / new set.
// Challenge: one countdown over the whole run, counting how many you get right.
// askNext() puts up each card for whichever session is running.

let askToken = 0;
let sessionTimerId = null;

const bestKey = () => `${mode}-${challengeMins}`;

async function askNext() {
  const token = ++askToken;   // a newer askNext (e.g. the user left the set) wins
  asking = null;
  writing = null;
  if (session.type === 'practice' && session.results.length >= session.queue.length) return endSession();
  screen = 'loading';
  session.at = session.results.length;   // index of the card now up, for the progress bar
  renderSessionChrome();
  const id = session.type === 'practice' ? session.queue[session.results.length] : pick(session.seen);
  const name = nameOf(id);
  if (mode === 'write') {
    // Load the stroke guides before showing the card, so the glyph doesn't visibly swap shape.
    app.replaceChildren(el('div', { className: 'card-body center' }, el('div', { className: 'kana-big muted', textContent: '…' })));
    const strokes = Promise.all([...name.ja].filter(isKana).map(getStrokes));
    await Promise.race([strokes, new Promise(r => setTimeout(r, 2000))]);
    if (token !== askToken) return;
  }
  current = id;
  session.seen?.add(id);
  return mode === 'write' ? askWrite(name) : ask(name);
}

function stopSessionTimer() {
  clearInterval(sessionTimerId);
  sessionTimerId = null;
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Drawn up front so "redo" can replay exactly the same questions.
function drawSet(n) {
  const taken = new Set();
  while (taken.size < Math.min(n, IDS.length)) taken.add(pick(taken));
  return [...taken];
}

// `parent`: the finished session whose summary a one-word retry returns to.
function startSession(queue, type = sessionType, parent = null) {
  stopSessionTimer();
  askToken++;   // drop any card still loading for the previous session
  const startLearned = parent?.startLearned ?? counts(IDS).learned;
  session = type === 'practice'
    ? { type, queue: queue ?? drawSet(practiceCount), results: [], parent, startLearned }
    : { type, results: [], seen: new Set(), endsAt: 0, startLearned };
  showView('session');
  if (type === 'practice') askNext();
  else renderIntro();
}

function renderIntro() {
  asking = null;
  writing = null;
  screen = 'intro';
  renderSessionChrome();
  const top = best[bestKey()];
  app.replaceChildren(
    el('div', { className: 'card-body center' },
      el('p', { className: 'prompt-label', textContent: S.challenge }),
      el('p', { className: 'intro', textContent: S.intro(challengeMins, mode === 'write') }),
      el('p', { className: 'muted', textContent: top == null ? S.noBest : S.best(top) })),
    el('div', { className: 'card-actions' },
      el('button', { className: 'btn primary', onclick: startChallenge }, S.start, kbd('⏎', true))));
  renderKeys();
}

function startChallenge() {
  if (screen !== 'intro') return;
  session.endsAt = Date.now() + challengeMins * 60000;
  // Wall-clock based, so a throttled background tab still ends on time.
  sessionTimerId = setInterval(() => {
    if (Date.now() >= session.endsAt) endSession();
    else renderTrack();
  }, 250);
  askNext();
}

// One answer, scored once: moves the name between Leitner boxes and records it for this set.
function grade(name, correct, answer = '') {
  const box = progress[current] || 1;
  progress[current] = correct ? Math.min(box + 1, 5) : 1;
  save(PROGRESS_KEY, progress);
  session.results.push({ id: current, ja: name.ja, correct, answer });
  renderSessionChrome();
}

// Scores and saves once; renderSummary stays pure so a language switch can redraw it.
function endSession() {
  stopSessionTimer();
  askToken++;
  if (session.parent) {   // a retry from a summary: go back to that summary, already scored
    session = session.parent;
    return renderSummary();
  }
  if (session.type === 'challenge') {
    const correct = session.results.filter(r => r.correct).length;
    const prev = best[bestKey()];
    session.newBest = correct > 0 && (prev == null || correct > prev);
    if (session.newBest) { best[bestKey()] = correct; save(BEST_KEY, best); }
  }
  renderSummary();
}

function renderSummary() {
  asking = null;
  writing = null;
  screen = 'summary';
  const { type, results } = session;
  const correct = results.filter(r => r.correct).length;
  const misses = results.filter(r => !r.correct);
  const nowLearned = counts(IDS).learned;
  const top = best[bestKey()];
  const practice = type === 'practice';

  const review = () => startSession(shuffle(misses.map(r => r.id)), 'practice');
  const newSet = () => startSession(undefined, practice ? 'practice' : 'challenge');
  const redo = () => startSession(shuffle(session.queue), 'practice');
  session.primary = practice ? (misses.length ? review : newSet) : newSet;
  renderSessionChrome();

  const head = el('div', { className: 'summary-head' },
    el('p', { className: 'prompt-label', textContent: practice ? S.setDone : S.timeUp }),
    el('div', { className: 'score' },
      el('b', { textContent: correct }),
      practice ? el('span', { textContent: `/ ${results.length}` }) : el('span', { textContent: S.attempted(results.length) })),
    ...(nowLearned > session.startLearned
      ? [el('span', { className: 'delta' }, icon('up', 14, 2.6), S.learnedDelta(session.startLearned, nowLearned))] : []),
    ...(practice ? [] : [el('span', { className: session.newBest ? 'delta' : 'muted', textContent: session.newBest ? S.newBest : (top == null ? S.noBest : S.best(top)) })]));

  const list = misses.length
    ? el('section', { className: 'group' },
        el('div', { className: 'label-row' },
          el('h2', { className: 'label', textContent: S.reviewCount(misses.length) }),
          el('span', { className: 'label-note', textContent: S.tapToRetry })),
        ...misses.map(r => el('button', { className: 'miss', onclick: () => startSession([r.id], 'practice', session) },
          el('span', { className: 'miss-text' },
            el('span', { className: 'miss-kana', lang: 'ja', textContent: r.ja }),
            el('small', {}, toRomaji(r.ja), ...(r.answer ? [' · ', el('span', { className: 'no', textContent: S.you + r.answer })] : []))),
          icon('chevron', 20))))
    : results.length ? el('p', { className: 'all-correct', textContent: S.allCorrect }) : '';

  const primaryLabel = practice ? (misses.length ? S.reviewAll(misses.length) : S.newSet) : S.again;
  app.replaceChildren(
    el('div', { className: 'card-body summary' }, head, list),
    el('div', { className: 'card-actions' },
      el('button', { className: 'btn primary', onclick: () => session.primary() }, primaryLabel, kbd('⏎', true)),
      practice ? el('div', { className: 'row' },
        el('button', { className: 'btn secondary', textContent: S.redo, onclick: redo }),
        ...(misses.length ? [el('button', { className: 'btn secondary', textContent: S.newSet, onclick: newSet })] : []))
        : el('button', { className: 'btn secondary', textContent: S.home, onclick: goHome })));
  renderKeys();
}

// ---------- session chrome: top bar, side panels ----------

function renderSessionChrome() {
  $('exit').replaceChildren(icon('close', 22), el('span', { className: 'wide-only', textContent: S.exit }));
  $('exit').ariaLabel = S.exit;
  renderTrack();
  renderHistory();
}

// Practice: one segment per question (green right, red wrong, dark for the one up). Challenge: time left.
function renderTrack() {
  if (!session) return;
  const right = session.results.filter(r => r.correct).length;
  $('track').classList.toggle('timed', session.type === 'challenge');
  if (session.type === 'practice') {
    const { results, queue } = session;
    $('track').replaceChildren(...queue.map((_, i) => el('span', {
      className: i < results.length ? (results[i].correct ? 'ok' : 'no') : i === session.at && screen !== 'summary' ? 'now' : '',
    })));
    const n = Math.min(screen === 'summary' ? results.length : session.at + 1, queue.length);
    $('count').replaceChildren(el('span', { className: 'narrow-only', textContent: `${n} / ${queue.length}` }),
      el('span', { className: 'wide-only', textContent: S.progressWide(n, queue.length, right) }));
    $('subbar').hidden = true;
  } else {
    const total = challengeMins * 60000;
    const leftMs = session.endsAt ? Math.max(0, session.endsAt - Date.now()) : total;
    const left = Math.ceil(leftMs / 1000);
    $('track').replaceChildren(el('span', { className: 'time', style: `width:${100 * leftMs / total}%` }));
    $('count').replaceChildren(el('span', { className: `clock${session.endsAt && left <= 10 ? ' low' : ''}`,
      textContent: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` }));
    const top = best[bestKey()];
    $('subbar').hidden = false;
    $('subbar').replaceChildren(el('b', { textContent: S.score(right) }),
      el('span', { textContent: top == null ? '' : S.bestShort(top) }));
  }
}

function renderHistory() {
  const rows = session.results.map((r, i) => el('li', {},
    el('span', { className: 'muted', textContent: i + 1 }),
    el('span', { className: 'h-name' }, el('b', { lang: 'ja', textContent: r.ja }), el('small', { textContent: toRomaji(r.ja) })),
    el('span', { className: r.correct ? 'ok' : 'no', textContent: r.correct ? S.right : S.wrong })));
  $('history').replaceChildren(el('h2', { className: 'label', textContent: S.history }), el('ol', { className: 'history' }, ...rows));
  $('history').hidden = !rows.length;
}

// The keys that do something on the screen now up.
function renderKeys() {
  const keys = mode === 'write' && (screen === 'write' || screen === 'writeAnswer')
    ? [['⏎', screen === 'write' ? S.keyWriteDone : S.gotIt], [UNDO_KEY, S.keyUndo], ['Space', S.keySpace], ['Esc', S.keyEsc]]
    : [['⏎', S.keyEnter], ['Space', S.keySpace], ['Esc', S.keyEsc]];
  $('keys').replaceChildren(el('h2', { className: 'label', textContent: S.keys }),
    el('dl', { className: 'shortcuts' }, ...keys.flatMap(([k, what]) => [el('dt', {}, kbd(k)), el('dd', { textContent: what })])));
}
