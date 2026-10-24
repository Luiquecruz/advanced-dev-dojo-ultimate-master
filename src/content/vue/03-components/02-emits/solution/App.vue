<script setup lang="ts">
import { computed, ref } from 'vue';
import CartItem from './CartItem.vue';

const items = ref([
  { id: 1, name: 'Keyboard', quantity: 1 },
  { id: 2, name: 'Mouse', quantity: 2 },
]);

const total = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));

function changeQuantity(id: number, delta: number) {
  const item = items.value.find((entry) => entry.id === id);
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta);
  }
}

function remove(id: number) {
  items.value = items.value.filter((item) => item.id !== id);
}
</script>

<template>
  <ul>
    <CartItem
      v-for="item in items"
      :key="item.id"
      :name="item.name"
      :quantity="item.quantity"
      @change-quantity="(delta) => changeQuantity(item.id, delta)"
      @remove="remove(item.id)"
    />
  </ul>
  <p class="total">Total items: {{ total }}</p>
</template>
