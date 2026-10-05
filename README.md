# Kana Monster

Learn katakana by reading and writing Pokémon names. A static web app: no build, no dependencies.

## Run

Open `index.html` in a browser (double-click works), or serve the folder:

```sh
python3 -m http.server
```

## Files

| File | What it does |
|---|---|
| `index.html` | Markup, and the order the scripts load in |
| `style.css` | All styles, light and dark |
| `js/romaji.js` | Katakana → romaji, and the forgiving answer check |
| `js/i18n.js` | Interface text in 中文 (Taiwan) / English / 日本語 |
| `js/names.js` | All 1025 Japanese + English names (generated) |
| `js/deck.js` | Storage, generation filter, Leitner-weighted picking, sprites, speech |
| `js/strokes.js` | KanjiVG stroke-order guides, fetched and cached |
| `js/read.js` | Reading card: type the romaji, reveal |
| `js/write.js` | Writing card: tracing grid, ink layer, per-cell clear, ⌘Z |
| `js/sessions.js` | Practice sets, timed challenge, summary, putting up each card |
| `js/app.js` | Shared state, settings bar, keyboard shortcuts, start-up |

The scripts are classic `<script>` files sharing globals, loaded in order. ES modules would be
tidier, but Chrome refuses them from `file://`, and the app should open straight from disk.

## Test

```sh
node test/romaji.test.js
```

## Data

- Names: [PokéAPI](https://pokeapi.co) data, regenerated with `python3 scripts/build-names.py`.
- Sprites: loaded at runtime from PokéAPI's sprite repository; none are stored here.
- Stroke order: [KanjiVG](https://kanjivg.tagaini.net), CC BY-SA 3.0, loaded at runtime.

Pokémon names and artwork are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc.; this
is an unofficial, non-commercial learning project.
