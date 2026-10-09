import { describe, expect, it } from 'vitest'
import { isStrokes, parseKanjiVG } from './strokes'

describe('isStrokes', () => {
  it('accepts what getStrokes writes', () => {
    expect(isStrokes({ p: ['M1 2L3 4', 'M5 6'], n: [[10, 20], [30.5, 40]] })).toBe(true)
    expect(isStrokes({ p: [], n: [] })).toBe(true)
  })
  it('rejects anything else, so a damaged cache is fetched again instead of breaking the page', () => {
    for (const bad of [null, undefined, 5, 'x', [], {}, { p: ['M1'] }, { p: 'M1', n: [] },
      { p: [1], n: [] }, { p: [], n: [[1]] }, { p: [], n: [[1, 'x']] }, { p: [], n: [5] }])
      expect(isStrokes(bad)).toBe(false)
  })
})

// ガ (030ac) as served at the pinned commit. KanjiVG, CC BY-SA 3.0, https://kanjivg.tagaini.net
const GA = `<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109" xmlns:kvg="https://kanjivg.tagaini.net/">
<g id="kvg:StrokePaths_030ac" style="fill:none;stroke:#000000;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;">
<g id="kvg:030ac" kvg:element="ガ">
	<path id="kvg:030ac-s1" d="M25.5,40.62c1.88,1.25,4.51,1.87,7.12,1.5c17.88-2.5,32.78-4.51,42.5-5.88c7.12-1,10.59,0.24,8.62,7.88c-2.12,8.25-4.47,17.81-9.25,29.12c-10.49,24.88-14.11,14.51-19.24,11.88"/>
	<path id="kvg:030ac-s2" d="M55.88,17.12c0.88,1.62,1.29,3.83,0.75,6.75c-4.25,22.88-15.88,45.25-30.25,58.88"/>
	<path id="kvg:030ac-s3" d="M83,19.75c2.75,1.75,6,5.38,7.75,8.5"/>
	<path id="kvg:030ac-s4" d="M89.38,14.88c3.06,1.57,6.68,4.82,8.62,7.62"/>
</g>
</g>
<g id="kvg:StrokeNumbers_030ac" style="font-size:8;fill:#808080">
	<text transform="matrix(1 0 0 1 18.13 41.13)">1</text>
	<text transform="matrix(1 0 0 1 46.25 17.25)">2</text>
	<text transform="matrix(1 0 0 1 75.38 18.75)">3</text>
	<text transform="matrix(1 0 0 1 81.5 13.63)">4</text>
</g>
</svg>`

describe('parseKanjiVG', () => {
  it('reads the strokes in order and where each number goes', () => {
    const s = parseKanjiVG(GA)!
    expect(s.p).toHaveLength(4)
    expect(s.p[0]).toMatch(/^M25\.5,40\.62/)
    expect(s.p[3]).toBe('M89.38,14.88c3.06,1.57,6.68,4.82,8.62,7.62')
    expect(s.n).toEqual([[18.13, 41.13], [46.25, 17.25], [75.38, 18.75], [81.5, 13.63]])
    expect(isStrokes(s)).toBe(true)   // what the cache will accept back
  })
  it('sorts by stroke number, not file order', () => {
    const lines = GA.split('\n')
    const shuffled = lines.map(l => (l.includes('-s1"') ? lines.find(x => x.includes('-s4"'))! : l.includes('-s4"') ? lines.find(x => x.includes('-s1"'))! : l)).join('\n')
    expect(parseKanjiVG(shuffled)!.p[0]).toMatch(/^M25\.5,40\.62/)
  })
  it('gives null for a file with no stroke paths', () => {
    expect(parseKanjiVG('<svg></svg>')).toBeNull()
    expect(parseKanjiVG('<html>404 Not Found</html>')).toBeNull()
  })
})
