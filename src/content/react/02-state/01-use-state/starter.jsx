import { useState } from 'react';

export default function Counter() {
  // TODO: replace this local variable with a state variable
  let count = 0;

  function increment() {
    count = count + 1;
  }

  function decrement() {
    count = count - 1;
  }

  // TODO: add a reset handler

  return (
    <div className="counter">
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
      {/* TODO: disable this button when the count is 0 */}
      <button onClick={decrement}>-1</button>
      {/* TODO: add a "Reset" button */}
    </div>
  );
}
