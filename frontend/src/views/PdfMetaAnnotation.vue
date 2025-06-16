<template>

    <div class="container-fluid h-100 w-100 py-1 px-4">
      <div class="row">
        <div class="col-12">
          <PdfAnnotation />
        </div>
      </div>
    </div>

</template>

<script>
  import PdfAnnotation from '@/components/EndoAI/PdfAnnotation.vue'

export default {
name: 'PdfMetaAnnotationView',
components: {
    PdfAnnotation,
},
};
</script>

<style>
</style>
