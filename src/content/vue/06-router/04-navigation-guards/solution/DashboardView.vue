<script setup lang="ts">
import { auth } from './auth';
</script>

<template>
  <h1>Dashboard</h1>
  <p>Welcome back, {{ auth.user }}.</p>
</template>
