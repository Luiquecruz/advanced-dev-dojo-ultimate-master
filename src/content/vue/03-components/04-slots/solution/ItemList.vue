<script setup lang="ts">
defineProps<{ items: { id: number; name: string; price: number }[] }>();
</script>

<template>
  <ul class="item-list">
    <li v-for="(item, index) in items" :key="item.id">
      <slot name="item" :item="item" :index="index">{{ item.name }}</slot>
    </li>
  </ul>
</template>
