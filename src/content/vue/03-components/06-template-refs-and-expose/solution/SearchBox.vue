<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

const query = ref('');
const input = useTemplateRef<HTMLInputElement>('input');

function focus() {
  input.value?.focus();
}

function clear() {
  query.value = '';
  focus();
}

defineExpose({ focus, clear });
</script>

<template>
  <input ref="input" v-model="query" type="search" aria-label="Search" />
</template>
