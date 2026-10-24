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
    <!-- TODO: add v-model (with the right modifiers) to every field -->
    <label>Name <input /></label>
    <label>Age <input type="number" /></label>

    <label><input type="radio" value="free" /> Free</label>
    <label><input type="radio" value="pro" /> Pro</label>

    <label><input type="checkbox" /> Newsletter</label>

    <label><input type="checkbox" value="vue" /> Vue</label>
    <label><input type="checkbox" value="ts" /> TypeScript</label>

    <label>
      Country
      <select>
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
