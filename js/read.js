// ---------- read mode: see the katakana, type the romaji ----------

function ask(name, keep = '') {
  asking = name;
  screen = 'question';
  const input = el('input', {
    type: 'text', id: 'answer-input', autocapitalize: 'off', autocomplete: 'off',
    autocorrect: 'off', spellcheck: false, placeholder: 'romaji', value: keep,
  });
  const submit = () => reveal(name, input.value);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();   // otherwise Enter's default action lands on whatever the answer screen focuses
    submit();
  });

  app.replaceChildren(
    el('div', { className: 'card-body center' },
      ...(showCue ? [spriteEl(current, '', 'cue')] : []),
      el('p', { className: 'prompt-label', textContent: S.readPrompt }),
      el('div', { className: 'kana-big', lang: 'ja', textContent: name.ja }),
      el('p', { className: 'muted', textContent: S.kanaCount([...name.ja].filter(isKana).length) })),
    el('div', { className: 'card-actions' },
      el('label', { className: 'label', htmlFor: 'answer-input', textContent: S.romajiLabel }),
      input,
      el('div', { className: 'row' },
        el('button', { className: 'btn secondary', textContent: session.type === 'challenge' ? S.pass : S.skip, onclick: () => reveal(name, '') }),
        el('button', { className: 'btn primary', onclick: submit }, S.check, kbd('⏎', true)))));
  renderKeys();
  input.focus();
}

// Scoring happens once, here; showAnswer is pure render so it can be re-run on a language switch.
function reveal(name, answer) {
  const correct = answer.trim() !== '' && matches(answer, name.ja);
  grade(name, correct, answer.trim());
  if (autoSpeak) speak(name.ja);
  showAnswer(name, answer, correct);
}

// A wide note across the top of an answer: what happened, and what it means for the deck.
function banner(kind, title, ...lines) {
  return el('div', { className: `banner ${kind}` },
    icon(kind === 'ok' ? 'right' : 'wrong', 20, 2.2),
    el('div', {}, el('b', { textContent: title }), ...lines.map((l) => el('small', {}, l))));
}

// Each syllable with its romaji; on a wrong answer the wrong ones are marked with what was typed.
function syllableTiles(units) {
  return el('div', { className: 'tiles' }, ...units.map((u) => el('div', { className: 'tile-col' },
    el('div', { className: u.ok ? 'tile' : 'tile bad' },
      el('span', { className: 'tile-kana', lang: 'ja', textContent: u.kana }),
      el('span', { className: 'tile-romaji', textContent: u.romaji })),
    el('span', { className: 'tile-you', textContent: u.ok ? '' : S.you + (u.typed || '–') }))));
}

const playButton = (ja) => el('button', { className: 'pill', onclick: () => speak(ja) }, icon('speaker', 18), S.play, kbd('Space'));

function showAnswer(name, answer, correct) {
  asking = null;
  screen = 'answer';
  shown = { name, answer, correct };
  revealedAt = performance.now();
  const typed = answer.trim();
  const units = !correct && typed ? diffAnswer(name.ja, typed)
    : kanaUnits(name.ja).filter(u => u.romaji.trim()).map(u => ({ ...u, ok: true }));
  // the typed answer, with the part belonging to wrong syllables underlined
  const yours = [S.yourAnswer, ...units.map(u => u.ok ? u.typed : el('b', { textContent: u.typed }))];

  app.replaceChildren(
    el('div', { className: 'card-body' },
      correct ? banner('ok', S.correctTitle, S.correctNote)
        : typed ? banner('no', S.wrongTitle, el('span', {}, ...yours), S.wrongNote)
        : banner('no', S.skippedTitle, S.wrongNote),
      el('div', { className: 'answer-main' },
        spriteEl(current, name.en || '', 'art'),
        el('div', { className: 'answer-info' },
          syllableTiles(units),
          el('div', { className: 'answer-name' },
            el('span', { className: 'romaji-big', textContent: toRomaji(name.ja) }),
            el('span', { className: 'muted', textContent: name.en || '' })),
          playButton(name.ja)))),
    el('div', { className: 'card-actions' },
      el('button', { className: 'btn primary', onclick: askNext }, S.next, kbd('⏎', true))));
  renderKeys();
}
