<script setup lang="ts">
import { onWatcherCleanup, ref, watch } from 'vue';

interface Product {
  id: number;
  name: string;
  price: number;
}

const query = ref('');
const results = ref<Product[]>([]);
const renderedCount = ref(0);
const list = ref<HTMLUListElement | null>(null);

watch(
  query,
  async (q) => {
    // TODO: create an AbortController, abort it with onWatcherCleanup and pass its signal to fetch
    const response = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
    results.value = await response.json();
  },
  { immediate: true },
);

watch(results, () => {
  // TODO: this reads the DOM before it is updated; fix the flush timing
  renderedCount.value = list.value?.children.length ?? 0;
});
</script>

<template>
  <label>Search <input v-model="query" /></label>
  <ul ref="list">
    <li v-for="product in results" :key="product.id">{{ product.name }}</li>
  </ul>
  <p>Showing {{ renderedCount }} results</p>
</template>
