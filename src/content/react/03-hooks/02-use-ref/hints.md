Every render runs the component function again, so `let intervalId` is a brand new variable each time. The `stop` handler from a later render never sees the id that `start` saved. What survives renders without causing one?
---
Create `const intervalRef = useRef(null)` and use `intervalRef.current` everywhere the plain variable was used. After clearing, set `intervalRef.current = null` so you can tell whether the stopwatch is running.
---
In `start`, return early when `intervalRef.current !== null`. For unmount, add `useEffect(() => () => clearInterval(intervalRef.current), [])`: the returned function is the cleanup.
