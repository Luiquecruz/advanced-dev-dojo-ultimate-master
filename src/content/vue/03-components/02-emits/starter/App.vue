<script setup lang="ts">
import { computed, ref } from 'vue';
import CartItem from './CartItem.vue';

const items = ref([
  { id: 1, name: 'Keyboard', quantity: 1 },
  { id: 2, name: 'Mouse', quantity: 2 },
]);

// TODO: compute the total quantity

function changeQuantity(id: number, delta: number) {
  // TODO: add delta to the item, keeping the quantity at least 1
}

function remove(id: number) {
  // TODO: remove the item from the list
}
</script>

<template>
  <ul>
    <!-- TODO: render a CartItem per item and listen to its events -->
  </ul>
  <!-- TODO: render the total paragraph -->
</template>
