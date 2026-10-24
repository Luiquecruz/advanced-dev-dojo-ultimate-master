<script setup lang="ts">
defineProps<{ items: { id: number; name: string; price: number }[] }>();
</script>

<template>
  <ul class="item-list">
    <!-- TODO: one li per item with a scoped "item" slot passing item and index -->
  </ul>
</template>
