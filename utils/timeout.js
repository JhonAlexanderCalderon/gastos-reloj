// Plain setTimeout/Promise.race — no AbortController, since that's
// unverified in this Zepp OS Side Service's QuickJS runtime (fetch itself
// is proven working, AbortController is not). The underlying network call
// may keep running after we stop waiting on it, but that's harmless now
// that writes are idempotent (see saveExpense's id contract).
export function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message || 'Tiempo de espera agotado')), ms)),
  ])
}
