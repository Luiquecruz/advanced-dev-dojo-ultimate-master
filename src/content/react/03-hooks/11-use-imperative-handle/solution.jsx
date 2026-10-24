import { useImperativeHandle, useRef } from 'react';

export function SearchInput({ ref, label = 'Search' }) {
  const inputRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        inputRef.current.focus();
      },
      clear() {
        inputRef.current.value = '';
      },
    }),
    [],
  );

  return (
    <label>
      {label}
      <input ref={inputRef} />
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
