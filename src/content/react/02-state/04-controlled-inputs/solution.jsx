import { useState } from 'react';

export default function SignupForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [plan, setPlan] = useState('free');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = trimmedName !== '' && username !== '' && acceptedTerms;

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ name: trimmedName, username, plan, acceptedTerms });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <input
        aria-label="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/\s+/g, ''))}
      />
      <select aria-label="Plan" value={plan} onChange={(event) => setPlan(event.target.value)}>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>
      <label>
        <input
          type="checkbox"
          aria-label="I accept the terms"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        I accept the terms
      </label>
      <p className="greeting">Hello, {trimmedName || 'stranger'}!</p>
      <button type="submit" disabled={!canSubmit}>
        Sign up
      </button>
    </form>
  );
}
