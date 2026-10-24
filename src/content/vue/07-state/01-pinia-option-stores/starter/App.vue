<script setup lang="ts">
import { useCartStore } from './store';

const cart = useCartStore();
</script>

<template>
  <section>
    <button @click="cart.addItem('Keyboard', 120)">Add Keyboard</button>
    <button @click="cart.addItem('Mouse', 45)">Add Mouse</button>
    <!-- TODO: add a "Clear cart" button that resets the store to its initial state -->
    <ul>
      <li v-for="item in cart.items" :key="item.name">{{ item.name }} × {{ item.quantity }}</li>
    </ul>
    <!-- TODO: render "Items: N" and "Total: $N" from the getters -->
  </section>
</template>
