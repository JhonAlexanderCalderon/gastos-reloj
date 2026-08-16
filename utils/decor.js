import { createWidget, widget } from '@zos/ui'

// Full bezel-style frame around the content area — replaces the earlier
// corner-bracket motif per feedback (read as stray marks, not a frame).
// Only spans y >= 64: the top ~64px is the system status bar and would
// just cover/waste a top bar there.
const FRAME_MARGIN = 8
const FRAME_THICKNESS = 4
const FRAME_TOP = 64

// Returns the 4 created widgets so callers whose accent color changes at
// runtime (e.g. balance's green/red) can restyle them via
// setProperty(prop.MORE, { color }).
export function drawScreenFrame(deviceWidth, deviceHeight, color) {
  const innerTop = FRAME_TOP + FRAME_MARGIN
  const innerBottom = deviceHeight - FRAME_MARGIN
  const innerHeight = innerBottom - innerTop

  const top = createWidget(widget.FILL_RECT, {
    x: FRAME_MARGIN,
    y: innerTop,
    w: deviceWidth - FRAME_MARGIN * 2,
    h: FRAME_THICKNESS,
    radius: FRAME_THICKNESS / 2,
    color,
  })
  const bottom = createWidget(widget.FILL_RECT, {
    x: FRAME_MARGIN,
    y: innerBottom - FRAME_THICKNESS,
    w: deviceWidth - FRAME_MARGIN * 2,
    h: FRAME_THICKNESS,
    radius: FRAME_THICKNESS / 2,
    color,
  })
  const left = createWidget(widget.FILL_RECT, {
    x: FRAME_MARGIN,
    y: innerTop,
    w: FRAME_THICKNESS,
    h: innerHeight,
    radius: FRAME_THICKNESS / 2,
    color,
  })
  const right = createWidget(widget.FILL_RECT, {
    x: deviceWidth - FRAME_MARGIN - FRAME_THICKNESS,
    y: innerTop,
    w: FRAME_THICKNESS,
    h: innerHeight,
    radius: FRAME_THICKNESS / 2,
    color,
  })

  return [top, bottom, left, right]
}

// Thin accent lines directly above/below a label — the "lineas del color
// correspondiente" bracketing the status word, reinforcing the color cue
// beyond just tinting the number itself.
export function drawLabelLines(x, width, yAbove, yBelow, color) {
  const above = createWidget(widget.FILL_RECT, { x, y: yAbove, w: width, h: 2, color })
  const below = createWidget(widget.FILL_RECT, { x, y: yBelow, w: width, h: 2, color })
  return [above, below]
}
