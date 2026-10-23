import type { AdministrationOverview, StorageBalancingOverview } from '@/api/administrationApi'

interface DisplayRow {
  label: string
  value: string | number
}

interface StatusCard extends DisplayRow {
  note: string
  valueClass?: string
}

export function hubStatusCards(overview: AdministrationOverview): StatusCard[] {
  const { hubHealth: hub, transferMonitoring: transfers } = overview
  return [
    {
      label: 'Hub-Konfiguration',
      value: hub.ready ? 'Betriebsbereit' : 'Nicht bereit',
      valueClass: hub.ready ? 'text-success' : 'text-danger',
      note: `Quellknoten: ${hub.sourceNodeKey || 'nicht konfiguriert'}`
    },
    {
      label: 'Transport',
      value: hub.transport.requireMtls ? 'mTLS erforderlich' : 'TLS',
      valueClass: hub.transport.ready ? 'text-success' : 'text-danger',
      note: `Transportmaterial: ${hub.transport.ready ? 'bereit' : 'nicht bereit'}`
    },
    {
      label: 'Transferaufträge',
      value: transfers.total,
      note: `${String(transfers.counts.failed || 0)} fehlgeschlagen`
    },
    {
      label: 'Automatische Queue',
      value: hub.autoQueueEnabled ? 'Aktiv' : 'Inaktiv',
      note: hub.exactlyOneActiveHub ? 'Ein aktiver Hub' : 'Hub-Auswahl uneindeutig'
    }
  ]
}

function plannerLabel(planner: StorageBalancingOverview['planner']): string {
  if (planner.status === 'contract_unavailable') {
    return 'Vertrag nicht verfügbar'
  }
  if (!planner.compatible) {
    return 'Vertrag inkompatibel'
  }
  return planner.queueExecutionEnabled
    ? 'Planung und Ausführung aktiv'
    : 'Nur Planung · keine Ausführung'
}

function formatStateCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts)
  return entries.length
    ? entries.map(([state, count]) => `${state}: ${String(count)}`).join(' · ')
    : 'keine Einträge'
}

function queueExecutionCard(storage: StorageBalancingOverview): StatusCard {
  const enabled = storage.planner.queueExecutionEnabled
  return {
    label: 'Queue-Ausführung',
    value: enabled ? 'Aktiv' : 'Deaktiviert',
    valueClass: enabled ? 'text-success' : 'text-danger',
    note: `Fehler: ${String(storage.failedTransferCount)}, überfällige Reservierungen: ${String(storage.overdueReservationCount)}, auslaufende Schlüsselobjekte: ${String(storage.retiredTransferCount)}`
  }
}

function reconciliationCard(storage: StorageBalancingOverview): StatusCard {
  return {
    label: 'Reconciliation',
    value: `${String(storage.reconciliationCriticalCount)} kritisch · ${String(storage.reconciliationWarningCount)} Warnungen`,
    valueClass: storage.reconciliationCriticalCount ? 'text-danger' : 'text-muted',
    note: `${String(storage.reconciliationRunCount)} Läufe · ${storage.lastReconciliationAt ?? 'noch nicht ausgeführt'}`
  }
}

export function storageStatusCards(storage: StorageBalancingOverview): StatusCard[] {
  const { planner } = storage
  return [
    {
      label: 'Platzierungsplaner',
      value: plannerLabel(planner),
      valueClass: planner.compatible ? 'text-warning' : 'text-danger',
      note: `Vertrag: ${planner.contractVersion ?? 'nicht veröffentlicht'} / erwartet ${planner.expectedContractVersion}`
    },
    {
      label: 'Reservierungen',
      value: storage.activeReservationCount,
      note: formatStateCounts(storage.reservationCounts)
    },
    {
      label: 'Rotationsqueue',
      value: storage.queuedRotationCount,
      note: formatStateCounts(storage.rotationCounts)
    },
    queueExecutionCard(storage),
    reconciliationCard(storage)
  ]
}

export function effectivePermissionRows(
  permissions: AdministrationOverview['effectivePermissions']
): DisplayRow[] {
  return [
    {
      label: 'Center',
      value:
        permissions.centers.map((center) => center.displayName).join(', ') || 'nicht zugeordnet'
    },
    {
      label: 'Center-Administration',
      value: permissions.centerScopeAdmin ? 'erlaubt' : 'nicht erlaubt'
    },
    { label: 'Keycloak-Rollen ändern', value: 'nicht unterstützt' }
  ]
}
