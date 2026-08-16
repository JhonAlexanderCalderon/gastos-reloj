import { createWidget, widget, align, text_style } from '@zos/ui'
import { push, back } from '@zos/router'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log as Logger } from '@zos/utils'
import { getCategoryById } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR, MUTED_COLOR } from '../../utils/theme'
import { formatMoney, darken } from '../../utils/format'
import { drawCornerBrackets } from '../../utils/decor'

const logger = Logger.getLogger('confirm-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

const TOP = 64
const BTN_W = 260
const BTN_H = 70
const BTN_X = (DEVICE_WIDTH - BTN_W) / 2
const BTN_Y = 262

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
      y: TOP + 20,
      w: DEVICE_WIDTH,
      h: 30,
      text: cat.label,
      text_size: 20,
      color: MUTED_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    createWidget(widget.TEXT, {
      x: 10,
      y: TOP + 60,
      w: DEVICE_WIDTH - 20,
      h: 80,
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
        push({ url: 'page/result/index', params: { category: this.state.category, amount: this.state.amount } })
      },
    })

    drawCornerBrackets(DEVICE_WIDTH, DEVICE_HEIGHT, cat.color)
  },
})
