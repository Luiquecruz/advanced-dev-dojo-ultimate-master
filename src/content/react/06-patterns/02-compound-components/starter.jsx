import { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

function useTabs(componentName) {
  // TODO: read TabsContext and throw `${componentName} must be used inside <Tabs>` when it is missing
  return { value: undefined, select: () => {} };
}

export function Tabs({ defaultValue, onChange, children }) {
  // TODO: keep the selected value in state and provide { value, select } through TabsContext
  return <div>{children}</div>;
}

function TabList({ children, ...props }) {
  // TODO: render a div with role="tablist" and the remaining props
  return <div>{children}</div>;
}

function Tab({ value, children }) {
  const tabs = useTabs('Tabs.Tab');
  // TODO: render a button with role="tab", aria-selected and a click handler
  return <button>{children}</button>;
}

function TabPanel({ value, children }) {
  const tabs = useTabs('Tabs.Panel');
  // TODO: render a div with role="tabpanel" only when this panel is selected
  return <div>{children}</div>;
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
