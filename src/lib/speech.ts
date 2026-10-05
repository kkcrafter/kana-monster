export function speak(text: string): void {
  if (!window.speechSynthesis) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[♀♂]/g, ''))   // ニドラン♂ would be read "…osu"
  u.lang = 'ja-JP'
  u.rate = 0.85
  speechSynthesis.speak(u)
}

export const stopSpeaking = () => window.speechSynthesis?.cancel()
