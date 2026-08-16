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
  GREEN_COLOR,
  RED_COLOR,
  DANGER_COLOR,
  DANGER_PRESS_COLOR,
  SURFACE_COLOR,
  SURFACE_PRESS_COLOR,
} from '../../utils/theme'
import { formatMoney, formatTime12h } from '../../utils/format'
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

const LABEL_Y = 96
const LABEL_H = 32

// Rounded "modern button" card behind the amount — colored border matching
// the value's own color, dark surface fill, per feedback.
const CARD_BORDER = 4
const CARD_W = 280
const CARD_H = 140
const CARD_X = (DEVICE_WIDTH - CARD_W) / 2
const CARD_Y = LABEL_Y + LABEL_H + 12
const CARD_RADIUS = 28

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

    // The status word itself carries the color now (not a muted caption)
    // so green/red reads unmistakably at a glance, per feedback.
    w.statusText = createWidget(widget.TEXT, {
      x: 0,
      y: LABEL_Y,
      w: DEVICE_WIDTH,
      h: LABEL_H,
      text: 'Cargando...',
      text_size: 24,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
    })

    // Rounded card behind the figure — outer rect is the colored "border",
    // inner rect is the dark fill, same two-layer trick used for the
    // BUTTON-less rounded-border look (Zepp widgets don't support a
    // stroke-only border).
    w.cardBorder = createWidget(widget.FILL_RECT, {
      x: CARD_X,
      y: CARD_Y,
      w: CARD_W,
      h: CARD_H,
      radius: CARD_RADIUS,
      color: TEXT_COLOR,
    })
    createWidget(widget.FILL_RECT, {
      x: CARD_X + CARD_BORDER,
      y: CARD_Y + CARD_BORDER,
      w: CARD_W - CARD_BORDER * 2,
      h: CARD_H - CARD_BORDER * 2,
      radius: CARD_RADIUS - CARD_BORDER,
      color: SURFACE_COLOR,
    })

    // The consolidated figure is the whole point of this screen — give it
    // most of the vertical space and center it.
    w.amountText = createWidget(widget.TEXT, {
      x: CARD_X + CARD_BORDER,
      y: CARD_Y + CARD_BORDER,
      w: CARD_W - CARD_BORDER * 2,
      h: CARD_H - CARD_BORDER * 2,
      text: '--',
      // Needs to fit up to ~9 chars ("$1,234.56") in ~260px; verify
      // on-device and tune if it clips.
      text_size: 48,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
    })

    w.updatedText = createWidget(widget.TEXT, {
      x: 0,
      y: 336,
      w: DEVICE_WIDTH,
      h: 22,
      text: '',
      text_size: 14,
      color: TEXT_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    const goToCategories = () => push({ url: 'page/categories/index' })
    w.amountText.addEventListener(event.CLICK_DOWN, goToCategories)
    w.statusText.addEventListener(event.CLICK_DOWN, goToCategories)
    w.cardBorder.addEventListener(event.CLICK_DOWN, goToCategories)

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

    w.statusText.setProperty(prop.MORE, { text: label, color })
    w.amountText.setProperty(prop.MORE, { text: formatMoney(Math.abs(diff)), color })
    w.cardBorder.setProperty(prop.MORE, { color })
    w.updatedText.setProperty(prop.MORE, {
      text: updatedAt ? `Actualizado ${formatTime12h(updatedAt)}` : 'Sin conexion aun',
    })
  },
})
