// ---------- katakana → romaji ----------

const DIGRAPH = {
  'キャ':'kya','キュ':'kyu','キョ':'kyo','シャ':'sha','シュ':'shu','ショ':'sho',
  'チャ':'cha','チュ':'chu','チョ':'cho','ニャ':'nya','ニュ':'nyu','ニョ':'nyo',
  'ヒャ':'hya','ヒュ':'hyu','ヒョ':'hyo','ミャ':'mya','ミュ':'myu','ミョ':'myo',
  'リャ':'rya','リュ':'ryu','リョ':'ryo','ギャ':'gya','ギュ':'gyu','ギョ':'gyo',
  'ジャ':'ja','ジュ':'ju','ジョ':'jo','ビャ':'bya','ビュ':'byu','ビョ':'byo',
  'ピャ':'pya','ピュ':'pyu','ピョ':'pyo',
  'ファ':'fa','フィ':'fi','フェ':'fe','フォ':'fo','フュ':'fyu',
  'ティ':'ti','ディ':'di','トゥ':'tu','ドゥ':'du','デュ':'dyu','テュ':'tyu',
  'ウィ':'wi','ウェ':'we','ウォ':'wo',
  'ヴァ':'va','ヴィ':'vi','ヴェ':'ve','ヴォ':'vo',
  'シェ':'she','ジェ':'je','チェ':'che',
  'ツァ':'tsa','ツィ':'tsi','ツェ':'tse','ツォ':'tso',
  'クァ':'kwa','クィ':'kwi','クェ':'kwe','クォ':'kwo','グァ':'gwa',
};

const MONO = {
  'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
  'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
  'サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
  'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
  'ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
  'ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
  'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo',
  'ヤ':'ya','ユ':'yu','ヨ':'yo',
  'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
  'ワ':'wa','ヲ':'wo','ン':'n',
  'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go',
  'ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
  'ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
  'バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
  'パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po',
  'ヴ':'vu',
  // Small kana left over after the digraphs: a small vowel after its own vowel is a lengthening (ピィ = pii).
  'ァ':'a','ィ':'i','ゥ':'u','ェ':'e','ォ':'o','ャ':'ya','ュ':'yu','ョ':'yo','ヮ':'wa','ヵ':'ka','ヶ':'ke',
  '・':' ',
};

// One unit per syllable as it is read, with its romaji: ッ joins the next unit, ー the one before.
// ♀/♂ are part of the name, not of how it's read, so they get no unit.
function kanaUnits(kana) {
  const units = [];
  let geminate = '';
  for (let i = 0; i < kana.length; ) {
    const one = kana[i], two = kana.slice(i, i + 2);
    if (one === 'ッ') { geminate += one; i++; continue; }
    if (one === 'ー') {                       // long vowel: repeat the last one
      const last = units.at(-1);
      if (last) {
        last.kana += one;
        const v = last.romaji.match(/[aiueo]$/);
        if (v) last.romaji += v[0];
      }
      i++; continue;
    }
    if (one === '♀' || one === '♂') { i++; continue; }
    let k, r;
    if (DIGRAPH[two]) { k = two; r = DIGRAPH[two]; }
    else if (MONO[one] !== undefined) { k = one; r = MONO[one]; }
    else {
      // Pass symbols through, folding full-width ASCII (ポリゴン２, タイプ：ヌル) to plain.
      const c = one.codePointAt(0);
      k = one; r = c >= 0xFF01 && c <= 0xFF5E ? String.fromCodePoint(c - 0xFEE0) : one;
    }
    i += k.length;
    if (geminate) { k = geminate + k; r = r[0] + r; geminate = ''; }
    units.push({ kana: k, romaji: r });
  }
  return units;
}

function toRomaji(kana) {
  return kanaUnits(kana).map(u => u.romaji).join('')
    .replace(/([aiueo])\1{2,}/g, '$1$1');   // メェー would otherwise read "meee"
}

// Where a wrong answer went wrong, unit by unit: a character-level edit-distance alignment of the
// typed letters against the expected romaji, with each mismatch charged to the unit it falls in.
// Returns the units (skipping the ・ separator) with what was typed for each and whether it matched.
function diffAnswer(kana, answer) {
  const units = kanaUnits(kana).filter(u => u.romaji.trim());
  const want = units.map(u => u.romaji.toLowerCase().replace(/[^a-z]/g, ''));
  const target = want.join(''), typed = answer.toLowerCase().replace(/[^a-z]/g, '');
  const owner = want.flatMap((w, i) => [...w].map(() => i));   // unit index of each target letter
  const n = target.length, m = typed.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => i + j));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    d[i][j] = Math.min(d[i - 1][j - 1] + (target[i - 1] === typed[j - 1] ? 0 : 1), d[i - 1][j] + 1, d[i][j - 1] + 1);
  }
  const got = units.map(() => ''), ok = want.map(w => true);
  let i = n, j = m;
  const charge = (u, letter) => { if (u == null) return; if (letter) got[u] = letter + got[u]; };
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (target[i - 1] === typed[j - 1] ? 0 : 1)) {
      if (target[i - 1] !== typed[j - 1]) ok[owner[i - 1]] = false;
      charge(owner[i - 1], typed[j - 1]); i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {          // expected letter missing
      ok[owner[i - 1]] = false; i--;
    } else {                                                     // extra letter typed
      const u = i > 0 ? owner[i - 1] : 0;
      ok[u] = false; charge(u, typed[j - 1]); j--;
    }
  }
  return units.map((u, k) => ({ ...u, typed: got[k], ok: want[k] === '' || ok[k] }));
}

// Forgiving comparison: accept kunrei/wapuro spellings and any long-vowel writing.
function norm(s) {
  return s.toLowerCase().replace(/[^a-z]/g, '')
    .replace(/tch/g, 'cch')
    .replace(/sy/g, 'sh').replace(/ty/g, 'ch').replace(/cy/g, 'ch').replace(/jy/g, 'j')
    .replace(/si/g, 'shi').replace(/ti/g, 'chi').replace(/tu/g, 'tsu')
    .replace(/(?<![sc])hu/g, 'fu')
    .replace(/zi/g, 'ji').replace(/di/g, 'ji').replace(/du/g, 'zu')
    .replace(/nn/g, 'n')
    .replace(/([aiueo])\1+/g, '$1')
    .replace(/ou/g, 'o');
}

const matches = (input, kana) => norm(input) === norm(toRomaji(kana));

if (typeof module === 'object') module.exports = { toRomaji, norm, matches, kanaUnits, diffAnswer };   // for test/romaji.test.js
