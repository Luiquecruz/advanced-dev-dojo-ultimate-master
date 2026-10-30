export const adr = {
  id: 6,
  title: 'Give every kind of state one home',
  status: 'accepted',
  layer: 'state-and-data',
  context:
    'All state lives in one global store. Server data such as products and the current user is copied into it with effects and goes stale, the selected aisle is missing from shared links and lost on reload, and the checkout flow is a set of booleans that once charged a customer twice. Only the cart is client state read on different routes.',
  decision:
    'We will cache server data with TanStack Query, keep the aisle and page in search params, hold only the cart in a small Zustand store, edit the address with React Hook Form, run checkout as an XState machine and derive totals during render.',
  alternatives: [
    {
      option: 'Keep one global store for everything',
      reason: 'Copies of server data go stale, need manual loading flags and the store mirrors the URL with sync effects.',
    },
    {
      option: 'Local state and prop drilling only',
      reason: 'The cart is read by the header and by the checkout route, which share no close parent component.',
    },
    {
      option: 'Booleans in useState for the checkout flow',
      reason: 'Combinations like paying and confirming at once are what allowed the double charge.',
    },
  ],
  consequences: {
    positive: [
      'Product lists refetch and deduplicate without custom effects.',
      'Shared aisle links open on the right aisle and page after a reload.',
      'A second payment submission is impossible because the machine ignores it while confirming.',
      'The global store shrinks to the cart.',
    ],
    negative: [
      'Four state tools to learn: TanStack Query, Zustand, React Hook Form and XState.',
      'Every feature must follow the query key factory convention to invalidate correctly.',
      'Migrating existing store slices to their new homes touches most screens.',
    ],
  },
};

export const stateMap = [
  { state: 'products', home: 'server-cache', reason: 'Owned by the API and cached per aisle query key.' },
  { state: 'currentUser', home: 'server-cache', reason: 'Owned by the API; refetched instead of copied.' },
  { state: 'aisle', home: 'url', reason: 'Shared links must open on the same aisle after a reload.' },
  { state: 'page', home: 'url', reason: 'Part of the shareable list position, survives reload.' },
  { state: 'cart', home: 'client-store', reason: 'Client-owned and read by the header and the checkout route.' },
  { state: 'cartTotal', home: 'derived', reason: 'Computed from cart lines so it can never drift.' },
  { state: 'addressDraft', home: 'form', reason: 'A draft with validation and field errors until submitted.' },
  { state: 'isFilterPanelOpen', home: 'local', reason: 'Only the aisle page reads it and it may reset on leave.' },
  { state: 'checkoutStep', home: 'state-machine', reason: 'Guarded steps block double payment and going back while confirming.' },
];
