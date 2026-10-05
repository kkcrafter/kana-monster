// Romaji matcher self-check: node test/romaji.test.js
const assert = require('assert');
const { toRomaji, norm, matches } = require('../js/romaji.js');

const ACCEPT = [
  ['ピカチュウ', 'pikachu', 'pikachuu', 'PIKACHU'],
  ['フシギダネ', 'fushigidane', 'husigidane'],
  ['リザードン', 'rizadon', 'rizaadon', 'rizaadonn'],
  ['コダック', 'kodakku'],
  ['ミュウツー', 'myutsu', 'myuutsuu'],
  ['ニャース', 'nyasu', 'nyaasu'],
  ['カイリュー', 'kairyu', 'kairyuu'],
  ['ポッポ', 'poppo'],
  ['ゼニガメ', 'zenigame'],
  ['ファイヤー', 'faiya', 'faiyaa', 'fai-yaa'],
  ['ジュペッタ', 'jupetta', 'jyupetta'],
  ['イーブイ', 'ibui', 'iibui', 'i-bui'],
  ['シャワーズ', 'shawazu', 'syawaazu'],
  ['セレビィ', 'serebii', 'serebi'],
  ['ピィ', 'pii', 'pi'],
  ['ケーシィ', 'keeshii', 'keshi'],
  ['スナバァ', 'sunabaa', 'sunaba'],
  ['メェークル', 'meekuru', 'mekuru'],
  ['カプ・コケコ', 'kapu kokeko', 'kapukokeko', 'kapu-kokeko'],
  ['ポリゴン２', 'porigon2', 'porigon'],
  ['タイプ：ヌル', 'taipu:nuru', 'taipunuru'],
  ['ニドラン♂', 'nidoran'],
  ['ニドラン♀', 'nidoran'],
];

const REJECT = [
  ['ポッポ', 'popo'],           // 促音 must survive vowel collapsing
  ['コダック', 'kodaku'],
  ['ファイヤー', 'fuaiyaa'],
  ['ピカチュウ', 'pikachi', 'pikachou'],
  ['ニャース', 'nasu'],
];

let n = 0;
for (const [kana, ...inputs] of ACCEPT) for (const i of inputs) { n++; assert.ok(matches(i, kana), `should accept ${kana} "${i}" (${norm(toRomaji(kana))})`); }
for (const [kana, ...inputs] of REJECT) for (const i of inputs) { n++; assert.ok(!matches(i, kana), `should reject ${kana} "${i}" (${norm(toRomaji(kana))})`); }
for (const ja of ['ニドラン♂', 'ニドラン♀']) { n++; assert.strictEqual(toRomaji(ja), 'nidoran'); }
console.log(`romaji: all ${n} checks pass`);
