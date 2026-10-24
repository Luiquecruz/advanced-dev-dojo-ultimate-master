import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(count - 1)} disabled={count === 0}>
        -1
      </button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
