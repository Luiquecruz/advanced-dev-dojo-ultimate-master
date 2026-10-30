import { useEffect, useState } from 'react';

export function useUserDirectory() {
  // TODO: move the fetching and filtering from the App container here
  // TODO: status starts as 'loading' and becomes 'success' or 'error'; users is the list filtered by query (case-insensitive, by name)
  return { status: 'loading', users: [], query: '', setQuery: () => {} };
}
