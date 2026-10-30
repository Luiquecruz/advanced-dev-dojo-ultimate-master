export const adrs = [
  {
    id: 1,
    title: 'Render the catalog on the server and hydrate it',
    layer: 'rendering',
    status: 'accepted',
    context:
      'The catalog is public and must be indexed by search engines. Every visitor sees the same list, but prices come from the products service and must be current on every request.',
    decision:
      'We will render "/" with SSR on every request (renderToString) and hydrate it in the browser with hydrateRoot, reusing the view model embedded in the HTML.',
    consequences:
      'Crawlers and users get complete HTML in the first response. Every request costs a server render and an upstream call, so TTFB is higher than a CDN hit, and the whole tree hydrates, so all of its JavaScript is shipped.',
    supersedes: null,
    supersededBy: null,
  },
  {
    id: 2,
    title: 'Organize the code in feature folders behind public APIs',
    layer: 'organization',
    status: 'accepted',
    context:
      'One team will grow the store with more features (cart, checkout, account). The business rules are simple: filtering and formatting prices.',
    decision:
      'We will use feature folders: each feature lives in its own folder under features and exposes a public API in its index.js. Code outside a feature imports only that index, and a test scans the imports to enforce it.',
    consequences:
      'A feature can rename or split its internals without breaking callers. Every export must be added to the index on purpose, which costs a little ceremony, and the import rule must be kept in a test to survive.',
    supersedes: null,
    supersededBy: null,
  },
  {
    id: 3,
    title: 'Keep server data in the BFF view model and UI state local',
    layer: 'state',
    status: 'accepted',
    context:
      'The page shows products from the products service. During the visit the user filters the list and adds items to a cart. No other feature reads that state yet.',
    decision:
      'Server data is shaped by the BFF into a view model, rendered on the server and embedded in the HTML for hydration. UI state (filter text and cart items) stays local in ProductList with useState. No global store and no client cache.',
    consequences:
      'Server data has one source and the client makes no duplicate request on load. The cart is lost on reload and cannot be read by other features; sharing it will require lifting it into a context or a store.',
    supersedes: null,
    supersededBy: null,
  },
  {
    id: 4,
    title: 'Ship one application with one deploy and one BFF',
    layer: 'scale',
    status: 'accepted',
    context:
      'One team ships the store on one release cadence, and the web is the only client of the products service.',
    decision:
      'We will keep a single application, a single deploy and one BFF for the web. We reject micro-frontends because one team has no independent deploys to protect, and a BFF per client because there is only one client.',
    consequences:
      'No runtime composition, no version skew and one pipeline. Every change ships together, so a broken feature blocks the release, and a mobile app would require revisiting the BFF decision.',
    supersedes: null,
    supersededBy: null,
  },
];
