import { useState } from 'react';

export default function ScoreBoard() {
  const [score, setScore] = useState(0);

  function addOne() {
    setScore(score + 1);
  }

  function addThree() {
    setScore((previous) => previous + 1);
    setScore((previous) => previous + 1);
    setScore((previous) => previous + 1);
  }

  function addBonusLater() {
    setTimeout(() => {
      setScore((previous) => previous + 1);
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
