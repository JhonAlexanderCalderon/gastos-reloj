// Hand-rolled instead of Intl.NumberFormat — QuickJS-based Zepp OS runtimes
// don't reliably ship full Intl support, and this only needs plain AUD-style
// grouping ($1,234.56), not multi-currency/locale support.
export function formatMoney(n) {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const parts = abs.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}$${parts[0]}.${parts[1]}`
}

// Simple multiplicative darken for BUTTON press_color — Zepp widgets take
// raw 0xRRGGBB ints, no color-mixing helper is provided by the platform.
export function darken(hex, factor = 0.7) {
  const r = Math.round(((hex >> 16) & 0xff) * factor)
  const g = Math.round(((hex >> 8) & 0xff) * factor)
  const b = Math.round((hex & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

export function formatDateTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mo} ${hh}:${mm}`
}
