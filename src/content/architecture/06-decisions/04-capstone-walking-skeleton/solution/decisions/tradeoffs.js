export const tradeoffs = {
  outOfScope: [
    'A router library: one route does not need one; add React Router with the second page.',
    'TanStack Query: nothing is fetched on the client yet; add it with the first client-side mutation.',
    'A global store: no state is shared between features yet.',
    'Streaming SSR and Server Components: one small page renders fast enough without them.',
    'Authentication, checkout and payments: they come after the skeleton proves the layers.',
  ],
  risks: [
    'SSR on every request costs a render and an upstream call; move product pages to ISR if traffic grows.',
    'The products service is a single point of failure; the page answers 502 while it is down.',
    'The cart lives in component state and is lost on reload.',
  ],
};
