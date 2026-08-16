import { createWidget, widget } from '@zos/ui'

// Sci-fi "tablet panel" corner brackets — same motif as the app icon,
// reused across every page for a consistent Westworld-host-console feel.
// Only the bottom corners: the top ~64px is the system status bar, so
// brackets placed there would just be covered and wasted.
const BRACKET_LEN = 22
const BRACKET_THICKNESS = 3
const BRACKET_MARGIN = 14

// Returns the 4 created widgets so callers whose accent color changes at
// runtime (e.g. the balance page's green/red) can restyle them later via
// setProperty(prop.MORE, { color }).
export function drawCornerBrackets(deviceWidth, deviceHeight, color) {
  const y = deviceHeight - BRACKET_MARGIN - BRACKET_THICKNESS

  const bottomLeftV = createWidget(widget.FILL_RECT, {
    x: BRACKET_MARGIN,
    y: y - BRACKET_LEN + BRACKET_THICKNESS,
    w: BRACKET_THICKNESS,
    h: BRACKET_LEN,
    color,
  })
  const bottomLeftH = createWidget(widget.FILL_RECT, {
    x: BRACKET_MARGIN,
    y,
    w: BRACKET_LEN,
    h: BRACKET_THICKNESS,
    color,
  })
  const bottomRightV = createWidget(widget.FILL_RECT, {
    x: deviceWidth - BRACKET_MARGIN - BRACKET_THICKNESS,
    y: y - BRACKET_LEN + BRACKET_THICKNESS,
    w: BRACKET_THICKNESS,
    h: BRACKET_LEN,
    color,
  })
  const bottomRightH = createWidget(widget.FILL_RECT, {
    x: deviceWidth - BRACKET_MARGIN - BRACKET_LEN,
    y,
    w: BRACKET_LEN,
    h: BRACKET_THICKNESS,
    color,
  })

  return [bottomLeftV, bottomLeftH, bottomRightV, bottomRightH]
}
