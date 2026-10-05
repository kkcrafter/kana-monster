// ---------- write mode ----------

// Fit one name on one row where possible; never below a finger-sized 48px.
function cellSize(n) {
  const cs = getComputedStyle(app);
  const room = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    - 12 - (n - 1) * 8;   // the grid's own side padding, gaps
  const most = matchMedia('(min-width: 900px)').matches ? 96 : 76;   // the web layout has room for bigger cells
  return Math.max(48, Math.min(most, Math.floor(room / n)));
}

// One canvas per kana, with a faint character behind it to trace over.
function makeCell(ch, size, onInk) {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.lineWidth = 4;
  ctx.lineCap = ctx.lineJoin = 'round';

  const wipe = el('button', { className: 'cell-clear', hidden: true, onclick: () => cell.clear() }, icon('undo', 14, 2.4));
  // Strokes arrive from the grid's ink layer, in client coordinates.
  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const guide = el('div', { className: 'guide' });
  if (strokeCache[ch]) guide.append(strokeSvg(strokeCache[ch]));
  else {
    // Only reached if the stroke data was slow or unavailable: plain glyph now, strokes if they arrive.
    guide.textContent = ch;
    guide.style.fontSize = `${Math.round(size * 0.66)}px`;
    getStrokes(ch).then((s) => { if (s) guide.replaceChildren(strokeSvg(s)); });
  }
  const cell = el('div', { className: 'cell' }, guide, canvas, wipe);
  cell.style.width = cell.style.height = `${size}px`;
  cell.inked = false;
  cell.clear = () => { ctx.clearRect(0, 0, size, size); wipe.hidden = true; cell.inked = false; };
  cell.begin = (e) => {
    wipe.hidden = false;
    cell.inked = true;
    onInk(cell);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    ctx.beginPath();
    ctx.moveTo(...at(e));
    ctx.lineTo(...at(e));   // a tap alone should leave a dot
    ctx.stroke();
  };
  cell.extend = (e) => { ctx.lineTo(...at(e)); ctx.stroke(); };
  return cell;
}

// The single element under the pointer anywhere in the writing band: routes strokes to the cell
// they start in, and does the hover the cells can no longer receive themselves.
function inkLayer(cells) {
  const layer = el('div', { className: 'ink-layer' });
  const cellAt = (e, side, above, below) => cells.find((c) => {
    const r = c.getBoundingClientRect();
    return e.clientX >= r.left - side && e.clientX <= r.right + side
      && e.clientY >= r.top - above && e.clientY <= r.bottom + below;
  });
  const hover = (cell) => { for (const c of cells) c.classList.toggle('hover', c === cell); };
  let active = null;

  layer.addEventListener('pointerdown', (e) => {
    active = cellAt(e, 0, 0, 0);   // a stroke belongs to the cell it starts in
    if (!active) return;
    layer.setPointerCapture(e.pointerId);
    active.begin(e);
  });
  layer.addEventListener('pointermove', (e) => {
    if (active) active.extend(e);
    // generous zone: the strip below holds the ↺ button, the strip above the dakuten numbers
    hover(active || cellAt(e, 4, 10, 38));
  });
  for (const ev of ['pointerup', 'pointercancel']) layer.addEventListener(ev, () => { active = null; });
  layer.addEventListener('pointerleave', () => { if (!active) hover(null); });
  return layer;
}

function askWrite(name) {
  const chars = [...name.ja].filter(isKana);
  const size = cellSize(chars.length);
  const order = [];   // cells by most recent stroke, latest last — what ⌘Z / Ctrl+Z walks back through
  const touched = (cell) => { const i = order.indexOf(cell); if (i >= 0) order.splice(i, 1); order.push(cell); };
  const cells = chars.map(ch => makeCell(ch, size, touched));
  writing = { name, cells, order, grid: el('div', { id: 'cells' }, ...cells, inkLayer(cells)) };
  renderWrite();
}

// Pure layout. The grid node is reused, so strokes survive a redraw.
function renderWrite() {
  const { name, cells, grid } = writing;
  asking = name;
  screen = 'write';
  grid.classList.toggle('noguide', !showGuide);
  grid.classList.toggle('nonums', !showNums);
  for (const b of grid.querySelectorAll('.cell-clear')) { b.title = `${S.clearOne} (${UNDO_KEY})`; b.ariaLabel = S.clearOne; }
  const chip = (on, label, flip) => {
    const b = el('button', { className: 'chip', textContent: label, onclick: () => { flip(); renderWrite(); } });
    b.setAttribute('aria-pressed', on);
    return b;
  };

  app.replaceChildren(
    el('div', { className: 'card-body center' },
      ...(showCue ? [spriteEl(current, '', 'cue')] : []),
      el('p', { className: 'prompt-label', textContent: S.writePrompt }),
      el('div', { className: 'prompt-line' },
        el('span', { className: 'romaji-prompt', textContent: toRomaji(name.ja) }),
        el('button', { className: 'round', ariaLabel: S.play, onclick: () => speak(name.ja) }, icon('speaker', 18))),
      el('p', { className: 'muted', textContent: S.writeCount(cells.length) }),
      grid,
      el('div', { className: 'chips' },
        chip(showGuide, S.guide, () => save(GUIDE_KEY, showGuide = !showGuide)),
        chip(showNums, S.numbers, () => save(NUMS_KEY, showNums = !showNums)),
        el('button', { className: 'chip', onclick: undoCell }, icon('undo', 16, 2.4), S.undo, el('span', { className: 'chip-key', textContent: UNDO_KEY })))),
    el('div', { className: 'card-actions' },
      el('div', { className: 'row' },
        el('button', { className: 'btn secondary', textContent: S.clearAll, onclick: () => cells.forEach(c => c.clear()) }),
        el('button', { className: 'btn primary', onclick: () => finishWrite(name) }, S.done, kbd('⏎', true)))));
  renderKeys();
}

// Clear the most recently written character; cells already cleared another way are skipped.
function undoCell() {
  const { order } = writing;
  while (order.length && !order.at(-1).inked) order.pop();
  order.pop()?.clear();
}

function finishWrite(name) {
  if (screen !== 'write') return;
  if (autoSpeak) speak(name.ja);
  showWriteAnswer(name);
}

// Recall self-rating, flashcard style: mouse and trackpad strokes are too imprecise to grade automatically.
function showWriteAnswer(name) {
  asking = null;
  screen = 'writeAnswer';
  revealedAt = performance.now();
  writing.grid.classList.remove('noguide');   // the faint glyph under your strokes is the comparison
  writing.grid.classList.add('done');
  const rate = (correct) => { if (screen !== 'writeAnswer') return; grade(name, correct); askNext(); };
  shownWrite = { name, grade: rate };

  app.replaceChildren(
    el('div', { className: 'card-body center' },
      spriteEl(current, name.en || '', 'art'),
      writing.grid,
      el('div', { className: 'answer-name' },
        el('span', { className: 'romaji-big', textContent: toRomaji(name.ja) }),
        el('span', { className: 'muted', textContent: name.en || '' })),
      playButton(name.ja)),
    el('div', { className: 'card-actions' },
      el('div', { className: 'row' },
        el('button', { className: 'btn secondary', textContent: S.missed, onclick: () => rate(false) }),
        el('button', { className: 'btn primary', onclick: () => rate(true) }, S.gotIt, kbd('⏎', true)))));
  renderKeys();
}
