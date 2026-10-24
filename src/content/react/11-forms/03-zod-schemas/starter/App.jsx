import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from './schema';

const fields = [
  { name: 'username', label: 'Username', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'age', label: 'Age', type: 'number' },
  { name: 'password', label: 'Password', type: 'password' },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password' },
];

export function SignupForm({ onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    // TODO: validate with resolver: zodResolver(signupSchema)
    defaultValues: { username: '', email: '', age: '', password: '', confirmPassword: '' },
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          <input id={field.name} type={field.type} {...register(field.name)} />
          {/* TODO: render errors[field.name].message in a <p> when present */}
        </div>
      ))}
      <button type="submit">Sign up</button>
    </form>
  );
}

export default function App() {
  const [account, setAccount] = useState(null);
  return (
    <main>
      <SignupForm onSubmit={setAccount} />
      {account && <pre>{JSON.stringify(account, null, 2)}</pre>}
    </main>
  );
}
