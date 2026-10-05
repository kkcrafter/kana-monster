// ---------- sessions ----------
// Practice: a fixed set of N, untimed, ending in a summary with redo / new set.
// Challenge: one countdown over the whole run, counting how many you get right.
// askNext() puts up each card for whichever session is running.

let askToken = 0;

async function askNext() {
  const token = ++askToken;   // a newer askNext (e.g. the user switched generation) wins
  asking = null;
  writing = null;
  screen = 'loading';
  if (session.type === 'practice' && session.results.length >= session.queue.length) return endSession();
  session.at = session.results.length + 1;   // the question number the bar shows until the next card
  renderSessionBar();
  const id = session.type === 'practice' ? session.queue[session.results.length] : pick(session.seen);
  const name = nameOf(id);
  if (mode === 'write') {
    // Load the stroke guides before showing the card, so the glyph doesn't visibly swap shape.
    app.replaceChildren(el('div', { id: 'kana', textContent: '…' }));
    const strokes = Promise.all([...name.ja].filter(isKana).map(getStrokes));
    await Promise.race([strokes, new Promise(r => setTimeout(r, 2000))]);
    if (token !== askToken) return;
  }
  current = id;
  session.seen?.add(id);
  return mode === 'write' ? askWrite(name) : ask(name);
}

let sessionTimerId = null;

const bestKey = () => `${mode}-${challengeMins}`;

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
  if (type === 'practice') {
    session = { type: 'practice', queue: queue ?? drawSet(practiceCount), results: [], parent };
    askNext();
  } else {
    session = { type: 'challenge', results: [], seen: new Set(), endsAt: 0 };
    renderIntro();
  }
}

function renderIntro() {
  asking = null;
  writing = null;
  screen = 'intro';
  renderSessionBar();
  const top = best[bestKey()];
  app.replaceChildren(
    el('div', { id: 'intro', textContent: S.intro(challengeMins, mode === 'write') }),
    el('div', { id: 'best', textContent: top == null ? S.noBest : S.best(top) }),
    el('div', { className: 'row' }, el('button', { textContent: S.start, onclick: startChallenge }))
  );
}

function startChallenge() {
  if (screen !== 'intro') return;
  session.endsAt = Date.now() + challengeMins * 60000;
  // Wall-clock based, so a throttled background tab still ends on time.
  sessionTimerId = setInterval(() => {
    if (Date.now() >= session.endsAt) endSession();
    else renderSessionBar();
  }, 250);
  askNext();
}

function record(name, correct, answer = '') {
  session.results.push({ id: current, ja: name.ja, correct, answer });
  renderSessionBar();
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
  renderSessionBar();
  const { type, results } = session;
  const correct = results.filter(r => r.correct).length;
  const misses = results.filter(r => !r.correct);
  const top = best[bestKey()];

  const head = type === 'practice'
    ? [el('div', { id: 'summary-head', textContent: S.practiceDone(correct, results.length) })]
    : [
        el('div', { id: 'verdict', className: 'no', textContent: S.timeUp }),
        el('div', { id: 'summary-head', textContent: S.challengeDone(correct) }),
        el('div', { id: 'hint', textContent: S.attempted(results.length) }),
        el('div', {
          id: 'best', className: session.newBest ? 'new' : '',
          textContent: session.newBest ? S.newBest : (top == null ? S.noBest : S.best(top)),
        }),
      ];

  const list = misses.length
    ? [el('div', { id: 'misses' },
        el('div', { id: 'misses-title', textContent: S.review }),
        ...misses.map(r => el('button', { className: 'miss', onclick: () => startSession([r.id], 'practice', session) },
          r.ja, el('span', { textContent: toRomaji(r.ja) })))
      )]
    : results.length ? [el('div', { id: 'verdict', className: 'ok', textContent: S.allCorrect })] : [];

  const buttons = type === 'practice'
    ? [
        el('button', { textContent: S.newSet, onclick: () => startSession() }),
        el('button', { className: 'ghost', textContent: S.redo, onclick: () => startSession(shuffle(session.queue)) }),
      ]
    : [el('button', { textContent: S.again, onclick: () => startSession() })];

  app.replaceChildren(...head, ...list, el('div', { className: 'row' }, ...buttons));
}

function renderSessionBar() {
  if (!session) return sessionBar.replaceChildren();
  const score = el('span', { textContent: S.score(session.results.filter(r => r.correct).length) });
  if (session.type === 'practice') {
    const { results, queue } = session;
    const n = screen === 'summary' ? results.length : session.at;
    sessionBar.replaceChildren(el('span', { textContent: S.progress(n, queue.length) }), score);
  } else {
    const left = session.endsAt
      ? Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000))
      : challengeMins * 60;
    const clock = el('span', {
      textContent: `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
      className: session.endsAt && left <= 10 ? 'low' : '',
    });
    sessionBar.replaceChildren(clock, score);
  }
}
