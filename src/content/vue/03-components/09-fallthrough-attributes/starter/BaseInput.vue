<script setup lang="ts">
// TODO: disable attribute inheritance with defineOptions

defineProps<{ label: string }>();
const model = defineModel<string>({ default: '' });
</script>

<template>
  <label class="field">
    <span>{{ label }}</span>
    <!-- TODO: forward every fallthrough attribute to the input -->
    <input v-model="model" />
  </label>
</template>
