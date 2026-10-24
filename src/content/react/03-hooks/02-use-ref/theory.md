## A box that survives renders

`useRef(initialValue)` returns a plain object `{ current: initialValue }`. React gives you the **same object** on every render of that component instance, and you can read and write `ref.current` freely.

```jsx
import { useRef } from 'react';

function Clicker() {
  const clicks = useRef(0);
  function handleClick() {
    clicks.current += 1;
    console.log(`Clicked ${clicks.current} times`);
  }
  return <button onClick={handleClick}>Click</button>;
}
```

Two properties make refs different from state:

| | `useState` | `useRef` |
| --- | --- | --- |
| Value survives re-renders | yes | yes |
| Changing it re-renders | yes (`setX`) | **no** |
| Value is a snapshot per render | yes | no, always the latest |
| Read during render | yes | avoid (except lazy init) |

Use a ref for values the UI does not display but your **event handlers or effects** need: timer ids, previous values, an `AbortController`, a third-party widget instance.

## Why a plain variable does not work

Every render calls your component function again, so a local `let` starts from scratch each time:

```jsx
function Stopwatch() {
  const [running, setRunning] = useState(false);
  let intervalId;
  function start() {
    intervalId = setInterval(tick, 100);
    setRunning(true);
  }
  function stop() {
    clearInterval(intervalId);
  }
}
```

`setRunning(true)` triggers a new render. The `stop` function from that render sees a **new** `intervalId` variable that was never assigned, so the interval never stops. Storing the id in `useRef` fixes it because the ref object is the same across renders.

A module-level variable "works" too, but it is shared by every instance of the component: two stopwatches would fight over one id.

## Refs to DOM nodes

Pass a ref object to the `ref` attribute and React puts the DOM node in `current` after commit (and sets it back to `null` on unmount):

```jsx
function SearchBar() {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  );
}
```

Common DOM uses: focus, scroll into view, measure size, play/pause media, integrate non-React libraries.

## Rules for refs

- **Do not read or write `ref.current` during render** (except the lazy-init pattern below). The component would stop being a pure function of props and state, and the React Compiler lint rules flag it.
- Mutating a ref does not re-render. If the value must appear on screen, it belongs in state.
- Refs are an **escape hatch**. If you reach for them to control what React renders, you probably want state.

Lazy initialization avoids recreating an expensive object on every render:

```jsx
const playerRef = useRef(null);
if (playerRef.current === null) {
  playerRef.current = new VideoPlayer();
}
```

## Legacy vs modern

Class components used `this.timerId` for mutable instance values and `React.createRef()` or string refs (`ref="input"`, removed in React 19) for DOM nodes. In React 19, `ref` is also a regular prop for function components, so `forwardRef` is no longer needed to pass a ref down. TypeScript users: in React 19 types, `useRef` requires an argument and returns a mutable `RefObject`.
