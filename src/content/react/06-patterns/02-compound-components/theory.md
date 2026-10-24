## Components that work as a team

Think of HTML's `<select>` and `<option>`: neither makes sense alone, but together they form one control, and you decide how many options there are and in which order. **Compound components** bring that idea to React: a parent component shares implicit state with a set of child components, and the user composes them freely.

```jsx
<Tabs defaultValue="profile">
  <Tabs.List aria-label="Account">
    <Tabs.Tab value="profile">Profile</Tabs.Tab>
    <Tabs.Tab value="billing">Billing</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="profile">Profile settings</Tabs.Panel>
  <Tabs.Panel value="billing">Billing settings</Tabs.Panel>
</Tabs>
```

Compare with the "configuration object" alternative:

```jsx
<Tabs tabs={[{ id: 'profile', label: 'Profile', content: <Profile /> }]} />
```

The config API looks simpler, until someone needs an icon in one tab, a badge in another, a tab that is disabled, or extra markup between the list and the panels. Each request adds a prop. Compound components avoid this **prop explosion**: markup stays in the caller's hands, logic stays in the library.

## Sharing state with context

The parent owns the state and publishes it through a context. Children read it with `useContext`, no matter how deep they are nested:

```jsx
const TabsContext = createContext(null);

function Tabs({ defaultValue, children }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext value={{ value, setValue }}>{children}</TabsContext>;
}

function Tab({ value, children }) {
  const tabs = useContext(TabsContext);
  const selected = tabs.value === value;
  return (
    <button role="tab" aria-selected={selected} onClick={() => tabs.setValue(value)}>
      {children}
    </button>
  );
}

Tabs.Tab = Tab;
```

Attaching the parts as static properties (`Tabs.Tab`, `Tabs.Panel`) groups the API under one import. Libraries also export them as separate names (`TabsTab`, or Radix's `Tabs.Root`, `Tabs.Trigger`, `Tabs.Content`) because named exports tree-shake better and work with React Server Components boundaries.

## Guarding against misuse

A `Tab` rendered outside `Tabs` would read `null`. Fail loudly with a helpful message:

```jsx
function useTabs(componentName) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside <Tabs>`);
  }
  return context;
}
```

## Legacy approach: cloneElement

Before context was ergonomic, compound components used `React.Children.map` + `cloneElement` to inject props into **direct** children:

```jsx
function Tabs({ children }) {
  const [value, setValue] = useState('profile');
  return Children.map(children, (child) => cloneElement(child, { selectedValue: value, onSelect: setValue }));
}
```

This breaks as soon as the user wraps a tab in a `<div>` or a custom component, because only direct children receive the props. It also silently overrides props with the same name. react.dev lists `Children` and `cloneElement` as legacy APIs; use context.

## Accessibility is part of the pattern

The parts map naturally to ARIA roles. A tabs widget needs:

- `role="tablist"` on the container, `role="tab"` on each trigger, `role="tabpanel"` on each panel.
- `aria-selected="true"` on the active tab, `aria-controls`/`aria-labelledby` linking tabs and panels (generate ids with `useId`).
- Arrow-key navigation with a roving `tabIndex` (only the selected tab has `tabIndex={0}`).

Headless libraries such as Radix UI, React Aria and Headless UI are essentially polished compound components with all these details handled.

## Controlled and uncontrolled

Good compound components support both modes: `defaultValue` for uncontrolled use, `value` + `onValueChange` for controlled use. The next lesson covers that pattern in depth.

## Pitfalls

- Creating the context value object inline re-renders every consumer on each parent render; that is fine for small widgets, and you can `useMemo` it for big ones.
- Relying on child **order** or **type** checks (`child.type === Tab`) is brittle; let context do the wiring.
