export const adr = {
  id: 4,
  title: 'Choose the rendering model per route',
  status: 'accepted',
  layer: 'rendering',
  context:
    'Search brings 60% of buyers, so public pages must ship their content in the HTML for SEO and link previews. Event prices change several times an hour and must stay fresh, while the landing page and help center only change on deploy. Checkout and tickets are private and per user. On-sale spikes reach 50x normal load and per-request rendering is billed per invocation on a tight budget.',
  decision:
    'We will prebuild the landing page and help center with SSG, serve event pages with ISR revalidated every 60 seconds and on CMS publish, and ship checkout and account as a client-rendered SPA behind login.',
  alternatives: [
    {
      option: 'SSR for every route',
      reason: 'A render per request on pages that change at most hourly multiplies cost during on-sale spikes.',
    },
    {
      option: 'SPA for every route',
      reason: 'Event and help pages would be empty for crawlers and link previews, and search brings most buyers.',
    },
    {
      option: 'SSG for event pages with a rebuild on every price change',
      reason: 'Prices change several times an hour across hundreds of events; full rebuilds would lag behind and stay stale.',
    },
  ],
  consequences: {
    positive: [
      'On-sale spikes hit the CDN cache instead of the render server.',
      'Event pages are indexable and at most one minute stale, and refresh immediately on CMS publish.',
      'Checkout and account cost nothing to render on the server.',
    ],
    negative: [
      'Event prices can be up to 60 seconds stale, so checkout must re-check price and availability on the server before payment.',
      'The first visitor after expiry receives the previous version while the page regenerates.',
      'Two delivery modes, prerendered pages and a client app, must be built, tested and monitored.',
    ],
  },
};

export const routes = [
  { path: '/', model: 'ssg', reason: 'Same HTML for everyone until the next deploy, served from the CDN.' },
  {
    path: '/events/:slug',
    model: 'isr',
    reason: 'Shared and SEO-critical, with prices that may be a minute stale; webhook revalidation on publish.',
  },
  {
    path: '/events/:slug/checkout',
    model: 'spa',
    reason: 'Private, per user and highly interactive; no SEO and data fetched live from the API.',
  },
  { path: '/account/tickets', model: 'spa', reason: 'Private per-user data behind login with no SEO needs.' },
  { path: '/help/:article', model: 'ssg', reason: 'Markdown in the repository changes only on deploy and must be indexable.' },
];
