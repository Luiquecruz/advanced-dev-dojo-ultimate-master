1. Spot the bug: `intervalId` is a local variable, recreated on every render, so `stop` reads a fresh `null` instead of the real id.
2. Replace it with `const intervalRef = useRef(null)`. The ref object is the same across renders and mutating it does not trigger a render.
3. In `start`, guard against a second interval by returning when `intervalRef.current` is not `null`, then store the new id in `intervalRef.current`.
4. In `stop`, call `clearInterval(intervalRef.current)` and reset the ref to `null` so `start` works again.
5. `reset` already calls `stop` and resets the state, so it works once `stop` does.
6. Add an effect with an empty dependency array whose cleanup clears the interval, so an unmounted stopwatch does not keep calling `setTenths`.
