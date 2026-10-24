import { useId, useRef, useState } from 'react';

export function Tabs({ label, tabs }) {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef([]);
  const baseId = useId();

  function select(index) {
    setSelected(index);
    tabRefs.current[index].focus();
  }

  function handleKeyDown(event) {
    const last = tabs.length - 1;
    const moves = {
      ArrowRight: selected === last ? 0 : selected + 1,
      ArrowLeft: selected === 0 ? last : selected - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  }

  const current = tabs[selected];

  return (
    <div className="tabs">
      <div role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={index === selected}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-panel-${current.id}`} aria-labelledby={`${baseId}-tab-${current.id}`} tabIndex={0}>
        {current.content}
      </div>
    </div>
  );
}

const settings = [
  { id: 'profile', label: 'Profile', content: 'Name, avatar and bio.' },
  { id: 'security', label: 'Security', content: 'Password and two-factor authentication.' },
  { id: 'notifications', label: 'Notifications', content: 'Email and push preferences.' },
];

export default function App() {
  return <Tabs label="Account settings" tabs={settings} />;
}
