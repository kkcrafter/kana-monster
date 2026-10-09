import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Images come only from these two hosts (a pinned commit, see src/lib/icons.ts); stroke data is bundled.
const ASSETS = 'https://cdn.jsdelivr.net https://raw.githubusercontent.com'
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'",
  `img-src 'self' data: ${ASSETS}`, "connect-src 'self'",
  "object-src 'none'", "base-uri 'none'", "form-action 'none'",
].join('; ')

// Build only: the dev server's hot reload needs inline scripts that this policy would block.
const csp: Plugin = {
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${CSP}">`),
}

export default defineConfig({
  plugins: [react(), csp],
})
