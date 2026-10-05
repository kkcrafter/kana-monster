// ---------- write mode ----------

// Circular arrow (↺), drawn inline so it looks the same in every font.
function resetIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ['M3.5 15a9 9 0 1 0 2.1-9.4L3 9', 'M3 3v6h6']) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

// Fit one name on one row where possible; never below a finger-sized 48px.
function cellSize(n) {
  const room = app.clientWidth - 40 - 12 - (n - 1) * 8;   // main's side padding, the grid's own, gaps
  return Math.max(48, Math.min(72, Math.floor(room / n)));
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

  const wipe = el('button', { className: 'cell-clear', hidden: true, onclick: () => cell.clear() }, resetIcon());
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
  for (const b of grid.querySelectorAll('.cell-clear')) { b.title = `${S.clearOne} (${UNDO_KEY})`; b.setAttribute('aria-label', S.clearOne); }

  app.replaceChildren(
    ...(showCue ? [spriteEl(current, '', 'cue')] : []),
    el('div', { id: 'prompt', textContent: toRomaji(name.ja) }),
    el('div', { id: 'hint', textContent: S.writeHint }),
    grid,
    el('div', { className: 'row' },
      el('button', { textContent: S.done, onclick: () => finishWrite(name) }),
      el('button', { className: 'ghost', textContent: S.clear, onclick: () => cells.forEach(c => c.clear()) })
    )
  );
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
  shownWrite = { name };
  revealedAt = performance.now();
  writing.grid.classList.remove('noguide');   // the faint glyph under your strokes is the comparison
  writing.grid.classList.add('done');

  const grade = (correct) => {
    const box = progress[current] || 1;
    progress[current] = correct ? Math.min(box + 1, 5) : 1;
    save(PROGRESS_KEY, progress);
    renderStats();
    record(name, correct);
    askNext();
  };

  app.replaceChildren(
    spriteEl(current, name.en || '', 'cue'),
    el('div', { id: 'answer' },
      el('div', { id: 'kana', style: 'font-size:34px', textContent: name.ja }),
      el('div', { id: 'romaji', textContent: toRomaji(name.ja) }),
      el('div', { id: 'en', textContent: name.en || '' })
    ),
    writing.grid,
    el('div', { className: 'row' },
      el('button', { textContent: S.gotIt, onclick: () => grade(true) }),
      el('button', { className: 'ghost', textContent: S.missed, onclick: () => grade(false) })
    ),
    el('div', { className: 'row' },
      el('button', { className: 'speak', textContent: S.play, onclick: () => speak(name.ja) })
    )
  );
}
