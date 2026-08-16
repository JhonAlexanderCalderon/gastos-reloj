import { createWidget, widget, align, text_style } from '@zos/ui'
import { push, back } from '@zos/router'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log as Logger } from '@zos/utils'
import { getCategoryById } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR } from '../../utils/theme'
import { formatMoney, darken } from '../../utils/format'
import { genExpenseId } from '../../utils/gastos-firestore'

const logger = Logger.getLogger('confirm-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

const TOP = 64
const BTN_W = 260
const BTN_H = 70
const BTN_X = (DEVICE_WIDTH - BTN_W) / 2
const BTN_Y = 268

const CAT_Y = TOP + 18
const CAT_H = 30
const AMOUNT_Y = CAT_Y + CAT_H + 18
const AMOUNT_H = 100

Page({
  state: {
    category: null,
    amount: 0,
  },
  onInit(params) {
    const { category, amount } = params ? JSON.parse(params) : {}
    this.state.category = category
    this.state.amount = amount

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
    logger.debug('confirm build')
    const cat = getCategoryById(this.state.category)

    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR })

    createWidget(widget.TEXT, {
      x: 0,
      y: CAT_Y,
      w: DEVICE_WIDTH,
      h: CAT_H,
      text: cat.label,
      text_size: 20,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    createWidget(widget.TEXT, {
      x: 10,
      y: AMOUNT_Y,
      w: DEVICE_WIDTH - 20,
      h: AMOUNT_H,
      text: formatMoney(this.state.amount),
      text_size: 50,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
    })

    createWidget(widget.BUTTON, {
      x: BTN_X,
      y: BTN_Y,
      w: BTN_W,
      h: BTN_H,
      radius: BTN_H / 2,
      text: 'Confirmar',
      text_size: 26,
      color: TEXT_COLOR,
      normal_color: cat.color,
      press_color: darken(cat.color),
      click_func: () => {
        // Generated once, here — result page reuses this same id on every
        // retry so a retry after a lost response overwrites instead of
        // duplicating (see saveExpense's contract).
        push({
          url: 'page/result/index',
          params: { id: genExpenseId(), category: this.state.category, amount: this.state.amount },
        })
      },
    })
  },
})
