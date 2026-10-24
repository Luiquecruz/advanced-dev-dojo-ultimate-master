import { useState } from 'react';

export default function SignupForm({ onSubmit }) {
  // TODO: declare state for name, username, plan ('free') and acceptedTerms (false)

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: call onSubmit with { name, username, plan, acceptedTerms }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* TODO: control every field with value/checked + onChange */}
      <input aria-label="Name" />
      {/* TODO: lowercase the username and strip whitespace while typing */}
      <input aria-label="Username" />
      <select aria-label="Plan">
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>
      <label>
        <input type="checkbox" aria-label="I accept the terms" />
        I accept the terms
      </label>
      {/* TODO: greet the trimmed name, or "stranger" when blank */}
      <p className="greeting">Hello, stranger!</p>
      {/* TODO: disable until the form is valid */}
      <button type="submit">Sign up</button>
    </form>
  );
}
