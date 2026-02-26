<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-0">Berichts-Arbeitsliste</h5>
        <small class="text-muted">Neue Berichte starten oder bestehende Fälle fortsetzen.</small>
      </div>
      <RouterLink class="btn btn-primary btn-sm" to="/reporting/case-setup">Neuen Bericht starten</RouterLink>
    </div>
    <div class="card-body">
      <p class="text-muted mb-2">
        Erste Strukturseite. Als Nächstes werden Entwürfe/finale Berichte geladen und Filter ergänzt.
      </p>
      <div class="alert alert-info mb-0">
        Der bestehende monolithische Workflow bleibt unter <code>/report-generator</code> verfügbar.
      </div>
    </div>
  </div>
</template>
