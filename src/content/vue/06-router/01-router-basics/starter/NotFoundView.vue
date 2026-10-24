<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <h1>Page not found</h1>
  <p>Nothing lives at {{ route.path }}.</p>
</template>
