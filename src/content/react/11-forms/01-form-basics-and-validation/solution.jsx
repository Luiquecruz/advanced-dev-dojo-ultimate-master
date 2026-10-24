import { useState } from 'react';

const initialValues = { name: '', email: '', password: '' };

export function validate(values) {
  const errors = {};
  if (!values.name.trim()) {
    errors.name = 'Name is required';
  }
  if (!/^\S+@\S+\.\S+$/.test(values.email)) {
    errors.email = 'Enter a valid email';
  }
  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return errors;
}

function Field({ label, name, type = 'text', value, error, onChange }) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
}

export function SignupForm({ onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validate(values) : {};

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values)).length === 0) {
      onSubmit(values);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Field label="Name" name="name" value={values.name} error={errors.name} onChange={handleChange} />
      <Field label="Email" name="email" type="email" value={values.email} error={errors.email} onChange={handleChange} />
      <Field label="Password" name="password" type="password" value={values.password} error={errors.password} onChange={handleChange} />
      <button type="submit">Sign up</button>
    </form>
  );
}

export default function App() {
  const [result, setResult] = useState(null);
  return (
    <main>
      <SignupForm onSubmit={setResult} />
      {result && <p>Welcome, {result.name}!</p>}
    </main>
  );
}
