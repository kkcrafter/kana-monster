// The learning history's pixel icons: where they live, and fetching them ahead of time.

// Pixel box icons (68×56) stop at #898; later ones only have the 96×96 front sprite. Asking for the
// missing icon first would cost a 404 round trip per tile.
const LAST_ICON = 898
const iconPath = (id: number) => (id <= LAST_ICON ? `versions/generation-viii/icons/${id}.png` : `${id}.png`)
export const ICON_HOSTS = [
  (id: number) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${iconPath(id)}`,
  (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${iconPath(id)}`,
]

/** Warm the browser cache (the CDN allows 7 days), so the learning history opens with its icons in. */
// ponytail: one request per name, up to 1025 tiny PNGs; a sprite sheet would mean shipping images
export function preloadIcons(ids: number[]) {
  for (const id of ids) new Image().src = ICON_HOSTS[0](id)
}
