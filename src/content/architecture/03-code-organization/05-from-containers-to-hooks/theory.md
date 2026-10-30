## Container and presentational components

In 2015 Dan Abramov published *Presentational and Container Components*, and it shaped React codebases for years. The idea was MVC's separation adapted to components:

- **Presentational components** care about *how things look*. They receive data and callbacks through props, rarely hold state (only UI state such as "is open"), never fetch, and are easy to reuse and preview.
- **Container components** care about *how things work*. They fetch data, hold state, subscribe to stores (`connect()` in Redux) and render presentational components with the right props.

```jsx
class UserDirectoryContainer extends Component {
  state = { status: 'loading', users: [], query: '' };
  componentDidMount() {
    fetch('/api/users')
      .then((response) => response.json())
      .then((users) => this.setState({ status: 'success', users }));
  }
  render() {
    return <UserDirectory {...this.state} onQueryChange={(query) => this.setState({ query })} />;
  }
}
```

Before hooks, this was the only way to reuse stateful logic without mixins: a class container, a **higher-order component** (`withUsers(Component)`) or a **render prop** (`<Users>{(users) => ...}</Users>`). All of them added wrapper components to the tree ("wrapper hell") and indirection to the code.

## Dan Abramov's later note

In 2019 he added an update to the article: he no longer recommends splitting components this way. **Hooks** let you reuse stateful logic without a container component, and splitting every component into two had become dogma, applied even where it bought nothing. The separation of concerns is still valuable; the *component* is just no longer the unit that carries it.

## Custom hooks: the modern container

A custom hook is the container's logic without the container's markup:

```jsx
export function useUserDirectory() {
  const [status, setStatus] = useState('loading');
  const [allUsers, setAllUsers] = useState([]);
  const [query, setQuery] = useState('');
  useEffect(() => {
    // fetch, then setAllUsers + setStatus('success') or setStatus('error')
  }, []);
  const users = allUsers.filter((user) => user.name.toLowerCase().includes(query.toLowerCase()));
  return { status, users, query, setQuery };
}
```

The hook is the **controller** (it owns state transitions and data access); the presentational component is the **view** (props in, UI out); `App` (or a page) composes them:

```jsx
export default function App() {
  const { status, users, query, setQuery } = useUserDirectory();
  return <UserDirectory status={status} users={users} query={query} onQueryChange={setQuery} />;
}
```

Notice the naming: the hook returns `setQuery` (a state setter), the view takes `onQueryChange` (an event). The view does not know that a state setter is behind it; it could be URL state, a store or a test spy.

## What each piece buys

- **The view** renders every state from props: Storybook stories, visual tests and design reviews need no network. `status="error"` is one prop away.
- **The hook** is tested with `renderHook`, no markup involved, and can be reused by a different view (a compact list, a combobox).
- **Derived data** (the filtered list) stays derived: computed during render in the hook, never stored.

In a modern stack, the data part of the hook is usually a TanStack Query call (`useQuery(usersQueryOptions())`), which is the same pattern with caching built in.

## Pitfalls

- **Splitting everything**: a small component that fetches its own tiny piece of data does not need a hook file and a view file. Extract when there is a reason: reuse, testing, or a view that designers iterate on.
- **Hooks that return JSX**: `useUserList()` returning `<ul>` mixes the two roles again. Hooks return data and functions.
- **Leaking implementation through props**: passing `dispatch`, a `queryClient` or a `fetch` function to the view couples it to the container's choices. Pass values and named callbacks.
- **Presentational is not stateless**: a dropdown's `isOpen` is fine inside the view. "Presentational" means no business data access, not zero `useState`.

## When to choose it

Extract a custom hook when stateful logic is reused, deserves its own tests, or obscures the markup. Keep a pure, props-only view when the component has several visual states worth previewing or testing in isolation. Recognize class containers, HOCs and render props in legacy code, and migrate them to hooks when you touch them; do not reintroduce the container component as a mandatory layer.
