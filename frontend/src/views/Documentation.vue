<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h5 class="mb-0">Documentation</h5>
        <a
          class="btn btn-outline-primary btn-sm"
          :href="docsUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in New Tab
        </a>
      </div>
      <div class="card-body p-0">
        <div class="alert alert-info rounded-0 mb-0 border-start-0 border-end-0">
          Sphinx docs are served from <code>{{ docsUrl }}</code>. If this page is empty, run
          <code>uv run --extra docs make -C docs html</code> and sync to <code>static/docs</code>.
        </div>
        <iframe
          :src="docsUrl"
          title="lx-annotate documentation"
          class="docs-frame"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const docsUrl = computed(() => {
  const staticUrlRaw = (window as any).STATIC_URL || '/static/'
  const staticUrl = String(staticUrlRaw).endsWith('/')
    ? String(staticUrlRaw)
    : `${String(staticUrlRaw)}/`
  return `${staticUrl}docs/index.html`
})
</script>

<style scoped>
.docs-frame {
  width: 100%;
  min-height: calc(100vh - 280px);
  border: 0;
}
</style>
