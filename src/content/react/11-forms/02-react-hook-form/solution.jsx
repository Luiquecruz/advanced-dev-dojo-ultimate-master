import { useState } from 'react';
import { useForm } from 'react-hook-form';

export function LoginForm({ onLogin }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } });

  async function onSubmit(data) {
    try {
      await onLogin(data);
    } catch (error) {
      setError('root.serverError', { message: error.message });
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        {...register('email', {
          required: 'Email is required',
          pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
        })}
      />
      {errors.email && <p>{errors.email.message}</p>}

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        {...register('password', {
          required: 'Password is required',
          minLength: { value: 8, message: 'Password must be at least 8 characters' },
        })}
      />
      {errors.password && <p>{errors.password.message}</p>}

      {errors.root?.serverError && <p role="alert">{errors.root.serverError.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log in'}
      </button>
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
