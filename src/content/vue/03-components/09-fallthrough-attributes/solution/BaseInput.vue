<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{ label: string }>();
const model = defineModel<string>({ default: '' });
</script>

<template>
  <label class="field">
    <span>{{ label }}</span>
    <input v-model="model" v-bind="$attrs" />
  </label>
</template>
