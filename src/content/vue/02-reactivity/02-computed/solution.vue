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

const filtered = computed(() => {
  const term = query.value.toLowerCase();
  return products.filter((product) => product.name.toLowerCase().includes(term) && product.price <= maxPrice.value);
});
const total = computed(() => filtered.value.reduce((sum, product) => sum + product.price, 0));

const firstName = ref('Ada');
const lastName = ref('Lovelace');
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value: string) => {
    const [first, ...rest] = value.split(' ');
    firstName.value = first;
    lastName.value = rest.join(' ');
  },
});
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
