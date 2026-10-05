// ---------- stroke order ----------
// Uses KanjiVG (https://kanjivg.tagaini.net) stroke data, CC BY-SA 3.0, fetched at runtime and
// not bundled. Each guide starts as a plain glyph and upgrades to numbered strokes once loaded.

const STROKES_KEY = 'kanamon.strokes.v1';
const strokeCache = load(STROKES_KEY, {});   // char -> { p: [path d, …] in stroke order, n: [[x, y], …] label spots }
const strokeRequests = {};

const KVG_HOSTS = [
  (hex) => `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`,
  (hex) => `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`,
];

function getStrokes(ch) {
  if (strokeCache[ch]) return Promise.resolve(strokeCache[ch]);
  return strokeRequests[ch] ??= (async () => {
    const hex = ch.codePointAt(0).toString(16).padStart(5, '0');
    for (const host of KVG_HOSTS) {
      try {
        const res = await fetch(host(hex), { signal: AbortSignal.timeout(10000) });
        if (!res.ok) continue;
        const svg = await res.text();
        const p = [...svg.matchAll(/<path[^>]*?id="kvg:[^"]*-s(\d+)"[^>]*?\sd="([^"]+)"/g)]
          .sort((a, b) => a[1] - b[1]).map(m => m[2]);
        const n = [...svg.matchAll(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)">(\d+)</g)]
          .sort((a, b) => a[3] - b[3]).map(m => [+m[1], +m[2]]);
        if (!p.length) return null;
        strokeCache[ch] = { p, n };
        save(STROKES_KEY, strokeCache);
        return strokeCache[ch];
      } catch {}
    }
    return null;   // keep the plain glyph
  })();
}

function strokeSvg({ p, n }) {
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const svg = make('svg', { viewBox: '0 0 109 109', class: 'strokes' });
  for (const d of p) svg.append(make('path', { d }));
  // KanjiVG's own label spots: the dakuten pair is staggered on purpose and pokes slightly above the cell.
  n.forEach(([x, y], i) => svg.append(Object.assign(make('text', { x, y }), { textContent: i + 1 })));
  return svg;
}
