`RoomStatus` is a working **class component**. Migrate it to a **function component with hooks** without changing its behavior.

Behavior to keep (the tests check all of it):

- Props: `roomId` (string) and `chat`, an object with `subscribe(roomId, onMessage)` that returns an `unsubscribe` function.
- Renders an `<h2>` with `Room: {roomId}`, a `<p>` with `Messages: {count}` and a button **`Clear`** that sets the count to `0`.
- Subscribes on mount; each message increments the count.
- When `roomId` changes: unsubscribes from the old room, subscribes to the new one and resets the count to `0`.
- Unsubscribes on unmount.
- Keeps `document.title` equal to `({count}) {roomId}`, for example `(2) general`.

Keep it as the default export named `RoomStatus`. No `class` in the final code.
