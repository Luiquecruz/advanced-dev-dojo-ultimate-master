<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';

interface User {
  id: number;
  name: string;
  email: string;
}

const userId = ref(1);
const user = ref<User | null>(null);
const changes = ref<string[]>([]);

// TODO: watch userId (immediately), fetch the user and log "old → new" changes

// TODO: keep document.title in sync with watchEffect
</script>

<template>
  <button :disabled="userId === 1" @click="userId--">Previous</button>
  <button :disabled="userId === 5" @click="userId++">Next</button>
  <h2 v-if="user">{{ user.name }}</h2>
  <p v-else>Loading...</p>
  <ul>
    <li v-for="change in changes" :key="change">{{ change }}</li>
  </ul>
</template>
