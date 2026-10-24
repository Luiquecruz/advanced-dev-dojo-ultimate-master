import { Fragment, useEffect, useRef } from 'react';

export function ButtonGroup({ onPress, autoFocus = false, children }) {
  const fragmentRef = useRef(null);

  useEffect(() => {
    // TODO: add a 'click' listener on the FragmentInstance that calls onPress(event.currentTarget.textContent)
    // TODO: return a cleanup that removes the same listener
  }, [onPress]);

  useEffect(() => {
    // TODO: focus the first child when autoFocus is true
  }, [autoFocus]);

  // TODO: attach fragmentRef to a <Fragment> instead of wrapping in a <span>
  return <span>{children}</span>;
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
