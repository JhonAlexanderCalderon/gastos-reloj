import { createWidget, widget, align, text_style, prop, event } from '@zos/ui'
import { push, exit } from '@zos/router'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { localStorage } from '@zos/storage'
import { log as Logger } from '@zos/utils'
import {
  setPageBrightTime,
  pauseDropWristScreenOff,
  pausePalmScreenOff,
  resetDropWristScreenOff,
  resetPalmScreenOff,
} from '@zos/display'
import {
  BG_COLOR,
  TEXT_COLOR,
  MUTED_COLOR,
  GREEN_COLOR,
  RED_COLOR,
  DANGER_COLOR,
  DANGER_PRESS_COLOR,
  SURFACE_COLOR,
  SURFACE_PRESS_COLOR,
} from '../../utils/theme'
import { formatMoney, formatDateTime } from '../../utils/format'
import { drawCornerBrackets } from '../../utils/decor'
import { withTimeout } from '../../utils/timeout'

// See page/result for why this is longer than the side service's own
// internal fetch timeouts.
const REQUEST_TIMEOUT_MS = 30000

const logger = Logger.getLogger('balance-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

// Screen stays on for a fixed window rather than an estimated one (there's
// no countdown to estimate from here, unlike the timer app this pattern was
// adapted from) — long enough to pick a category, type an amount, and
// confirm without the watch dimming/locking mid-flow.
const STAY_AWAKE_MS = 180000

const EXIT_BTN_W = 260
const EXIT_BTN_H = 72
const EXIT_BTN_X = (DEVICE_WIDTH - EXIT_BTN_W) / 2
const EXIT_BTN_RADIUS = EXIT_BTN_H / 2
const EXIT_BTN_GAP = 16
const EXIT_BTN_Y1 = 140
const EXIT_BTN_Y2 = EXIT_BTN_Y1 + EXIT_BTN_H + EXIT_BTN_GAP

Page({
  state: {
    diff: 0,
    updatedAt: '',
    loaded: false,
    w: {},
  },
  onInit() {
    logger.debug('balance onInit')
    this.enableStayAwake()
    this.loadBalance()
  },
  build() {
    const w = this.state.w

    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR })

    w.statusText = createWidget(widget.TEXT, {
      x: 0,
      y: 90,
      w: DEVICE_WIDTH,
      h: 28,
      text: 'Cargando...',
      text_size: 20,
      color: MUTED_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    // The consolidated figure is the whole point of this screen — give it
    // most of the vertical space and center it, rather than a small line
    // among others.
    w.amountText = createWidget(widget.TEXT, {
      x: 6,
      y: 124,
      w: DEVICE_WIDTH - 12,
      h: 176,
      text: '--',
      // 52 rather than something bigger — needs to fit up to ~9 chars
      // ("$1,234.56") in ~300px; verify on-device and tune if it clips.
      text_size: 52,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
    })

    w.brackets = drawCornerBrackets(DEVICE_WIDTH, DEVICE_HEIGHT, MUTED_COLOR)

    w.updatedText = createWidget(widget.TEXT, {
      x: 0,
      y: 336,
      w: DEVICE_WIDTH,
      h: 22,
      text: '',
      text_size: 14,
      color: MUTED_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    const goToCategories = () => push({ url: 'page/categories/index' })
    w.amountText.addEventListener(event.CLICK_DOWN, goToCategories)
    w.statusText.addEventListener(event.CLICK_DOWN, goToCategories)

    // Exit-confirmation overlay — same shape as the one already proven in
    // the timer app (gesture swallow + Continuar/Salir), minus its
    // "Reiniciar" button which has no equivalent here.
    w.exitBg = createWidget(widget.FILL_RECT, { x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR })

    w.exitContinueBtn = createWidget(widget.BUTTON, {
      x: EXIT_BTN_X,
      y: EXIT_BTN_Y1,
      w: EXIT_BTN_W,
      h: EXIT_BTN_H,
      radius: EXIT_BTN_RADIUS,
      normal_color: SURFACE_COLOR,
      press_color: SURFACE_PRESS_COLOR,
      text: 'Continuar',
      text_size: 28,
      color: TEXT_COLOR,
      click_func: () => this.setExitMenuVisible(false),
    })

    w.exitQuitBtn = createWidget(widget.BUTTON, {
      x: EXIT_BTN_X,
      y: EXIT_BTN_Y2,
      w: EXIT_BTN_W,
      h: EXIT_BTN_H,
      radius: EXIT_BTN_RADIUS,
      normal_color: DANGER_COLOR,
      press_color: DANGER_PRESS_COLOR,
      text: 'Salir',
      text_size: 28,
      color: TEXT_COLOR,
      click_func: () => {
        this.disableStayAwake()
        exit()
      },
    })

    this.setExitMenuVisible(false)

    onGesture({
      callback: (gestureEvent) => {
        if (gestureEvent === GESTURE_RIGHT) {
          this.setExitMenuVisible(true)
          return true
        }
        return false
      },
    })

    if (this.state.loaded) this.refreshUI()
  },
  onShow() {
    // Re-arm the stay-awake window and pull a fresh balance whenever we
    // land back here (e.g. after finishing or aborting an expense entry).
    this.enableStayAwake()
    this.loadBalance()
  },
  onDestroy() {
    this.disableStayAwake()
  },
  setExitMenuVisible(visible) {
    const w = this.state.w
    w.exitBg.setProperty(prop.VISIBLE, visible)
    w.exitContinueBtn.setProperty(prop.VISIBLE, visible)
    w.exitQuitBtn.setProperty(prop.VISIBLE, visible)
  },
  enableStayAwake() {
    setPageBrightTime({ brightTime: STAY_AWAKE_MS })
    pauseDropWristScreenOff({ duration: STAY_AWAKE_MS })
    pausePalmScreenOff({ duration: STAY_AWAKE_MS })
  },
  disableStayAwake() {
    resetDropWristScreenOff()
    resetPalmScreenOff()
  },
  loadBalance() {
    const { messageBuilder } = getApp()._options.globalData
    withTimeout(messageBuilder.request({ method: 'GET_BALANCE' }), REQUEST_TIMEOUT_MS, 'timeout')
      .then((result) => {
        if (!result || result.ok === false) throw new Error(result && result.error)
        this.state.diff = result.diff
        this.state.updatedAt = result.updatedAt
        this.state.loaded = true
        localStorage.setItem('lastBalance', JSON.stringify(result))
        this.refreshUI()
      })
      .catch(() => {
        const cached = localStorage.getItem('lastBalance', null)
        if (cached) {
          const result = JSON.parse(cached)
          this.state.diff = result.diff
          this.state.updatedAt = result.updatedAt
        }
        this.state.loaded = true
        this.refreshUI()
      })
  },
  refreshUI() {
    const w = this.state.w
    if (!w.amountText) return
    const { diff, updatedAt } = this.state
    const owed = diff > 0.01
    const owes = diff < -0.01
    const color = owed ? GREEN_COLOR : owes ? RED_COLOR : TEXT_COLOR
    const label = owed ? 'Te deben' : owes ? 'Debes' : 'Al dia'

    w.statusText.setProperty(prop.MORE, { text: label, color: MUTED_COLOR })
    w.amountText.setProperty(prop.MORE, { text: formatMoney(Math.abs(diff)), color })
    w.updatedText.setProperty(prop.MORE, {
      text: updatedAt ? `Actualizado ${formatDateTime(updatedAt)}` : 'Sin conexion aun',
    })
    w.brackets.forEach((b) => b.setProperty(prop.MORE, { color }))
  },
})
