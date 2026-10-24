<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface User {
  id: number;
  name: string;
  email: string;
}

// TODO: receive the route param as an "id" prop instead of reading useRoute()
const user = ref<User | null>(null);

// TODO: fetch /api/users/:id now AND whenever the id changes (the component is reused)
onMounted(async () => {
  const response = await fetch('/api/users/1');
  user.value = await response.json();
});
</script>

<template>
  <p v-if="!user">Loading user...</p>
  <article v-else>
    <h2>{{ user.name }}</h2>
    <p>{{ user.email }}</p>
  </article>
</template>
