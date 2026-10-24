import { useId, useState } from 'react';

export function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const id = useId();

  function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setError('');
    onSubmit({ email, password, remember });
  }

  return (
    <div className="login">
      <img src="https://react.dev/favicon.ico" width="32" height="32" alt="Dojo logo" />
      <h1 className="title">Sign in to the Dojo</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={`${id}-email`}>Email</label>
        <input id={`${id}-email`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor={`${id}-password`}>Password</label>
        <input id={`${id}-password`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <label>
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          Remember me
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn">
          Sign in
        </button>
      </form>
    </div>
  );
}

export default function App() {
  return <LoginForm onSubmit={(values) => alert(`Welcome, ${values.email}`)} />;
}
