1. List the independent facts the component truly owns: the active filter, which ids the user marked as read, and which id is selected. Everything else comes from props.
2. Delete the `items` copy. Local "read" marks become a `Set` of ids, so new notifications from the parent are never hidden by a stale copy.
3. Write one `isRead` helper that combines the server flag and the local set; use it everywhere (class name, button, count, details).
4. Compute `unreadCount`, `visible` and `selected` as plain constants in the body, then delete both Effects and their state: one interaction now means one commit.
5. Store `selectedId` and look the object up with `find`; a missing object naturally becomes `Nothing selected`.
6. Update the `Set` immutably with an updater function so React sees a new reference.
