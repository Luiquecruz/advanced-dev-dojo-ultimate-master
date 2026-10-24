1. Switch `UserProfile` to `useSuspenseQuery`; its `data` is guaranteed, so delete the pending branch.
2. Implement `UserPosts` the same way and map the posts into list items.
3. Decide what should appear together: the profile is the main content, so the outer boundary waits for it.
4. Posts are secondary: give them their own nested boundary so a slow posts request does not hide the profile.
5. Remove every `useQuery`/`isPending` reference: loading UI now lives in `ProfilePage`'s fallbacks only.
