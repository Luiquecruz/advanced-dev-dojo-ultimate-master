<script setup lang="ts">
import { ref, watch } from 'vue';

interface User {
  id: number;
  name: string;
  email: string;
}

const props = defineProps<{ id: string }>();
const user = ref<User | null>(null);

watch(
  () => props.id,
  async (id) => {
    user.value = null;
    const response = await fetch(`/api/users/${id}`);
    user.value = await response.json();
  },
  { immediate: true },
);
</script>

<template>
  <p v-if="!user">Loading user {{ id }}...</p>
  <article v-else>
    <h2>{{ user.name }}</h2>
    <p>{{ user.email }}</p>
  </article>
</template>
