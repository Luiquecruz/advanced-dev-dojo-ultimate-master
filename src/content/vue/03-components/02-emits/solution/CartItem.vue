<script setup lang="ts">
defineProps<{ name: string; quantity: number }>();

const emit = defineEmits<{
  changeQuantity: [delta: number];
  remove: [];
}>();
</script>

<template>
  <li class="cart-item">
    <span class="name">{{ name }}</span>
    <button aria-label="Decrease" @click="emit('changeQuantity', -1)">−</button>
    <span class="quantity">{{ quantity }}</span>
    <button aria-label="Increase" @click="emit('changeQuantity', 1)">+</button>
    <button aria-label="Remove" @click="emit('remove')">Remove</button>
  </li>
</template>
