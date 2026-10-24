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
    const controller = new AbortController();
    onWatcherCleanup(() => controller.abort());
    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      results.value = await response.json();
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        throw error;
      }
    }
  },
  { immediate: true },
);

watch(
  results,
  () => {
    renderedCount.value = list.value?.children.length ?? 0;
  },
  { flush: 'post' },
);
</script>

<template>
  <label>Search <input v-model="query" /></label>
  <ul ref="list">
    <li v-for="product in results" :key="product.id">{{ product.name }}</li>
  </ul>
  <p>Showing {{ renderedCount }} results</p>
</template>
