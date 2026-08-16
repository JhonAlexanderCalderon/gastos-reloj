import { createWidget, widget, align, text_style, prop } from '@zos/ui'
import { back } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { log as Logger } from '@zos/utils'
import { getCategoryById } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR, MUTED_COLOR, GREEN_COLOR, RED_COLOR, SURFACE_COLOR, SURFACE_PRESS_COLOR } from '../../utils/theme'
import { formatMoney, formatTime12h } from '../../utils/format'
import { drawScreenFrame } from '../../utils/decor'
import { withTimeout } from '../../utils/timeout'

const logger = Logger.getLogger('result-page')
// Comfortably longer than the side service's own internal fetch timeouts
// (up to ~24s worst case: a refresh-token attempt plus a fresh sign-up,
// each capped at 12s) so that a real network failure surfaces its actual
// message instead of being masked by this generic one firing first.
const REQUEST_TIMEOUT_MS = 30000
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

const TOP = 64
const BTN_W = 220
const BTN_H = 64
const BTN_X = (DEVICE_WIDTH - BTN_W) / 2
const BTN_Y = 270

Page({
  state: {
    id: null,
    category: null,
    amount: 0,
    status: 'saving', // saving | ok | error
    savedAt: '',
    w: {},
  },
  onInit(params) {
    const { id, category, amount } = params ? JSON.parse(params) : {}
    this.state.id = id
    this.state.category = category
    this.state.amount = amount
    // Back from here re-enters the confirm screen with no data loss risk —
    // this only pops the page, it doesn't retry/cancel the save in flight.
  },
  build() {
    logger.debug('result build')
    const w = this.state.w

    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR })

    w.statusText = createWidget(widget.TEXT, {
      x: 0,
      y: TOP + 30,
      w: DEVICE_WIDTH,
      h: 40,
      text: 'Guardando...',
      text_size: 26,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    w.detailText = createWidget(widget.TEXT, {
      x: 10,
      y: TOP + 80,
      w: DEVICE_WIDTH - 20,
      h: 70,
      text: '',
      text_size: 20,
      color: MUTED_COLOR,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
    })

    w.actionBtn = createWidget(widget.BUTTON, {
      x: BTN_X,
      y: BTN_Y,
      w: BTN_W,
      h: BTN_H,
      radius: BTN_H / 2,
      text: 'Listo',
      text_size: 22,
      color: TEXT_COLOR,
      normal_color: SURFACE_COLOR,
      press_color: SURFACE_PRESS_COLOR,
      click_func: () => this.onActionClick(),
    })
    w.actionBtn.setProperty(prop.VISIBLE, false)

    w.frame = drawScreenFrame(DEVICE_WIDTH, DEVICE_HEIGHT, TEXT_COLOR)

    this.saveExpense()
  },
  saveExpense() {
    this.state.status = 'saving'
    this.refreshUI()

    const { messageBuilder } = getApp()._options.globalData
    withTimeout(
      messageBuilder.request({
        method: 'SAVE_EXPENSE',
        id: this.state.id,
        category: this.state.category,
        amount: this.state.amount,
      }),
      REQUEST_TIMEOUT_MS,
      'El telefono no respondio a tiempo'
    )
      .then((result) => {
        if (!result || result.ok === false) throw new Error(result && result.error)
        this.state.status = 'ok'
        this.state.savedAt = result.savedAt
        this.refreshUI()
      })
      .catch(() => {
        this.state.status = 'error'
        this.refreshUI()
      })
  },
  onActionClick() {
    if (this.state.status === 'error') {
      this.saveExpense()
      return
    }
    // Pop back through confirm -> keypad -> categories -> balance. Router
    // has no multi-level back/replace, so this chains four single pops.
    back()
    back()
    back()
    back()
  },
  refreshUI() {
    const w = this.state.w
    if (!w.statusText) return
    const cat = getCategoryById(this.state.category)
    const s = this.state

    let frameColor = TEXT_COLOR

    if (s.status === 'saving') {
      w.statusText.setProperty(prop.MORE, { text: 'Guardando...', color: TEXT_COLOR })
      w.detailText.setProperty(prop.MORE, { text: `${cat.label}  ${formatMoney(s.amount)}` })
      w.actionBtn.setProperty(prop.VISIBLE, false)
    } else if (s.status === 'ok') {
      w.statusText.setProperty(prop.MORE, { text: 'Gasto guardado', color: GREEN_COLOR })
      w.detailText.setProperty(prop.MORE, {
        text: `${cat.label}  ${formatMoney(s.amount)}\n${formatTime12h(s.savedAt)}`,
      })
      w.actionBtn.setProperty(prop.MORE, { text: 'Listo' })
      w.actionBtn.setProperty(prop.VISIBLE, true)
      frameColor = GREEN_COLOR
    } else {
      w.statusText.setProperty(prop.MORE, { text: 'No se pudo guardar', color: RED_COLOR })
      w.detailText.setProperty(prop.MORE, { text: 'Revisa la conexion del telefono e intenta de nuevo.' })
      w.actionBtn.setProperty(prop.MORE, { text: 'Reintentar' })
      w.actionBtn.setProperty(prop.VISIBLE, true)
      frameColor = RED_COLOR
    }

    w.frame.forEach((f) => f.setProperty(prop.MORE, { color: frameColor }))
  },
})
