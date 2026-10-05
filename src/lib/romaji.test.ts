import { describe, expect, it } from 'vitest'
import { diffAnswer, kanaUnits, matches, toRomaji } from './romaji'

const ACCEPT: string[][] = [
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

const REJECT: string[][] = [
  ['ポッポ', 'popo'],           // 促音 must survive vowel collapsing
  ['コダック', 'kodaku'],
  ['ファイヤー', 'fuaiyaa'],
  ['ピカチュウ', 'pikachi', 'pikachou'],
  ['ニャース', 'nasu'],
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
  ])('%s typed "%s" misses "%s"', (ja, a, want) => expect(wrong(ja, a)).toBe(want))
})
