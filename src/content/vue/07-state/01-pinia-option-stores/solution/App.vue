<script setup lang="ts">
import { useCartStore } from './store';

const cart = useCartStore();
</script>

<template>
  <section>
    <button @click="cart.addItem('Keyboard', 120)">Add Keyboard</button>
    <button @click="cart.addItem('Mouse', 45)">Add Mouse</button>
    <button @click="cart.$reset()">Clear cart</button>
    <ul>
      <li v-for="item in cart.items" :key="item.name">{{ item.name }} × {{ item.quantity }}</li>
    </ul>
    <p>Items: {{ cart.count }}</p>
    <p>Total: ${{ cart.total }}</p>
  </section>
</template>
