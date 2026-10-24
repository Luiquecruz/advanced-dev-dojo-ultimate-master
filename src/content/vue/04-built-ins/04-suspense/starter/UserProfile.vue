<script setup lang="ts">
const { userId } = defineProps<{ userId: number }>();

// TODO: await the user from /api/users/{userId}, throwing when the response is not ok
const user = { name: '', email: '' };
</script>

<template>
  <h2>{{ user.name }}</h2>
  <p class="email">{{ user.email }}</p>
</template>
