<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <div class="row">
      <div class="col-12">    
        <h1>G-Play-Toolkit - Annotationen</h1>
        <p>Hier finden Sie die aktuell verfügbaren Annotationen.</p>
      </div>
      <div class="col-12">
        <h2>Statistiken</h2>
        <ul>
          <li v-for="(value, key) in stats" :key="key">
            {{ key }}: {{ value }}
          </li>
        </ul>
      </div>
      <VideoDashboard />
    </div>
  </div>
</template>

<script>
import VideoDashboard from '@/components/EndoAI/VideoDashboard.vue';
import { fetchStats } from '@/api/axiosInstance';

export default {
  name: 'Annotationen',
  components: {
    VideoDashboard,
  },
  data() {
    return {
      stats: {},
    };
  },
  mounted() {
    this.loadStats();
  },
  methods: {
    async loadStats() {
      try {
        const response = await fetchStats();
        this.stats = response.data;
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    },
  },
};
</script>

<style>
</style>