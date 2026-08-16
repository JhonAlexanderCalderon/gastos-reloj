import { createWidget, widget, align, text_style } from '@zos/ui'
import { push, back } from '@zos/router'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log as Logger } from '@zos/utils'
import { CATEGORIES } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR, MUTED_COLOR } from '../../utils/theme'
import { darken } from '../../utils/format'

const logger = Logger.getLogger('categories-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

// Status bar covers y < 64 and eats touch there too.
const TOP = 64
const SUBTITLE_H = 26

const COLS = 3
const SIDE_PAD = 10
const GAP = 8
const GRID_TOP = TOP + SUBTITLE_H + 6
const CELL_W = (DEVICE_WIDTH - SIDE_PAD * 2 - (COLS - 1) * GAP) / COLS
const ROWS = Math.ceil(CATEGORIES.length / COLS)
const CELL_H = (DEVICE_HEIGHT - GRID_TOP - (ROWS - 1) * GAP) / ROWS

Page({
  onInit() {
    // Non-root pages don't get native swipe-back for free (confirmed by
    // quick-notes/page/notes-list, which needs this same explicit
    // registration) — every internal page has to wire it up itself.
    onGesture({
      callback: (gesture) => {
        if (gesture === GESTURE_RIGHT) {
          back()
          return true
        }
        return false
      },
    })
  },
  build() {
    logger.debug('categories build')

    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR })

    createWidget(widget.TEXT, {
      x: 0,
      y: TOP,
      w: DEVICE_WIDTH,
      h: SUBTITLE_H,
      text: 'Elige una categoria',
      text_size: 16,
      color: MUTED_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    CATEGORIES.forEach((cat, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = SIDE_PAD + col * (CELL_W + GAP)
      const y = GRID_TOP + row * (CELL_H + GAP)

      createWidget(widget.BUTTON, {
        x,
        y,
        w: CELL_W,
        h: CELL_H,
        radius: 12,
        text: cat.short,
        text_size: 13,
        color: TEXT_COLOR,
        normal_color: cat.color,
        press_color: darken(cat.color),
        click_func: () => {
          push({ url: 'page/keypad/index', params: { category: cat.id } })
        },
      })
    })
  },
})
