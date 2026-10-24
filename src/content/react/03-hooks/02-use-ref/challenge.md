The `Stopwatch` below has a bug: once started, it **never stops**. Fix it with `useRef`.

Keep the existing markup and behavior:

- The elapsed time is shown in an element with `role="timer"`, formatted as `0.0s` (tenths of a second, one decimal).
- **Start** begins counting: the time increases by `0.1` every 100 ms.
- **Stop** freezes the time.
- **Reset** stops the stopwatch and sets the time back to `0.0s`.

Requirements:

- Store the interval id in a ref created with `useRef`, not in a plain variable.
- Clicking **Start** while already running must not create a second interval (the time must not speed up).
- Clear the interval when the component unmounts.
