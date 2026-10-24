import { useEffect, useState } from 'react';

export function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, isLoading: true });

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ data: null, error, isLoading: false });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
