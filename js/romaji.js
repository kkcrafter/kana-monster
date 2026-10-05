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

function toRomaji(kana) {
  let out = '', geminate = false;
  for (let i = 0; i < kana.length; ) {
    const one = kana[i], two = kana.slice(i, i + 2);
    if (one === 'ッ') { geminate = true; i++; continue; }
    if (one === 'ー') {                       // long vowel: repeat the last one
      const last = out.match(/[aiueo]$/);
      if (last) out += last[0];
      i++; continue;
    }
    let r, len;
    if (DIGRAPH[two]) { r = DIGRAPH[two]; len = 2; }
    else if (MONO[one]) { r = MONO[one]; len = 1; }
    else if (one === '♀' || one === '♂') { r = ''; len = 1; }   // part of the name, not of how it's read
    else {
      // Pass symbols through, folding full-width ASCII (ポリゴン２, タイプ：ヌル) to plain.
      const c = one.codePointAt(0);
      r = c >= 0xFF01 && c <= 0xFF5E ? String.fromCodePoint(c - 0xFEE0) : one;
      len = 1;
    }
    if (geminate) { r = r[0] + r; geminate = false; }
    out += r; i += len;
  }
  return out.replace(/([aiueo])\1{2,}/g, '$1$1');   // メェー would otherwise read "meee"
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

if (typeof module === 'object') module.exports = { toRomaji, norm, matches };   // for test/romaji.test.js
