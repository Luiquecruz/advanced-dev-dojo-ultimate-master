<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { auth } from './auth';

const route = useRoute();
const router = useRouter();

async function logIn() {
  auth.login('Ada');
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  await router.replace(redirect);
}
</script>

<template>
  <h1>Login</h1>
  <button @click="logIn">Log in</button>
</template>
