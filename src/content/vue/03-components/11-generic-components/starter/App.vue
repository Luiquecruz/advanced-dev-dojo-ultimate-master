<script setup lang="ts">
import { ref } from 'vue';
import SelectList from './SelectList.vue';

interface User { id: number; name: string; role: string }
interface Product { id: number; name: string; price: number }

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Alan Turing', role: 'editor' },
];
const products: Product[] = [
  { id: 10, name: 'Keyboard', price: 120 },
  { id: 11, name: 'Mouse', price: 45 },
];

const user = ref<User | null>(null);
const product = ref<Product | null>(null);
</script>

<template>
  <h3>Users</h3>
  <SelectList :items="users" :selected="user" @select="(item) => (user = item)">
    <template #default="{ item }">{{ item.name }} ({{ item.role }})</template>
  </SelectList>
  <p class="user">Selected user: {{ user?.name ?? 'none' }}</p>

  <h3>Products</h3>
  <SelectList :items="products" :selected="product" @select="(item) => (product = item)">
    <template #default="{ item, selected }">{{ item.name }} ${{ item.price }}{{ selected ? ' ✓' : '' }}</template>
  </SelectList>
  <p class="product">Selected product: {{ product?.name ?? 'none' }}</p>
</template>
