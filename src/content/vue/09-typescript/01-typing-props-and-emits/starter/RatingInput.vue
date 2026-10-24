<script setup lang="ts">
// TODO: declare type-based props: modelValue (number), label (string), max (optional number, default 5)
const props = defineProps(['modelValue', 'label', 'max']);

// TODO: declare typed emits: 'update:modelValue' with [value: number] and 'change' with [value: number, previous: number]
const emit = defineEmits(['update:modelValue']);

function select(value: number) {
  // TODO: emit update:modelValue with the new value and change with the new and previous values
  emit('update:modelValue', value);
}
</script>

<template>
  <fieldset>
    <legend>{{ props.label }}</legend>
    <button
      v-for="value in props.max"
      :key="value"
      type="button"
      :aria-label="`Rate ${value} of ${props.max}`"
      :aria-pressed="value <= props.modelValue"
      @click="select(value)"
    >
      {{ value <= props.modelValue ? '★' : '☆' }}
    </button>
  </fieldset>
</template>
