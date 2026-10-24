import { useEffect, useRef, useState } from 'react';

export default function Stopwatch() {
  const [tenths, setTenths] = useState(0);
  const intervalRef = useRef(null);

  function start() {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(() => {
      setTenths((current) => current + 1);
    }, 100);
  }

  function stop() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function reset() {
    stop();
    setTenths(0);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <section>
      <p role="timer">{(tenths / 10).toFixed(1)}s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <button onClick={reset}>Reset</button>
    </section>
  );
}
