import { useState } from 'react';
import { useForm } from 'react-hook-form';

export function LoginForm({ onLogin }) {
  // TODO: call useForm({ defaultValues: { email: '', password: '' } })
  // and destructure register, handleSubmit, setError and formState: { errors, isSubmitting }

  async function onSubmit(data) {
    // TODO: await onLogin(data); on failure call setError('root.serverError', { message: error.message })
  }

  return (
    // TODO: use onSubmit={handleSubmit(onSubmit)}
    <form noValidate>
      <label htmlFor="email">Email</label>
      {/* TODO: register 'email' with required 'Email is required' and a pattern 'Enter a valid email' */}
      <input id="email" type="email" />
      {/* TODO: show errors.email.message in a <p> */}

      <label htmlFor="password">Password</label>
      {/* TODO: register 'password' with required 'Password is required' and minLength 8 'Password must be at least 8 characters' */}
      <input id="password" type="password" />
      {/* TODO: show errors.password.message in a <p> */}

      {/* TODO: show errors.root.serverError.message in a <p role="alert"> */}

      {/* TODO: disable while submitting and show "Logging in..." */}
      <button type="submit">Log in</button>
    </form>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  async function login({ email, password }) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (password !== 'password123') {
      throw new Error('Invalid credentials');
    }
    setUser(email);
  }

  return user ? <p>Logged in as {user}</p> : <LoginForm onLogin={login} />;
}
