<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from './BaseButton.vue';
import BaseInput from './BaseInput.vue';

const email = ref('');
const submitted = ref(false);
</script>

<template>
  <form @submit.prevent="submitted = true">
    <BaseInput
      v-model="email"
      label="Email"
      type="email"
      placeholder="you@example.com"
      class="wide"
    />
    <BaseButton class="primary" type="submit">Subscribe</BaseButton>
  </form>
  <p v-if="submitted" class="result">Subscribed {{ email }}</p>
</template>
