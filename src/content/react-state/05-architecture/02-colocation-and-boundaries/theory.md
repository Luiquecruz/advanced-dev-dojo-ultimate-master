## Colocation: state lives where it is used

> Place code as close to where it's relevant as possible.

Applied to state, colocation means: **start local, and move state up only as far as its consumers require**. Every step up the tree (lift to a parent, put it in Context, put it in a global store) increases its reach, and also its cost:

- **Re-renders**: more components subscribe to changes they do not care about.
- **Coupling**: a component can no longer be understood, reused or deleted alone.
- **Shared-instance bugs**: two instances of a widget fight over one global value (two comment boxes mirroring each other, one modal flag for every modal).
- **Stale leftovers**: global UI state survives navigation (a menu that is still open on the next page, a draft from another item).
- **Harder tests**: every test must reset the global store.

## Over-globalization, the most common smell

Teams adopt a store for good reasons (a theme, a cart) and then everything drifts into it because it is convenient:

```js
const useAppStore = create((set) => ({
  theme: 'light',
  isMenuOpen: false,
  commentDraft: '',
  expandedPostId: null,
}));
```

Ask for each field: **who reads it, and who writes it?**

| Field | Readers | Verdict |
| --- | --- | --- |
| `theme` | the whole page | shared: keep global (store or Context) |
| `isMenuOpen` | `Header` only | local `useState` in `Header` |
| `commentDraft` | one `CommentBox` | local; global makes all boxes share one draft |
| `expandedPostId` | each `PostCard` about itself | local per card; global allows only one expanded card |

Pushing state **down** is a refactor senior engineers do as often as lifting it up.

## Boundaries

A **state boundary** is the component (or provider) that owns a piece of state; everything below can use it, nothing above can. Good boundaries follow features, not technical layers.

- **Component boundary**: `useState` in the component that owns the behavior. A `key` resets it when identity changes: `<CommentBox key={post.id} />` gives every post a fresh draft.
- **Subtree boundary**: a Context provider or a scoped store (`createStore` + context, Jotai `<Provider>`) placed around one feature. Two instances of the feature get two independent states.
- **App boundary**: a module-level store or root provider, only for state that is genuinely app-wide (session, theme, cart).
- **URL boundary**: state that must survive reloads and be shareable crosses into the URL.

```jsx
function PostCard({ post }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <article>
      <button onClick={() => setIsExpanded((value) => !value)}>Read more</button>
      {isExpanded && <p>{post.body}</p>}
      <CommentBox key={post.id} />
    </article>
  );
}
```

## Subscriptions are part of the boundary

Even for state that stays global, components should subscribe to the **smallest slice** they read. `const { theme } = useAppStore()` subscribes to the whole store, so the header re-renders whenever any field changes. `useAppStore((state) => state.theme)` re-renders only for theme changes. The same applies to Context: a component that only needs `dispatch` should not consume the context that also carries the state.

## A refactoring checklist

1. List every field of the global store with its readers and writers.
2. Single-reader fields move into the reader (`useState`/`useReducer`).
3. Fields read by siblings move to their closest common parent.
4. Per-instance fields become local state (with `key` resets when identity changes).
5. Shareable view state moves to the URL; server data moves to the query cache.
6. What remains global gets narrow selectors.

## When to use it / when not to

**Colocate by default**: in new features, in code review ("why is this global?"), and when fixing re-render or "two widgets share state" bugs. Local state is the cheapest, most testable and most deletable kind.

**Promote state** when a real, current consumer elsewhere needs it, when it must survive unmounting (a draft kept while the user navigates away: then a store or storage is right), or when it must be shareable (URL). Do not pre-globalize state "in case another page needs it later".
