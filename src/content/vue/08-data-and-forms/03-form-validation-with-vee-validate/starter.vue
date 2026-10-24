<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from 'vee-validate';

function validateEmail(value: string) {
  // TODO: return "Email is required" when empty, "Enter a valid email" when the format is wrong, true otherwise
  return true;
}

function validatePassword(value: string) {
  // TODO: return true for 8+ characters, otherwise "Password must be at least 8 characters"
  return true;
}

// TODO: pass initialValues and a validationSchema that maps each field to its validator
const { defineField, errors, handleSubmit } = useForm();

const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');
const welcome = ref('');

// TODO: wrap the submit callback with handleSubmit so it only runs when the form is valid
function onSubmit(event: Event) {
  event.preventDefault();
  welcome.value = `Welcome, ${email.value}!`;
}
</script>

<template>
  <form novalidate @submit="onSubmit">
    <label>
      Email
      <input v-model="email" v-bind="emailAttrs" type="email" />
    </label>
    <!-- TODO: show errors.email in a <p class="error"> -->

    <label>
      Password
      <input v-model="password" v-bind="passwordAttrs" type="password" />
    </label>
    <!-- TODO: show errors.password in a <p class="error"> -->

    <button type="submit">Sign up</button>
    <p v-if="welcome" role="status">{{ welcome }}</p>
  </form>
</template>
