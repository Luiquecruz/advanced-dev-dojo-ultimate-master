<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from 'vee-validate';
import { signupSchema } from './schema';
import { toTypedSchema } from './toTypedSchema';

const { defineField, errors, handleSubmit } = useForm({
  validationSchema: toTypedSchema(signupSchema),
  initialValues: { email: '', password: '', confirm: '' },
});

const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');
const [confirm, confirmAttrs] = defineField('confirm');
const welcome = ref('');

const onSubmit = handleSubmit((values) => {
  welcome.value = `Welcome, ${values.email}!`;
});
</script>

<template>
  <form novalidate @submit="onSubmit">
    <label>Email <input v-model="email" v-bind="emailAttrs" type="email" /></label>
    <p v-if="errors.email" class="error">{{ errors.email }}</p>
    <label>Password <input v-model="password" v-bind="passwordAttrs" type="password" /></label>
    <p v-if="errors.password" class="error">{{ errors.password }}</p>
    <label>Confirm password <input v-model="confirm" v-bind="confirmAttrs" type="password" /></label>
    <p v-if="errors.confirm" class="error">{{ errors.confirm }}</p>
    <button type="submit">Sign up</button>
    <p v-if="welcome" role="status">{{ welcome }}</p>
  </form>
</template>
