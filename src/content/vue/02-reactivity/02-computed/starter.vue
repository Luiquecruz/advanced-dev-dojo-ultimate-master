<script setup lang="ts">
import { computed, ref } from 'vue';

const products = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
  { id: 3, name: 'IDE License', price: 199 },
  { id: 4, name: 'Monitor', price: 340 },
  { id: 5, name: 'Cloud Credits', price: 50 },
];

const query = ref('');
const maxPrice = ref(1000);

// TODO: filter by name (case-insensitive) and maxPrice
const filtered = computed(() => products);
// TODO: sum the filtered prices
const total = computed(() => 0);

const firstName = ref('Ada');
const lastName = ref('Lovelace');
// TODO: turn fullName into a writable computed (get + set)
const fullName = ref('Ada Lovelace');
</script>

<template>
  <label>Search <input v-model="query" /></label>
  <label>Max price <input v-model.number="maxPrice" type="number" /></label>
  <ul>
    <li v-for="product in filtered" :key="product.id">{{ product.name }} (${{ product.price }})</li>
  </ul>
  <p>Total: ${{ total }}</p>

  <label>Full name <input v-model.lazy="fullName" /></label>
  <p>First: <output aria-label="First">{{ firstName }}</output></p>
  <p>Last: <output aria-label="Last">{{ lastName }}</output></p>
</template>
