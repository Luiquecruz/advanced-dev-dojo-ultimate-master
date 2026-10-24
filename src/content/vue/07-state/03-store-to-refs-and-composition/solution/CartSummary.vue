<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useCartStore } from './cart';

const cart = useCartStore();
const { items, total } = storeToRefs(cart);
const { add } = cart;
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
