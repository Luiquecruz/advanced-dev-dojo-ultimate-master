**Refactor an over-globalized store.** Everything on this blog page lives in one Zustand store, so the two comment boxes mirror each other, only one post can be expanded at a time, and typing re-renders the header. Move each piece of state to where it belongs without changing the UI.

**`store.js`**

- `useAppStore` keeps **only** `theme` (`'light'` | `'dark'`) and `toggleTheme`. Remove `isMenuOpen`, `commentDraft`, `expandedPostId` and their setters.

**`Header.jsx`**

- Subscribes to `theme` and `toggleTheme` with **selectors** (never the whole store).
- Keeps the menu open state in local `useState`. The `Menu` button toggles it (`aria-expanded`) and shows `<nav aria-label="Main menu">`.
- Keep the `renderCounts.Header += 1` line: the tests use it to detect needless re-renders.

**`PostCard.jsx`**

- Each `PostCard` keeps its own expanded state (`Read more` / `Show less`), so cards expand independently.
- Each `CommentBox` keeps its own draft (textarea labelled `Comment on {title}`). `Post comment` adds the comment to that post's list and clears only that draft.

`App.jsx` and `renderLog.js` are done. The tests check the store's keys, that drafts and expansion are per post, that typing in a comment does not re-render `Header`, and that theme and menu still work.
