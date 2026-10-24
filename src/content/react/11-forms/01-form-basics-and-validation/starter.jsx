import { useState } from 'react';

const initialValues = { name: '', email: '', password: '' };

export function validate(values) {
  const errors = {};
  // TODO: errors.name = 'Name is required' when the trimmed name is empty
  // TODO: errors.email = 'Enter a valid email' when the email does not match /^\S+@\S+\.\S+$/
  // TODO: errors.password = 'Password must be at least 8 characters' when it is shorter than 8
  return errors;
}

function Field({ label, name, type = 'text', value, error, onChange }) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      {/* TODO: set aria-invalid="true" and aria-describedby={errorId} when there is an error */}
      <input id={name} name={name} type={type} value={value} onChange={onChange} />
      {/* TODO: render <p id={errorId}>{error}</p> when there is an error */}
    </div>
  );
}

export function SignupForm({ onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  // TODO: derive the errors from validate(values) once the form has been submitted
  const errors = {};

  function handleChange(event) {
    // TODO: update the field named event.target.name with event.target.value
  }

  function handleSubmit(event) {
    // TODO: prevent the page reload, mark the form as submitted
    // TODO: call onSubmit(values) only when validate(values) returns no errors
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
