import { useState } from 'react';

export default function ScoreBoard() {
  const [score, setScore] = useState(0);

  function addOne() {
    setScore(score + 1);
  }

  function addThree() {
    // TODO: these three calls read the same snapshot; use updater functions so they add up to 3
    setScore(score + 1);
    setScore(score + 1);
    setScore(score + 1);
  }

  function addBonusLater() {
    setTimeout(() => {
      // TODO: when this runs, `score` is the value from the click's render; use an updater function
      setScore(score + 1);
    }, 100);
  }

  return (
    <section>
      <p>Score: {score}</p>
      <button onClick={addOne}>+1</button>
      <button onClick={addThree}>+3</button>
      <button onClick={addBonusLater}>Bonus later</button>
    </section>
  );
}
