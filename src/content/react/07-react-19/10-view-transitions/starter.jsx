import { addTransitionType, startTransition, useState, ViewTransition } from 'react';

export default function Slideshow({ slides = ['Actions', 'Activity', 'View Transitions'] }) {
  const [index, setIndex] = useState(0);

  function go(direction) {
    // TODO: wrap the update in startTransition and tag it with addTransitionType(direction)
    // TODO: move forward for 'next' and backward for 'previous', wrapping around
    setIndex((current) => current);
  }

  return (
    <section>
      {/* TODO: wrap the heading in <ViewTransition key={index} enter={...} exit={...}> */}
      <h2>{slides[index]}</h2>
      <p>
        Slide {index + 1} of {slides.length}
      </p>
      <button onClick={() => go('previous')}>Previous</button>
      <button onClick={() => go('next')}>Next</button>
    </section>
  );
}
