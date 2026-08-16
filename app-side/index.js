import { MessageBuilder } from '../shared/message-side'
import { getBalance, saveExpense } from '../utils/gastos-firestore'

const messageBuilder = new MessageBuilder()

AppSideService({
  onInit() {
    messageBuilder.listen(() => {})

    messageBuilder.on('request', async (ctx) => {
      const payload = messageBuilder.buf2Json(ctx.request.payload)

      if (payload.method === 'GET_BALANCE') {
        const result = await getBalance(settings.settingsStorage)
        ctx.response({ data: result })
        return
      }

      if (payload.method === 'SAVE_EXPENSE') {
        const result = await saveExpense(settings.settingsStorage, {
          id: payload.id,
          category: payload.category,
          amount: payload.amount,
        })
        ctx.response({ data: result })
      }
    })
  },

  onRun() {},
  onDestroy() {},
})
