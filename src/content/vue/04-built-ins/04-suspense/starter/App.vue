<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import UserProfile from './UserProfile.vue';

const error = ref<string | null>(null);

// TODO: capture descendant errors, store the message and stop propagation
</script>

<template>
  <!-- TODO: show the alert on error, otherwise a Suspense boundary with a Loading… fallback -->
  <UserProfile :user-id="1" />
</template>
