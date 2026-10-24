<script setup lang="ts">
const { userId } = defineProps<{ userId: number }>();

const response = await fetch(`/api/users/${userId}`);
if (!response.ok) {
  throw new Error(`Request failed: ${response.status}`);
}
const user: { name: string; email: string } = await response.json();
</script>

<template>
  <h2>{{ user.name }}</h2>
  <p class="email">{{ user.email }}</p>
</template>
