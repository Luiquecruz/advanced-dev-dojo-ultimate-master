import { useState } from 'react';

export function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

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
      {/* TODO: give the logo an accessible name */}
      <img src="https://react.dev/favicon.ico" width="32" height="32" />
      {/* TODO: this title should be a level 1 heading */}
      <div className="title">Sign in to the Dojo</div>
      <form onSubmit={handleSubmit} noValidate>
        {/* TODO: placeholders are not labels: add <label> elements */}
        <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <div>
          {/* TODO: associate the text with the checkbox */}
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span>Remember me</span>
        </div>
        {/* TODO: announce the error to assistive technologies */}
        {error && <p className="error">{error}</p>}
        {/* TODO: use a real submit button */}
        <div className="btn" onClick={handleSubmit}>
          Sign in
        </div>
      </form>
    </div>
  );
}

export default function App() {
  return <LoginForm onSubmit={(values) => alert(`Welcome, ${values.email}`)} />;
}
