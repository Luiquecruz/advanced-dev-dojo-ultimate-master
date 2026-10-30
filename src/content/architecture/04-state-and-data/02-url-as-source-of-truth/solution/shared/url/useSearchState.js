import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

export function useSearchState(schema) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => schema.parse(searchParams), [schema, searchParams]);

  function setState(partial, navigateOptions) {
    const nextState = { ...state, ...partial };
    if ('page' in state && !('page' in partial)) {
      delete nextState.page;
    }
    setSearchParams(schema.serialize(nextState), navigateOptions);
  }

  return [state, setState];
}
