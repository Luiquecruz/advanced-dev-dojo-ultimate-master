import { useState } from 'react';

export function AutoFocusInput({ label }) {
  // TODO: focus the input from a callback ref when the node is attached
  return <input aria-label={label} />;
}

export function ContactList({ contacts, registry }) {
  return (
    <ul>
      {contacts.map((contact) => (
        // TODO: add a callback ref that registers the node in `registry` and returns a cleanup that deletes it
        <li key={contact.id}>{contact.name}</li>
      ))}
    </ul>
  );
}

export default function App() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <section>
      {/* TODO: render the "Show search" checkbox and the AutoFocusInput when checked */}
    </section>
  );
}
