<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from 'vee-validate';

function validateEmail(value: string) {
  if (!value) {
    return 'Email is required';
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email';
}

function validatePassword(value: string) {
  return (value ?? '').length >= 8 || 'Password must be at least 8 characters';
}

const { defineField, errors, handleSubmit } = useForm({
  initialValues: { email: '', password: '' },
  validationSchema: { email: validateEmail, password: validatePassword },
});

const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');
const welcome = ref('');

const onSubmit = handleSubmit((values) => {
  welcome.value = `Welcome, ${values.email}!`;
});
</script>

<template>
  <form novalidate @submit="onSubmit">
    <label>
      Email
      <input v-model="email" v-bind="emailAttrs" type="email" />
    </label>
    <p v-if="errors.email" class="error">{{ errors.email }}</p>

    <label>
      Password
      <input v-model="password" v-bind="passwordAttrs" type="password" />
    </label>
    <p v-if="errors.password" class="error">{{ errors.password }}</p>

    <button type="submit">Sign up</button>
    <p v-if="welcome" role="status">{{ welcome }}</p>
  </form>
</template>
