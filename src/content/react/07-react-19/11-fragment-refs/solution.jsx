import { Fragment, useEffect, useRef } from 'react';

export function ButtonGroup({ onPress, autoFocus = false, children }) {
  const fragmentRef = useRef(null);

  useEffect(() => {
    const fragment = fragmentRef.current;
    const listener = (event) => onPress(event.currentTarget.textContent);
    fragment.addEventListener('click', listener);
    return () => fragment.removeEventListener('click', listener);
  }, [onPress]);

  useEffect(() => {
    if (autoFocus) {
      fragmentRef.current.focus();
    }
  }, [autoFocus]);

  return <Fragment ref={fragmentRef}>{children}</Fragment>;
}

export default function Toolbar({ onPress = () => {}, autoFocus = false }) {
  return (
    <div role="toolbar" aria-label="Formatting">
      <ButtonGroup onPress={onPress} autoFocus={autoFocus}>
        <button>Bold</button>
        <button>Italic</button>
        <button>Underline</button>
      </ButtonGroup>
    </div>
  );
}
