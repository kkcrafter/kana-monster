// Settings: a bottom sheet on a phone, a centred dialog on the web. Native <dialog>, so Esc and focus come free.
import type { Ref } from 'react'
import { useApp } from '../AppContext'
import { I18N, type Lang } from '../i18n'
import { UNDO_KEY } from '../lib/useHotkeys'
import { Seg, Shortcuts } from './ui'

const LANGS = Object.keys(I18N) as Lang[]

export function SettingsSheet({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const app = useApp()
  const { S } = app
  const link = (href: string, text: string) => <a href={href} target="_blank" rel="noopener">{text}</a>

  return (
    // a click on the dialog itself, not its contents, is a tap outside the sheet
    <dialog ref={ref} className="settings" onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}>
      <div className="sheet-grip" />
      <header className="sheet-head">
        <h2>{S.settings}</h2>
        <button className="link-btn" onClick={(e) => e.currentTarget.closest('dialog')!.close()}>{S.done}</button>
      </header>
      <h3 className="label">{S.uiLang}</h3>
      <Seg className="lang-seg" options={LANGS} value={app.lang} onPick={app.setLang} label={(l) => I18N[l].name} />
      <label className="toggle-row">
        <span><b>{S.cue}</b><small>{S.cueDesc}</small></span>
        <input type="checkbox" checked={app.showCue} onChange={(e) => app.setShowCue(e.target.checked)} />
      </label>
      <label className="toggle-row">
        <span><b>{S.autospeak}</b><small>{S.autospeakDesc}</small></span>
        <input type="checkbox" checked={app.autoSpeak} onChange={(e) => app.setAutoSpeak(e.target.checked)} />
      </label>
      <h3 className="label">{S.shortcuts}</h3>
      <Shortcuts keys={[['⏎ Enter', S.keyEnter], ['Space', S.keySpace], [UNDO_KEY, S.keyUndo], ['Esc', S.keyEsc]]} />
      <p className="credits">
        {S.namesCredit}{link('https://pokeapi.co', 'PokéAPI')} · {S.strokeCredit}{link('https://kanjivg.tagaini.net', 'KanjiVG')} (CC BY-SA 3.0)
      </p>
    </dialog>
  )
}
