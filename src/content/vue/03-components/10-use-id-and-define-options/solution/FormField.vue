<script setup lang="ts">
import { useId } from 'vue';

defineOptions({ name: 'FormField', inheritAttrs: false });

const { label, help } = defineProps<{ label: string; help?: string }>();

const id = useId();
</script>

<template>
  <div class="form-field">
    <label :for="id">{{ label }}</label>
    <input :id="id" v-bind="$attrs" :aria-describedby="help ? `${id}-help` : undefined" />
    <small v-if="help" :id="`${id}-help`">{{ help }}</small>
  </div>
</template>

<style scoped>
.form-field { display: grid; gap: 0.25rem; margin-bottom: 0.75rem; }
small { color: #666; }
</style>
