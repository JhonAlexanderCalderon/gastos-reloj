import { createWidget, widget, align, text_style, prop } from '@zos/ui'
import { push, back } from '@zos/router'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log as Logger } from '@zos/utils'
import { getCategoryById } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR, MUTED_COLOR, SURFACE_COLOR, SURFACE_PRESS_COLOR } from '../../utils/theme'

const logger = Logger.getLogger('keypad-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

const TOP = 64
const LABEL_H = 22
const AMOUNT_TOP = TOP + LABEL_H + 4
const AMOUNT_H = 46
const KEYPAD_TOP = AMOUNT_TOP + AMOUNT_H + 10

const COLS = 3
const ROWS = 5
const SIDE_PAD = 10
const GAP = 6
const CELL_W = (DEVICE_WIDTH - SIDE_PAD * 2 - (COLS - 1) * GAP) / COLS
const CELL_H = (DEVICE_HEIGHT - KEYPAD_TOP - (ROWS - 1) * GAP) / ROWS

const MAX_LEN = 8

// row/col grid; the accept key sits bottom-right of the grid, as requested,
// rather than as a separate full-width button below it.
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
  { label: 'OK', col: 2, row: 4, kind: 'accept' },
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

    createWidget(widget.TEXT, {
      x: 0,
      y: TOP,
      w: DEVICE_WIDTH,
      h: LABEL_H,
      text: cat.label,
      text_size: 16,
      color: MUTED_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    w.amountText = createWidget(widget.TEXT, {
      x: 10,
      y: AMOUNT_TOP,
      w: DEVICE_WIDTH - 20,
      h: AMOUNT_H,
      text: '$0.00',
      text_size: 34,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
    })

    KEYS.forEach((key) => {
      const x = SIDE_PAD + key.col * (CELL_W + GAP)
      const y = KEYPAD_TOP + key.row * (CELL_H + GAP)
      const isAccept = key.kind === 'accept'

      createWidget(widget.BUTTON, {
        x,
        y,
        w: CELL_W,
        h: CELL_H,
        radius: 10,
        text: key.label,
        text_size: isAccept ? 15 : 20,
        color: TEXT_COLOR,
        normal_color: isAccept ? cat.color : SURFACE_COLOR,
        press_color: isAccept ? SURFACE_PRESS_COLOR : SURFACE_PRESS_COLOR,
        click_func: () => this.onKey(key),
      })
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
    } else if (key.kind === 'accept') {
      const amount = parseFloat(s.amountStr)
      if (!amount || amount <= 0) return
      push({ url: 'page/confirm/index', params: { category: s.category, amount } })
      return
    }
    this.refreshAmount()
  },
  refreshAmount() {
    const w = this.state.w
    const text = this.state.amountStr === '' ? '$0.00' : `$${this.state.amountStr}`
    w.amountText.setProperty(prop.MORE, { text })
  },
})
