import { useRef } from 'react';

export function SearchInput({ ref, label = 'Search' }) {
  // TODO: keep the DOM node in a private ref and expose only { focus(), clear() } with useImperativeHandle
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}

export default function App() {
  const searchRef = useRef(null);

  return (
    <section>
      <SearchInput ref={searchRef} />
      <button onClick={() => searchRef.current.focus()}>Focus search</button>
      <button onClick={() => searchRef.current.clear()}>Clear</button>
    </section>
  );
}
