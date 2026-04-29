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
          Sphinx docs are served from <code>{{ docsUrl }}</code>. Rebuild them with
          <code>make docs-publish</code> for local updates, or <code>make package</code> to publish
          them into packaged artifacts.
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
import { getStaticUrl } from '@/utils/getStaticUrl'

const docsUrl = computed(() => {
  return getStaticUrl('docs/index.html')
})
</script>

<style scoped>
.docs-frame {
  width: 100%;
  min-height: calc(100vh - 280px);
  border: 0;
}
</style>
