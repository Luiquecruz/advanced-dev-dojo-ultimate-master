<script setup lang="ts">
import { auth } from './auth';

function logIn() {
  auth.login('Ada');
  // TODO: replace the current location with the "redirect" query (or "/" when it is missing)
}
</script>

<template>
  <h1>Login</h1>
  <button @click="logIn">Log in</button>
</template>
