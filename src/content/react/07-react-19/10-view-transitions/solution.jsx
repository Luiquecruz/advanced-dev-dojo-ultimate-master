import { addTransitionType, startTransition, useState, ViewTransition } from 'react';

export default function Slideshow({ slides = ['Actions', 'Activity', 'View Transitions'] }) {
  const [index, setIndex] = useState(0);

  function go(direction) {
    startTransition(() => {
      addTransitionType(direction);
      setIndex((current) => (current + (direction === 'next' ? 1 : -1) + slides.length) % slides.length);
    });
  }

  return (
    <section>
      <ViewTransition
        key={index}
        enter={{ next: 'slide-from-right', previous: 'slide-from-left', default: 'none' }}
        exit={{ next: 'slide-to-left', previous: 'slide-to-right', default: 'none' }}
      >
        <h2>{slides[index]}</h2>
      </ViewTransition>
      <p>
        Slide {index + 1} of {slides.length}
      </p>
      <button onClick={() => go('previous')}>Previous</button>
      <button onClick={() => go('next')}>Next</button>
    </section>
  );
}
