import { useState } from 'react';

export function AutoFocusInput({ label }) {
  return <input aria-label={label} ref={(node) => node?.focus()} />;
}

export function ContactList({ contacts, registry }) {
  return (
    <ul>
      {contacts.map((contact) => (
        <li
          key={contact.id}
          ref={(node) => {
            registry.set(contact.id, node);
            return () => {
              registry.delete(contact.id);
            };
          }}
        >
          {contact.name}
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <section>
      <label>
        <input type="checkbox" checked={showSearch} onChange={(event) => setShowSearch(event.target.checked)} />
        Show search
      </label>
      {showSearch && <AutoFocusInput label="Search" />}
    </section>
  );
}
