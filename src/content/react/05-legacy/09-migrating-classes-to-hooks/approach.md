1. Run the tests on the class first: every behavior test passes, only the "no class" test fails. That is your safety net.
2. Replace the class with `function RoomStatus({ roomId, chat })` and one `useState` for `count`.
3. List the concerns: "subscribed to the current room" and "title mirrors count and room". Each becomes one `useEffect`.
4. The subscription effect returns the `unsubscribe` function as cleanup and depends on `[roomId, chat]`, which replaces the `prevProps` comparison and `componentWillUnmount`.
5. Increment with the updater form to avoid stale closures.
6. Reset the count on room change by tracking `prevRoomId` in state and adjusting during render.
7. Re-run the tests: same behavior, half the code.
