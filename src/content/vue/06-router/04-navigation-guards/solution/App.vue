<script setup lang="ts">
import { auth } from './auth';
</script>

<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/dashboard">Dashboard</RouterLink>
    <RouterLink to="/editor">Editor</RouterLink>
    <span v-if="auth.user">Signed in as {{ auth.user }}</span>
  </nav>
  <RouterView />
</template>
