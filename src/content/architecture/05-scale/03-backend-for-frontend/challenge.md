Write the **Backend for Frontend** endpoint behind the web profile page. In this sandbox the BFF is a plain async function; `fetch` reaches the upstream services on the fake API (`/api/users/:id` and `/api/posts?userId=`).

Export `async function getProfilePage(userId)` from `bff.js`. It returns `{ status, body }`:

**Success: `status: 200`** with exactly these fields in `body`:

| Field | Value |
| --- | --- |
| `name` | the user's name |
| `initials` | first letter of each word of the name, upper case (`'Ada Lovelace'` → `'AL'`) |
| `postCount` | number of posts of the user |
| `latestPosts` | the 3 posts with the highest `id`, newest first, each as `{ id, title }` only |
| `postsUnavailable` | `false` |

Nothing else leaks: no `email`, `role`, `userId` or post `body`.

**Failures**

- The users service answers 404 → `{ status: 404, body: { error: 'User not found' } }`.
- The users service fails in any other way → `{ status: 502, body: { error: 'Profile service unavailable' } }`.
- The posts service answers a non-OK status **or** the request rejects → the page still renders: `status: 200` with `postCount: null`, `latestPosts: []`, `postsUnavailable: true` (name and initials as usual).

**Performance**

- Both upstream requests start **at the same time**. The tests slow both services down and check that the posts request starts before the users request finishes.
