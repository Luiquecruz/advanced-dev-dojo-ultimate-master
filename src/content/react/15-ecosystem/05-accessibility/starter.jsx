import { useId, useRef, useState } from 'react';

export function Tabs({ label, tabs }) {
  const [selected, setSelected] = useState(0);
  // TODO: keep refs to the tab buttons so the keyboard handler can move focus
  // TODO: generate ids with useId to link each tab to its panel

  // TODO: handle ArrowRight, ArrowLeft (both wrap around), Home and End

  return (
    <div className="tabs">
      {/* TODO: this needs role="tablist" and an accessible name */}
      <div className="tab-list">
        {tabs.map((tab, index) => (
          // TODO: use a <button role="tab"> with aria-selected, aria-controls, id and a roving tabIndex
          <div key={tab.id} className={index === selected ? 'tab active' : 'tab'} onClick={() => setSelected(index)}>
            {tab.label}
          </div>
        ))}
      </div>
      {/* TODO: role="tabpanel", id, aria-labelledby and tabIndex={0} */}
      <div className="panel">{tabs[selected].content}</div>
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
