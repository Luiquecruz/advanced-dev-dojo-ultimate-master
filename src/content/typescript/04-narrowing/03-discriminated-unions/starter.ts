// TODO: replace this interface with a discriminated union on `status`
interface RequestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: string[];
  error?: string;
}

function renderState(state: RequestState): string {
  // TODO: narrow on state.status and remove the non-null assertions
  if (state.status === 'success') {
    return `${state.data!.length} items: ${state.data!.join(', ')}`;
  }
  return `Error: ${state.error!}`;
}
