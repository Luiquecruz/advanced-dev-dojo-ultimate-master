## When two components need the same state

State is private to the component that declares it. That is great until two siblings must stay **coordinated**. Imagine an accordion where each panel keeps its own `isActive` state:

```jsx
function Panel({ title, children }) {
  const [isActive, setIsActive] = useState(false);
  return (
    <section>
      <h3>{title}</h3>
      {isActive ? <p>{children}</p> : <button onClick={() => setIsActive(true)}>Show</button>}
    </section>
  );
}
```

Each panel opens independently, so you cannot enforce "only one panel open at a time": no panel knows about the others.

## Lifting state up

The fix is to **move the state to the closest common parent** and pass it down as props. Three steps:

1. **Remove** the state from the children.
2. **Pass** hardcoded data from the parent (`isActive`).
3. **Add** state to the parent and pass it down together with event handlers that change it (`onShow`).

```jsx
function Accordion() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <>
      <Panel title="About" isActive={activeIndex === 0} onShow={() => setActiveIndex(0)}>
        ...
      </Panel>
      <Panel title="Etymology" isActive={activeIndex === 1} onShow={() => setActiveIndex(1)}>
        ...
      </Panel>
    </>
  );
}

function Panel({ title, children, isActive, onShow }) {
  return (
    <section>
      <h3>{title}</h3>
      {isActive ? <p>{children}</p> : <button onClick={onShow}>Show</button>}
    </section>
  );
}
```

`Accordion` now decides which panel is open. One `activeIndex` makes the invalid state "two panels open" **impossible**, not just unlikely.

## Controlled and uncontrolled components

- A component with its own local state is **uncontrolled**: easy to drop in, hard to coordinate.
- A component driven by props is **controlled**: its parent fully decides its behavior.

The same vocabulary you met with `<input value>` applies to your own components. Good reusable components often support both, like an input with `value` or `defaultValue`.

## A single source of truth

For each unique piece of state, pick **one** component that owns it. Data flows down through props, and change requests flow up through callbacks (`onShow`, `onChange`, `onSelect`). Do not duplicate the same state in parent and child and try to keep them in sync with effects; that leads to bugs where the two copies disagree.

How to find the owner:

1. List every component that renders something based on that state.
2. Find their closest common parent.
3. Put the state there (or higher, if it makes more sense).

## Naming conventions

- Props carrying data: `isActive`, `value`, `selectedId`.
- Props carrying callbacks: `onShow`, `onChange`, `onSelect` (the parent decides what happens).
- Handlers inside the parent: `handleShow`, `handleSelect`.

## When lifting is not enough

If state has to travel through many layers that don't use it (prop drilling), consider composition (passing elements as children), then **Context**, then a state management library. Those come later; lifting state up is the first and most common tool.

## Legacy note

The pattern is identical in class components: the parent keeps `this.state.activeIndex` and passes `onShow={() => this.setState({ activeIndex: 1 })}`. The React docs have taught "lifting state up" since the very first tutorial.
