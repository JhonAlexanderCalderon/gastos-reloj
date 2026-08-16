// Mirrors gastos-pwa/src/utils/balance.js's calcBalance() + monthKey() —
// same formula, kept in sync deliberately rather than shared, since these
// are separate deployable projects.
export function calcBalance(expenses, myUid) {
  let myTotal = 0
  let partnerTotal = 0
  for (const e of expenses) {
    if (e.paidBy === myUid) myTotal += e.amount
    else partnerTotal += e.amount
  }
  const total = myTotal + partnerTotal
  const fair = total / 2
  const diff = myTotal - fair
  const status = Math.abs(diff) < 0.01 ? 'even' : diff > 0 ? 'owed' : 'owes'
  return { myTotal, partnerTotal, total, diff, status }
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
