import { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

function useTabs(componentName) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside <Tabs>`);
  }
  return context;
}

export function Tabs({ defaultValue, onChange, children }) {
  const [value, setValue] = useState(defaultValue);

  const select = (nextValue) => {
    setValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <TabsContext value={{ value, select }}>
      <div>{children}</div>
    </TabsContext>
  );
}

function TabList({ children, ...props }) {
  return (
    <div role="tablist" {...props}>
      {children}
    </div>
  );
}

function Tab({ value, children }) {
  const tabs = useTabs('Tabs.Tab');
  const selected = tabs.value === value;
  return (
    <button role="tab" aria-selected={selected} tabIndex={selected ? 0 : -1} onClick={() => tabs.select(value)}>
      {children}
    </button>
  );
}

function TabPanel({ value, children }) {
  const tabs = useTabs('Tabs.Panel');
  if (tabs.value !== value) {
    return null;
  }
  return <div role="tabpanel">{children}</div>;
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export default function App() {
  return (
    <Tabs defaultValue="profile">
      <Tabs.List aria-label="Account">
        <Tabs.Tab value="profile">Profile</Tabs.Tab>
        <Tabs.Tab value="billing">Billing</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="profile">Profile settings</Tabs.Panel>
      <Tabs.Panel value="billing">Billing settings</Tabs.Panel>
    </Tabs>
  );
}
