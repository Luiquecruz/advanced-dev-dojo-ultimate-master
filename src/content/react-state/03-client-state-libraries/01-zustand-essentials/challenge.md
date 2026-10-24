Finish the music player store in **`playerStore.js`**. `App.jsx` is done and only uses the exported hooks. The store holds `queue` (tracks `{ id, title, duration }`), `currentIndex` (starts at `0`), `isPlaying` and a stable `actions` object.

**Actions** (inside `actions`):

- `enqueue(track)` and `clear()` are done.
- `togglePlay()`: does nothing when the queue is empty; otherwise flips `isPlaying`.
- `next()`: moves `currentIndex` to the next track; when already on the last track, sets `isPlaying` to `false` and keeps the index.

**Hooks**, each selecting **only** what it returns:

| Hook | Returns |
| --- | --- |
| `useCurrentTrack()` | `queue[currentIndex]` or `null` |
| `useIsPlaying()` | `isPlaying` |
| `useQueueDuration()` | the sum of `duration` in seconds |
| `useQueueTitles()` | an array of titles, made stable with **`useShallow`** from `zustand/react/shallow` |
| `usePlayerActions()` | the `actions` object |

Observable results:

- `usePlayerActions()` returns the same object across updates.
- A component using only `useIsPlaying()` does not re-render when tracks are queued.
- A component using `useQueueTitles()` renders without an infinite loop and does not re-render on play/pause.
- `usePlayerStore.setState(usePlayerStore.getInitialState(), true)` resets the store.
