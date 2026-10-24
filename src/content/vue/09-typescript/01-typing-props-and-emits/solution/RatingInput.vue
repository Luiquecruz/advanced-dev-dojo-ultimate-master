<script setup lang="ts">
interface Props {
  modelValue: number;
  label: string;
  max?: number;
}

const { modelValue, label, max = 5 } = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
  change: [value: number, previous: number];
}>();

function select(value: number) {
  emit('update:modelValue', value);
  emit('change', value, modelValue);
}
</script>

<template>
  <fieldset>
    <legend>{{ label }}</legend>
    <button
      v-for="value in max"
      :key="value"
      type="button"
      :aria-label="`Rate ${value} of ${max}`"
      :aria-pressed="value <= modelValue"
      @click="select(value)"
    >
      {{ value <= modelValue ? '★' : '☆' }}
    </button>
  </fieldset>
</template>
