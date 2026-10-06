# Kana Monster

Learn katakana by reading and writing Pokémon names. React + TypeScript, built with Vite.

## Run

```sh
npm install
npm run dev       # http://localhost:5173
npm test          # romaji tests (Vitest)
npm run lint      # oxlint
npm run build     # type-check, then a static site in dist/
```

Deploys as a static site anywhere; on Vercel the Vite preset needs no settings (output `dist`).

## Files

| File | What it does |
|---|---|
| `src/App.tsx` | Saved settings and progress, shared with every screen through `AppContext` |
| `src/i18n.ts` | Interface text in 中文 (Taiwan) / English / 日本語 |
| `src/components/Home.tsx` | Home: mode, practice / challenge, generations, progress |
| `src/components/SettingsSheet.tsx` | Language, image cue, auto audio, shortcuts, credits |
| `src/components/Session.tsx` | A running set: progress bar or countdown, history and keys panels, which card is up |
| `src/components/ReadCard.tsx` | Reading card: type the romaji, then the answer syllable by syllable |
| `src/components/WriteCard.tsx` | Writing card: prompt, tracing chips, self-rating |
| `src/components/WriteGrid.tsx` | Canvas cells, the ink layer, per-cell clear, ⌘Z, stroke-order guides |
| `src/components/Summary.tsx` | End of a set: score, review the missed names |
| `src/components/History.tsx` | Learning history: names by Leitner box with pixel icons, its own generation filter and jump menu, pick some to review |
| `src/components/ui.tsx` | Icons, key caps, segmented buttons, sprites, the generation list |
| `src/lib/romaji.ts` | Katakana → romaji, the forgiving answer check, which syllables a wrong answer missed |
| `src/lib/deck.ts` | Generation filter, Leitner-weighted picking |
| `src/lib/icons.ts` | Pixel icon URLs for the learning history, and preloading them |
| `src/lib/strokes.ts` | KanjiVG stroke-order guides, fetched and cached |
| `src/lib/useHotkeys.ts` | Enter / Space / Esc / ⌘Z for whichever screen is up |
| `src/data/names.ts` | All 1025 Japanese + English names (generated) |
| `src/styles.css` | All styles, light and dark, phone first with a two-column layout from 900px |

## Data

- Names: [PokéAPI](https://pokeapi.co) data, regenerated with `npm run names`.
- Sprites: loaded at runtime from PokéAPI's sprite repository; none are stored here.
- Stroke order: [KanjiVG](https://kanjivg.tagaini.net), CC BY-SA 3.0, loaded at runtime.

Both are fetched from a pinned commit (`SPRITES_SHA` in `src/lib/icons.ts`, `KANJIVG_SHA` in
`src/lib/strokes.ts`), so a change upstream can't swap what the app shows. To take newer files, bump
the hash. The production build adds a Content-Security-Policy (`vite.config.ts`) that allows images and
fetches from those two hosts only.

Pokémon names and artwork are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc.; this
is an unofficial, non-commercial learning project.

## License

The code is [MIT](LICENSE). That covers this project's own code only: the names, artwork and
stroke data above stay under their owners' terms.
