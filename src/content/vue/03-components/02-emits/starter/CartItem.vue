<script setup lang="ts">
defineProps<{ name: string; quantity: number }>();

// TODO: declare the changeQuantity and remove events with defineEmits
</script>

<template>
  <li class="cart-item">
    <span class="name">{{ name }}</span>
    <!-- TODO: render the Decrease button, the quantity and the Increase and Remove buttons -->
  </li>
</template>
