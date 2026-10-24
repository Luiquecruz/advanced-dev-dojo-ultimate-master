type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; error: string };

function renderState(state: RequestState): string {
  switch (state.status) {
    case 'idle':
      return 'Nothing loaded yet';
    case 'loading':
      return 'Loading…';
    case 'success':
      return `${state.data.length} items: ${state.data.join(', ')}`;
    case 'error':
      return `Error: ${state.error}`;
  }
}
