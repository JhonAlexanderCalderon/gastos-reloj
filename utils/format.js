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

// 12-hour clock, no date — e.g. "5:13 PM". Used everywhere a timestamp is
// shown on-device; the date itself isn't useful at this glance size.
export function formatTime12h(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}
