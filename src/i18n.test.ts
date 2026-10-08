import { describe, expect, it } from 'vitest'
import { detectLang } from './i18n'

describe('detectLang', () => {
  it('follows a browser setting with one of the app languages, region ignored', () => {
    expect(detectLang(['zh-TW'])).toBe('zh')
    expect(detectLang(['zh-Hant-HK', 'zh-CN'])).toBe('zh')
    expect(detectLang(['ja-JP'], 'Europe/Berlin')).toBe('ja')
    expect(detectLang(['en-MO'], 'Asia/Macau')).toBe('en')
    expect(detectLang(['en-JP', 'en-US'], 'Asia/Tokyo')).toBe('en')
  })
  it('uses English when none of the app languages is listed, whatever the time zone', () => {
    expect(detectLang(['de-DE'], 'Asia/Hong_Kong')).toBe('en')
    expect(detectLang(['ko-KR'], 'Asia/Tokyo')).toBe('en')
    expect(detectLang([], '')).toBe('en')
  })
  it('lets the time zone settle a setting that lists several', () => {
    expect(detectLang(['en-GB', 'en-HK', 'zh-Hant-HK', 'ja-HK'], 'Europe/Berlin')).toBe('en')
    expect(detectLang(['en-US', 'zh-TW'], 'Asia/Taipei')).toBe('zh')
    expect(detectLang(['zh-CN', 'ja'], 'Asia/Tokyo')).toBe('ja')
    expect(detectLang(['ja', 'en'], 'Hongkong')).toBe('ja')   // zone points to a language not listed: first one
  })
})
