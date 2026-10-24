`useSuspenseQuery` takes the same options object as `useQuery`: `const { data: user } = useSuspenseQuery(userQuery(userId));`.
---
Remove the `isPending` branch and the `useQuery` import entirely. If the data is not ready, the component suspends and the closest `<Suspense>` shows its fallback.
---
`<Suspense fallback={<p>Loading profile...</p>}><UserProfile userId={userId} /><Suspense fallback={<p>Loading posts...</p>}><UserPosts userId={userId} /></Suspense></Suspense>`.
