import { describe, expect, it } from 'vitest'
import { diffAnswer, kanaUnits, matches, toRomaji } from './romaji'

const ACCEPT: string[][] = [
  ['ピカチュウ', 'pikachuu', 'PIKACHUU', 'pikachū', 'pikachû', 'pikachu-'],
  ['フシギダネ', 'fushigidane', 'husigidane'],
  ['リザードン', 'rizaadon', 'rizādon', 'riza-don', 'rizaadonn'],
  ['コダック', 'kodakku'],
  ['ミュウツー', 'myuutsuu', 'myūtsū', 'myuutsu-'],
  ['ニャース', 'nyaasu', 'nyāsu', 'nya-su'],
  ['カイリュー', 'kairyuu', 'kairyū'],
  ['ポッポ', 'poppo'],
  ['ゼニガメ', 'zenigame'],
  ['ファイヤー', 'faiyaa', 'faiyā', 'faiya-', 'fai-yaa'],
  ['ジュペッタ', 'jupetta', 'jyupetta'],
  ['イーブイ', 'iibui', 'ībui', 'i-bui'],
  ['シャワーズ', 'shawaazu', 'syawaazu', 'shawāzu'],
  ['セレビィ', 'serebii'],
  ['ピィ', 'pii'],
  ['ケーシィ', 'keeshii', 'kēshii'],
  ['スナバァ', 'sunabaa'],
  ['メェークル', 'meekuru'],
  ['カプ・コケコ', 'kapu kokeko', 'kapukokeko', 'kapu-kokeko'],
  ['ポリゴン２', 'porigon2', 'porigon'],
  ['タイプ：ヌル', 'taipu:nuru', 'taipunuru'],
  ['ニドラン♂', 'nidoran'],
  ['ニドラン♀', 'nidoran'],
];

const REJECT: string[][] = [
  ['ポッポ', 'popo'],           // 促音 must be read
  ['コダック', 'kodaku'],
  ['ファイヤー', 'fuaiyaa', 'faiya'],
  ['ピカチュウ', 'pikachi', 'pikachou', 'pikachu'],   // the last ウ is a kana of its own
  ['ニャース', 'nasu', 'nyasu'],
  ['リザードン', 'rizadon'],     // ー lengthens ザ: zaa
  ['ミュウツー', 'myutsu', 'myuutsu', 'myutsuu'],
  ['カイリュー', 'kairyu'],
  ['イーブイ', 'ibui'],
  ['シャワーズ', 'shawazu'],
  ['セレビィ', 'serebi'],
  ['ピィ', 'pi'],
  ['ケーシィ', 'keshi', 'keeshi'],
  ['スナバァ', 'sunaba'],
  ['メェークル', 'mekuru'],
];

describe('matches', () => {
  for (const [kana, ...inputs] of ACCEPT) for (const input of inputs) {
    it(`accepts ${kana} as "${input}"`, () => expect(matches(input, kana)).toBe(true))
  }
  for (const [kana, ...inputs] of REJECT) for (const input of inputs) {
    it(`rejects ${kana} as "${input}"`, () => expect(matches(input, kana)).toBe(false))
  }
})

describe('toRomaji', () => {
  it('leaves ♀/♂ out of the reading', () => {
    expect(toRomaji('ニドラン♂')).toBe('nidoran')
    expect(toRomaji('ニドラン♀')).toBe('nidoran')
  })
})

describe('kanaUnits', () => {
  const units = (ja: string) => kanaUnits(ja).map(u => `${u.kana}=${u.romaji}`).join(' ')
  it.each([
    ['ポッポ', 'ポ=po ッポ=ppo'],
    ['リザードン', 'リ=ri ザー=zaa ド=do ン=n'],
    ['ピカチュウ', 'ピ=pi カ=ka チュ=chu ウ=u'],
    ['ニドラン♂', 'ニ=ni ド=do ラ=ra ン=n'],
  ])('%s → %s', (ja, want) => expect(units(ja)).toBe(want))
})

describe('diffAnswer', () => {
  const wrong = (ja: string, a: string) => diffAnswer(ja, a).filter(u => !u.ok).map(u => `${u.kana}:${u.typed}`).join(' ')
  it.each([
    ['フシギダネ', 'fushigidana', 'ネ:na'],
    ['ポッポ', 'popo', 'ッポ:po'],
    ['リザードン', 'rizaadon', ''],
    ['ゼニガメ', 'zenigamexx', 'メ:mexx'],
    ['カプ・コケコ', 'kapukokoko', 'ケ:ko'],
    ['リザードン', 'rizadon', 'ザー:za'],
    ['ピカチュウ', 'pikachu', 'ウ:'],
    ['ミュウツー', 'myutsu', 'ウ: ツー:tsu'],
    ['リザードン', 'rizādon', ''],
  ])('%s typed "%s" misses "%s"', (ja, a, want) => expect(wrong(ja, a)).toBe(want))
})
