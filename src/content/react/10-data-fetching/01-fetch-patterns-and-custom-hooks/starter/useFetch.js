import { useEffect, useState } from 'react';

export function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });

  useEffect(() => {
    // TODO: create an AbortController and reset the state to loading
    // TODO: fetch(url) with the signal; throw new Error(`Request failed with status ${response.status}`) when !response.ok
    // TODO: on success store { data, error: null, isLoading: false }
    // TODO: on failure (except AbortError) store { data: null, error, isLoading: false }
    // TODO: return a cleanup that aborts the request
  }, [url]);

  return state;
}
