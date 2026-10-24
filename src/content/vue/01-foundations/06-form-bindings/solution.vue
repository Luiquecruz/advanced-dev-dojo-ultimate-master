<script setup lang="ts">
import { ref } from 'vue';

const name = ref('');
const age = ref<number | string>('');
const plan = ref('free');
const newsletter = ref(false);
const topics = ref<string[]>([]);
const country = ref('');
</script>

<template>
  <form @submit.prevent>
    <label>Name <input v-model.trim="name" /></label>
    <label>Age <input v-model.number="age" type="number" /></label>

    <label><input v-model="plan" type="radio" value="free" /> Free</label>
    <label><input v-model="plan" type="radio" value="pro" /> Pro</label>

    <label><input v-model="newsletter" type="checkbox" /> Newsletter</label>

    <label><input v-model="topics" type="checkbox" value="vue" /> Vue</label>
    <label><input v-model="topics" type="checkbox" value="ts" /> TypeScript</label>

    <label>
      Country
      <select v-model="country">
        <option disabled value="">Choose one</option>
        <option value="br">Brazil</option>
        <option value="pt">Portugal</option>
      </select>
    </label>
  </form>

  <ul>
    <li data-testid="name">{{ JSON.stringify(name) }}</li>
    <li data-testid="age">{{ JSON.stringify(age) }}</li>
    <li data-testid="plan">{{ JSON.stringify(plan) }}</li>
    <li data-testid="newsletter">{{ JSON.stringify(newsletter) }}</li>
    <li data-testid="topics">{{ JSON.stringify(topics) }}</li>
    <li data-testid="country">{{ JSON.stringify(country) }}</li>
  </ul>
</template>
