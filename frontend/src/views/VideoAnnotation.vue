<template>

    <div class="container-fluid h-100 w-100 py-1 px-4">
      <div class="row">
        <div class="col-12">
          <ConceptDemo />
        </div>
      </div>
    </div>

</template>

<script>
import ConceptDemo from '../components/EndoAI/ConceptDemo.vue';


export default {
name: 'Dashboard',
components: {
    ConceptDemo,
},
};
</script>

<style>
</style>
