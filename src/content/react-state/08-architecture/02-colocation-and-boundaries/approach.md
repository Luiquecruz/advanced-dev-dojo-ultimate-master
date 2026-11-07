1. Audit the store: list each field with its readers and writers. Only `theme` is read across the page.
2. Push `isMenuOpen` down into `Header` as `useState`; it no longer affects anything else.
3. Push the draft down into `CommentBox`. Because each box now owns its state, two boxes can no longer mirror each other.
4. Replace the global `expandedPostId` with a per-card boolean; the "only one card expanded" constraint disappears because it was never a requirement.
5. Subscribe `Header` to the store with selectors so it re-renders only for theme changes.
6. Delete the now-unused fields from the store, leaving `theme` and `toggleTheme`.
