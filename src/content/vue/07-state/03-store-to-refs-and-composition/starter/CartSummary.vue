<script setup lang="ts">
import { useCartStore } from './cart';

const cart = useCartStore();
// TODO: this destructuring loses reactivity for items and total. Use storeToRefs for state and getters,
// and destructure the action directly from the store.
const { items, total, add } = cart;
</script>

<template>
  <section>
    <button @click="add(1)">Add Keyboard</button>
    <button @click="add(2)">Add Mouse</button>
    <ul>
      <li v-for="(item, index) in items" :key="index">{{ item.name }}: ${{ item.price }}</li>
    </ul>
    <p>Total: ${{ total }}</p>
  </section>
</template>
