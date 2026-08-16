import { getBalance, getSyncStatus, getWatchUid } from '../utils/gastos-firestore'
import { PINNED_PAYER_NAME, PINNED_COUPLE_ID } from '../utils/gastos-config'

// This page is purely informational/diagnostic — unlike quick-notes'
// settings page, there's nothing to edit here. The watch always registers
// expenses as PINNED_PAYER_NAME; there's no "who paid" step on-device.
let hasFetchedUid = false

AppSettingsPage({
  state: {
    watchUid: '',
    syncStatus: { lastSyncAt: '', lastSyncDirection: '', lastError: '' },
    checking: false,
    props: {},
  },

  setState(props) {
    this.state.props = props
    this.state.watchUid = props.settingsStorage.getItem('_watchUid') || ''
    this.state.syncStatus = getSyncStatus(props.settingsStorage)
    this.state.checking = props.settingsStorage.getItem('_checking') === '1'
  },

  async checkConnection() {
    const storage = this.state.props.settingsStorage
    storage.setItem('_checking', '1')
    try {
      await getBalance(storage)
      const uid = await getWatchUid(storage)
      if (uid) storage.setItem('_watchUid', uid)
    } catch (e) {
      // getBalance/getWatchUid already record the error into storage.
    } finally {
      storage.setItem('_checking', '')
    }
  },

  build(props) {
    this.setState(props)

    if (!hasFetchedUid) {
      hasFetchedUid = true
      this.checkConnection()
    }

    const status = this.state.syncStatus
    const lastSyncText = status.lastSyncAt
      ? `Ultima conexion ok: ${new Date(status.lastSyncAt).toLocaleString()}`
      : 'Todavia no se conecto con la nube'

    return View({ style: { padding: '14px 16px' } }, [
      View(
        {
          style: {
            border: '1px solid #eaeaea',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '14px',
            backgroundColor: 'white',
          },
        },
        [
          Text({ bold: true, style: { fontSize: '12px', color: '#333333' } }, 'Identidad fija de este reloj'),
          Text(
            { style: { fontSize: '12px', color: '#555555', marginTop: '6px' } },
            `Registra todos los gastos como: ${PINNED_PAYER_NAME}`
          ),
          Text(
            { style: { fontSize: '11px', color: '#888888', marginTop: '6px' } },
            `UID de este reloj (referencia tecnica para reglas de Firestore):`
          ),
          Text(
            { style: { fontSize: '11px', color: '#333333', marginTop: '2px' } },
            this.state.watchUid || 'Obteniendo...'
          ),
          Text(
            { style: { fontSize: '11px', color: '#888888', marginTop: '6px' } },
            `Pareja: ${PINNED_COUPLE_ID}`
          ),
        ]
      ),

      View(
        {
          style: {
            border: '1px solid ' + (status.lastError ? '#FCA5A5' : '#DCFCE7'),
            borderRadius: '8px',
            padding: '10px',
            backgroundColor: status.lastError ? '#FEF2F2' : '#F0FDF4',
          },
        },
        [
          Text({ bold: true, style: { fontSize: '12px', color: '#333333' } }, 'Conexion con la nube'),
          Text({ style: { fontSize: '11px', color: '#555555', marginTop: '4px' } }, lastSyncText),
          status.lastError &&
            Text(
              { style: { fontSize: '11px', color: '#B91C1C', marginTop: '4px' } },
              `Ultimo error: ${status.lastError}`
            ),
          Button({
            label: this.state.checking ? 'Verificando...' : 'Verificar conexion',
            style: {
              fontSize: '12px',
              lineHeight: '28px',
              borderRadius: '20px',
              background: '#409EFF',
              color: 'white',
              textAlign: 'center',
              marginTop: '8px',
            },
            onClick: () => this.checkConnection(),
          }),
          Text(
            { style: { fontSize: '10px', color: '#888888', marginTop: '8px' } },
            'Si aparece un error persistente: revisa que el telefono tenga internet, cerra esta pantalla de Ajustes y volvela a abrir, y proba "Verificar conexion" de nuevo. Si el UID de arriba cambia (por ejemplo tras reinstalar la app), hay que actualizar las reglas de Firestore de gastos-pareja con el nuevo valor para que el reloj pueda seguir leyendo y guardando gastos.'
          ),
        ]
      ),
    ])
  },
})
