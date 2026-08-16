import { FIREBASE_CONFIG } from './firebase-config'
import { PINNED_COUPLE_ID, PINNED_PAYER_UID, PINNED_PAYER_NAME } from './gastos-config'
import { calcBalance, monthKey } from './balance'
import { withTimeout } from './timeout'

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`
const COUPLE_URL = `${BASE_URL}/couples/${PINNED_COUPLE_ID}`

// Bounds every network step so a bad connection fails fast into the
// retry/error UI instead of leaving the watch stuck on "Guardando..."
// indefinitely — this is what was happening before: no timeout meant the
// promise just never settled until the underlying request eventually did.
const FETCH_TIMEOUT_MS = 12000

function timedFetch(url, options) {
  return withTimeout(fetch(url, options), FETCH_TIMEOUT_MS, 'La conexion tardo demasiado')
}

function recordSuccess(storage, direction) {
  storage.setItem('_fbLastSyncAt', new Date().toISOString())
  storage.setItem('_fbLastSyncDirection', direction)
  storage.setItem('_fbLastError', '')
}

function recordError(storage, err) {
  storage.setItem('_fbLastError', (err && err.message) || String(err))
}

export function getSyncStatus(storage) {
  return {
    lastSyncAt: storage.getItem('_fbLastSyncAt') || '',
    lastSyncDirection: storage.getItem('_fbLastSyncDirection') || '',
    lastError: storage.getItem('_fbLastError') || '',
  }
}

// Same anonymous-auth-with-cached-refresh-token pattern as
// quick-notes/utils/firestore-sync.js, pointed at a different Firebase
// project (gastos-pareja-ca457) — this identity is separate from the
// quick-notes watch's, and gets pinned in gastos-pwa/firestore.rules once
// generated for the first time.
async function getIdToken(storage) {
  const cachedRefreshToken = storage.getItem('_fbRefreshToken')

  if (cachedRefreshToken) {
    try {
      const res = await timedFetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${cachedRefreshToken}`,
      })
      const data = await res.json()
      if (data.id_token) return data.id_token
    } catch (e) {
      // fall through to a fresh anonymous sign-up below
    }
  }

  const res = await timedFetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  })
  const data = await res.json()
  if (!data.idToken) throw new Error(data.error?.message || 'No se pudo autenticar con Firebase')
  if (data.refreshToken) storage.setItem('_fbRefreshToken', data.refreshToken)
  return data.idToken
}

export async function getWatchUid(storage) {
  const idToken = await getIdToken(storage)
  // The token itself doesn't carry the uid in a form worth parsing here —
  // getSelfAccount is the simple documented way to read it back.
  const res = await timedFetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const data = await res.json()
  return data.users && data.users[0] && data.users[0].localId
}

export async function getBalance(storage) {
  try {
    const idToken = await getIdToken(storage)
    // Matches the PWA's headline balance card, which is the all-time
    // consolidated total (HomePage.jsx: `historicBalance`), not just the
    // current month — a month-filtered query here would show a different
    // number than what the user sees first in the PWA.
    const res = await timedFetch(`${COUPLE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'expenses' }],
        },
      }),
    })
    if (!res.ok) throw new Error(`Firestore respondio ${res.status} al leer gastos`)
    const rows = await res.json()
    const expenses = (Array.isArray(rows) ? rows : [])
      .filter((row) => row.document)
      .map((row) => ({
        paidBy: row.document.fields.paidBy?.stringValue,
        amount: Number(row.document.fields.amount?.doubleValue ?? row.document.fields.amount?.integerValue ?? 0),
      }))
    const { diff } = calcBalance(expenses, PINNED_PAYER_UID)
    const updatedAt = new Date().toISOString()
    recordSuccess(storage, 'balance')
    return { ok: true, diff, updatedAt }
  } catch (err) {
    recordError(storage, err)
    return { ok: false, error: (err && err.message) || String(err) }
  }
}

export function genExpenseId() {
  return 'w' + Date.now() + Math.floor(Math.random() * 1000)
}

// id must be generated once by the caller (confirm page) and reused across
// retries — PATCH to the same doc path makes a retry idempotent (just
// overwrites identical data) instead of creating a duplicate expense if an
// earlier attempt actually reached Firestore but its response was lost.
export async function saveExpense(storage, { id, category, amount }) {
  try {
    const idToken = await getIdToken(storage)
    const now = new Date().toISOString()
    const month = monthKey()

    const res = await timedFetch(`${COUPLE_URL}/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          id: { stringValue: id },
          coupleId: { stringValue: PINNED_COUPLE_ID },
          paidBy: { stringValue: PINNED_PAYER_UID },
          paidByName: { stringValue: PINNED_PAYER_NAME },
          amount: { doubleValue: amount },
          category: { stringValue: category },
          subtype: { nullValue: null },
          description: { stringValue: '' },
          date: { timestampValue: now },
          month: { stringValue: month },
          createdAt: { timestampValue: now },
        },
      }),
    })
    if (!res.ok) throw new Error(`Firestore respondio ${res.status} al guardar`)
    recordSuccess(storage, 'save')
    return { ok: true, savedAt: now }
  } catch (err) {
    recordError(storage, err)
    return { ok: false, error: (err && err.message) || String(err) }
  }
}
