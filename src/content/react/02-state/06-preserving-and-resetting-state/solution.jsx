import { useState } from 'react';

export const contacts = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
];

export function Chat({ contact }) {
  const [draft, setDraft] = useState('');

  return (
    <section className="chat">
      <textarea aria-label={`Message to ${contact.name}`} value={draft} onChange={(event) => setDraft(event.target.value)} />
    </section>
  );
}

export default function Messenger() {
  const [selected, setSelected] = useState(contacts[0]);

  return (
    <div className="messenger">
      <nav>
        {contacts.map((contact) => (
          <button key={contact.id} type="button" onClick={() => setSelected(contact)}>
            {contact.name}
          </button>
        ))}
      </nav>
      <Chat key={selected.id} contact={selected} />
    </div>
  );
}
