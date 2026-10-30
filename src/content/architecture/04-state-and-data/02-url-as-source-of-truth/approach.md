1. Treat the query string as untrusted input with a contract: each screen declares its keys, types and defaults once, and nothing else in the app reads raw params.
2. Implement `parse` field by field. Decide what "valid" means per type (an integer in range, a known enum value, known list items), and fall back to the default instead of throwing, so a hand-edited or outdated link still opens the screen.
3. Normalize while parsing: dedupe and sort lists, so two URLs that mean the same thing produce the same state.
4. Implement `serialize` as the inverse with one extra rule: produce one canonical string per state. Sort the keys, drop defaults, write list items in order. Check that `serialize(parse(serialize(state)))` is stable.
5. Write the hook as a thin adapter over the router: derive state during render with `parse`, write with `serialize`. Keeping no local copy is what makes reload, back/forward and deep links work for free.
6. Put the cross-cutting policy in the hook, not in every screen: a partial update without `page` resets the page, so no screen can show page 7 of a filter that has 2 pages.
7. Choose push or replace per control: discrete choices (sort, category, page) push so back undoes them; continuous typing replaces.
