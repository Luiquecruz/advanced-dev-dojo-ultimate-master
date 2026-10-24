import { useState } from 'react';

export default function Stopwatch() {
  const [tenths, setTenths] = useState(0);
  // TODO: replace this plain variable with a ref created by useRef(null)
  let intervalId = null;

  function start() {
    // TODO: do nothing when an interval is already running
    intervalId = setInterval(() => {
      setTenths((current) => current + 1);
    }, 100);
  }

  function stop() {
    // TODO: clear the interval stored in the ref and empty the ref
    clearInterval(intervalId);
  }

  function reset() {
    stop();
    setTenths(0);
  }

  // TODO: clear the interval when the component unmounts (useEffect cleanup)

  return (
    <section>
      <p role="timer">{(tenths / 10).toFixed(1)}s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <button onClick={reset}>Reset</button>
    </section>
  );
}
