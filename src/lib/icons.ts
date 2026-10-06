// The learning history's pixel icons: where they live, and fetching them ahead of time.

// Pixel box icons (68×56) stop at #898; later ones only have the 96×96 front sprite. Asking for the
// missing icon first would cost a 404 round trip per tile.
const LAST_ICON = 898
// Pinned to one commit of PokeAPI/sprites, so a change upstream can't swap the pictures under us.
export const SPRITES_SHA = 'a3a1432e688ea028f12c51371d5253037cb9f17b'
const iconPath = (id: number) => (id <= LAST_ICON ? `versions/generation-viii/icons/${id}.png` : `${id}.png`)
export const ICON_HOSTS = [
  (id: number) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@${SPRITES_SHA}/sprites/pokemon/${iconPath(id)}`,
  (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITES_SHA}/sprites/pokemon/${iconPath(id)}`,
]

/** Warm the browser cache (the CDN allows 7 days), so the learning history opens with its icons in. */
// ponytail: one request per name, up to 1025 tiny PNGs; a sprite sheet would mean shipping images
export function preloadIcons(ids: number[]) {
  for (const id of ids) {
    const img = new Image()
    img.crossOrigin = 'anonymous'   // the same request DexIcon makes, so it hits this cache
    img.src = ICON_HOSTS[0](id)
  }
}
