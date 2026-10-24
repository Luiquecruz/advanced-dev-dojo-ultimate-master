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
    <template #header>Products</template>
    <ItemList :items="products">
      <template #item="{ item, index }">{{ index + 1 }}. {{ item.name }} (${{ item.price }})</template>
    </ItemList>
    <template #footer><small>2 items</small></template>
  </Card>
</template>
