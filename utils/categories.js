// Mirrors gastos-pwa/src/utils/categories.js (id + color kept in sync,
// short labels added to fit the watch's narrow grid cells) — color:
// 0xRRGGBB raw hex int, Zepp widgets don't take CSS color strings.
// 'renta' is lightened from the PWA's near-black #111827 to stay visible
// as an accent on this app's dark background.
export const CATEGORIES = [
  { id: 'aldi', label: 'Aldi', short: 'Aldi', color: 0x00549f },
  { id: 'coles', label: 'Coles', short: 'Coles', color: 0xe01a22 },
  { id: 'woolworths', label: 'Woolworths', short: 'Woolw.', color: 0x1e7b34 },
  { id: 'frutiveg', label: 'Frutas y Verduras', short: 'Frutas/Veg', color: 0x65a30d },
  { id: 'sevenEleven', label: '7-Eleven', short: '7-Eleven', color: 0x00a651 },
  { id: 'bws', label: 'BWS', short: 'BWS', color: 0xc8102e },
  { id: 'kmart', label: 'Kmart', short: 'Kmart', color: 0xe4002b },
  { id: 'target', label: 'Target', short: 'Target', color: 0xcc0000 },
  { id: 'ocio', label: 'Ocio', short: 'Ocio', color: 0xf59e0b },
  { id: 'online', label: 'Compras en linea', short: 'Online', color: 0x7c3aed },
  { id: 'gasolina', label: 'Gasolina', short: 'Gasolina', color: 0xea580c },
  { id: 'renta', label: 'Renta', short: 'Renta', color: 0x9ca3af },
  { id: 'servicios', label: 'Servicio publico', short: 'Servicios', color: 0x0ea5e9 },
  { id: 'otro', label: 'Otro', short: 'Otro', color: 0x6b7280 },
]

export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
