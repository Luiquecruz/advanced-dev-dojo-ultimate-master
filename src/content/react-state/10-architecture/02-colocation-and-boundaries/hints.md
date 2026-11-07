For every field in the store, ask who reads it. `isMenuOpen` is read only by `Header`, `commentDraft` only by one `CommentBox`, `expandedPostId` by each `PostCard` about itself. Only `theme` has readers across the page.
---
Replace the store reads with local state: `const [isMenuOpen, setIsMenuOpen] = useState(false)` in `Header`, `const [draft, setDraft] = useState('')` in `CommentBox`, `const [isExpanded, setIsExpanded] = useState(false)` in `PostCard`.
---
`const { theme, toggleTheme } = useAppStore()` subscribes `Header` to the entire store. Use `useAppStore((state) => state.theme)` and `useAppStore((state) => state.toggleTheme)`, then delete the unused fields from `create(...)`.
