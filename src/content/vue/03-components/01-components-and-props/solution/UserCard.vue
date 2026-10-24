<script setup lang="ts">
const { name, role = 'Member', online = false } = defineProps<{
  name: string;
  role?: string;
  online?: boolean;
}>();
</script>

<template>
  <article class="user-card">
    <h3>{{ name }}</h3>
    <p class="role">{{ role }}</p>
    <span class="status">{{ online ? 'Online' : 'Offline' }}</span>
  </article>
</template>

<style scoped>
.user-card { border: 1px solid #ddd; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; }
.status { font-size: 0.85rem; }
</style>
