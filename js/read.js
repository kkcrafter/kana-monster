// ---------- read mode ----------

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
