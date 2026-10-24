<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import UserProfile from './UserProfile.vue';

const error = ref<string | null>(null);

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err.message : String(err);
  return false;
});
</script>

<template>
  <p v-if="error" role="alert">Could not load user</p>
  <Suspense v-else>
    <UserProfile :user-id="1" />
    <template #fallback>
      <p>Loading…</p>
    </template>
  </Suspense>
</template>
