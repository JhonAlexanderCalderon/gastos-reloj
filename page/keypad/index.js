import { createWidget, widget, align, text_style, prop } from '@zos/ui'
import { push, back } from '@zos/router'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log as Logger } from '@zos/utils'
import { getCategoryById } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR, SURFACE_COLOR, SURFACE_PRESS_COLOR } from '../../utils/theme'
import { darken } from '../../utils/format'

const logger = Logger.getLogger('keypad-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

// Amount (left) + OK (top-right) share the header row; the category moves
// to a thin full-width tab flush against the bottom edge instead of a
// header line — the screen is curved there, so a strip that hugs the edge
// uses that space better than a row of square buttons would.
const TOP = 64
const HEADER_H = 44
const OK_BTN_W = 86
const OK_BTN_H = 40
const OK_BTN_X = DEVICE_WIDTH - 14 - OK_BTN_W
const OK_BTN_Y = TOP + (HEADER_H - OK_BTN_H) / 2
const AMOUNT_X = 14
const AMOUNT_W = OK_BTN_X - 8 - AMOUNT_X

const CATEGORY_TAB_H = 32
const CATEGORY_TAB_Y = DEVICE_HEIGHT - CATEGORY_TAB_H

const KEYPAD_TOP = TOP + HEADER_H + 8
const KEYPAD_BOTTOM = CATEGORY_TAB_Y - 6

const COLS = 3
const ROWS = 4
const SIDE_PAD = 10
const GAP = 6
const CELL_W = (DEVICE_WIDTH - SIDE_PAD * 2 - (COLS - 1) * GAP) / COLS
const CELL_H = (KEYPAD_BOTTOM - KEYPAD_TOP - (ROWS - 1) * GAP) / ROWS

const MAX_LEN = 8

const KEYS = [
  { label: '1', col: 0, row: 0, kind: 'digit' },
  { label: '2', col: 1, row: 0, kind: 'digit' },
  { label: '3', col: 2, row: 0, kind: 'digit' },
  { label: '4', col: 0, row: 1, kind: 'digit' },
  { label: '5', col: 1, row: 1, kind: 'digit' },
  { label: '6', col: 2, row: 1, kind: 'digit' },
  { label: '7', col: 0, row: 2, kind: 'digit' },
  { label: '8', col: 1, row: 2, kind: 'digit' },
  { label: '9', col: 2, row: 2, kind: 'digit' },
  { label: '.', col: 0, row: 3, kind: 'dot' },
  { label: '0', col: 1, row: 3, kind: 'digit' },
  { label: 'DEL', col: 2, row: 3, kind: 'del' },
]

Page({
  state: {
    category: null,
    amountStr: '',
    w: {},
  },
  onInit(params) {
    const { category } = params ? JSON.parse(params) : {}
    this.state.category = category

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
    logger.debug('keypad build')
    const w = this.state.w
    const cat = getCategoryById(this.state.category)

    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR })

    w.amountText = createWidget(widget.TEXT, {
      x: AMOUNT_X,
      y: TOP,
      w: AMOUNT_W,
      h: HEADER_H,
      text: '$0.00',
      text_size: 30,
      color: TEXT_COLOR,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
    })

    createWidget(widget.BUTTON, {
      x: OK_BTN_X,
      y: OK_BTN_Y,
      w: OK_BTN_W,
      h: OK_BTN_H,
      radius: OK_BTN_H / 2,
      text: 'OK',
      text_size: 18,
      color: TEXT_COLOR,
      normal_color: cat.color,
      press_color: darken(cat.color),
      click_func: () => this.onAccept(),
    })

    KEYS.forEach((key) => {
      const x = SIDE_PAD + key.col * (CELL_W + GAP)
      const y = KEYPAD_TOP + key.row * (CELL_H + GAP)

      createWidget(widget.BUTTON, {
        x,
        y,
        w: CELL_W,
        h: CELL_H,
        radius: 10,
        text: key.label,
        text_size: 22,
        color: TEXT_COLOR,
        normal_color: SURFACE_COLOR,
        press_color: SURFACE_PRESS_COLOR,
        click_func: () => this.onKey(key),
      })
    })

    // Thin category tab flush to the bottom edge — absorbs the curved
    // margin that square keys can't use well, and keeps the category
    // visible without stealing header space from the amount/OK row.
    createWidget(widget.FILL_RECT, {
      x: 0,
      y: CATEGORY_TAB_Y,
      w: DEVICE_WIDTH,
      h: CATEGORY_TAB_H,
      color: cat.color,
    })
    createWidget(widget.TEXT, {
      x: 0,
      y: CATEGORY_TAB_Y,
      w: DEVICE_WIDTH,
      h: CATEGORY_TAB_H,
      text: cat.label,
      text_size: 16,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
    })
  },
  onKey(key) {
    const s = this.state
    if (key.kind === 'digit') {
      if (s.amountStr.length >= MAX_LEN) return
      if (s.amountStr === '0') s.amountStr = key.label
      else s.amountStr += key.label
    } else if (key.kind === 'dot') {
      if (s.amountStr.includes('.')) return
      s.amountStr = s.amountStr === '' ? '0.' : s.amountStr + '.'
    } else if (key.kind === 'del') {
      s.amountStr = s.amountStr.slice(0, -1)
    }
    this.refreshAmount()
  },
  onAccept() {
    const amount = parseFloat(this.state.amountStr)
    if (!amount || amount <= 0) return
    push({ url: 'page/confirm/index', params: { category: this.state.category, amount } })
  },
  refreshAmount() {
    const w = this.state.w
    const text = this.state.amountStr === '' ? '$0.00' : `$${this.state.amountStr}`
    w.amountText.setProperty(prop.MORE, { text })
  },
})
