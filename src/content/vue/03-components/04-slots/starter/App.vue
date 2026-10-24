<script setup lang="ts">
import Card from './Card.vue';
import ItemList from './ItemList.vue';

const products = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
];
</script>

<template>
  <Card>
    <!-- TODO: header "Products", ItemList as body with a custom #item slot, footer "2 items" -->
  </Card>
</template>
