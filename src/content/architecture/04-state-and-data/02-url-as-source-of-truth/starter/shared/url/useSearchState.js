import { useState } from 'react';

export function useSearchState(schema) {
  // TODO: derive the state from useSearchParams() with schema.parse instead of keeping a copy in useState
  const [state, setLocalState] = useState(() => schema.parse(new URLSearchParams()));

  function setState(partial, navigateOptions) {
    // TODO: merge partial into state, reset page to its default when partial has no page,
    // and write schema.serialize(nextState) with setSearchParams(..., navigateOptions)
    setLocalState({ ...state, ...partial });
  }

  return [state, setState];
}
