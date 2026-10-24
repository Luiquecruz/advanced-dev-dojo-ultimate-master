Start with the easy parts: destructure `{ roomId, chat }`, replace `this.state.count` with `const [count, setCount] = useState(0)` and turn `clear` into `() => setCount(0)`.
---
Merge `subscribe` / `componentDidUpdate` / `componentWillUnmount` into one effect: `useEffect(() => { const unsubscribe = chat.subscribe(roomId, ...); return unsubscribe; }, [roomId, chat])`. Use the updater `setCount((current) => current + 1)` in the message callback.
---
The title is a second concern: `useEffect(() => { document.title = \`(${count}) ${roomId}\`; }, [count, roomId])`. To reset the count when the room changes, remember the previous room in state and call `setCount(0)` during render when `roomId !== prevRoomId` (or reset it inside the subscription effect).
