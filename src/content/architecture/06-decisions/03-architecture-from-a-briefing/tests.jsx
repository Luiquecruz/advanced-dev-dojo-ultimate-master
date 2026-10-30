const { recommendArchitecture } = mod;

function briefing(overrides) {
  return {
    product: 'Product',
    seo: false,
    personalized: false,
    dataChangesEvery: 'request',
    teams: 1,
    independentDeploys: false,
    clients: ['web'],
    complexDomainRules: false,
    routes: [{ path: '/' }],
    ...overrides,
  };
}

function decisionsOnly(recommendation) {
  const { reasons, ...decisions } = recommendation;
  return decisions;
}

const internalDashboard = briefing({
  product: 'Internal sales dashboard',
  personalized: true,
  routes: [{ path: '/dashboard' }, { path: '/reports' }, { path: '/settings' }],
});

const publicCatalog = briefing({
  product: 'Public catalog with hourly prices',
  seo: true,
  dataChangesEvery: 'hour',
  routes: [
    { path: '/', dataChangesEvery: 'day' },
    { path: '/products/:id' },
    { path: '/search', dataChangesEvery: 'request' },
    { path: '/account', seo: false, personalized: true },
  ],
});

test('an internal dashboard behind login is a SPA with feature folders, local state and a server cache', () => {
  expect(decisionsOnly(recommendArchitecture(internalDashboard))).toEqual({
    rendering: { '/dashboard': 'spa', '/reports': 'spa', '/settings': 'spa' },
    organization: 'feature-folders',
    domain: 'in-components',
    state: ['local', 'server-cache'],
    bff: false,
  });
});

test('a public catalog picks the rendering per route from SEO, personalization and data freshness', () => {
  const recommendation = recommendArchitecture(publicCatalog);
  expect(recommendation.rendering).toEqual({
    '/': 'ssg',
    '/products/:id': 'isr',
    '/search': 'ssr',
    '/account': 'spa',
  });
  expect(recommendation.state).toEqual(['local', 'server-cache', 'embedded-data']);
  const personalizedSeoRoute = briefing({ seo: true, routes: [{ path: '/feed', personalized: true, dataChangesEvery: 'never' }] });
  expect(recommendArchitecture(personalizedSeoRoute).rendering).toEqual({ '/feed': 'ssr' });
});

test('a marketing site inherits the briefing fields on its routes and needs no client cache', () => {
  const marketingSite = briefing({
    product: 'Marketing site',
    seo: true,
    dataChangesEvery: 'never',
    routes: [{ path: '/' }, { path: '/about' }, { path: '/blog/:slug', dataChangesEvery: 'day' }],
  });
  const recommendation = recommendArchitecture(marketingSite);
  expect(recommendation.rendering).toEqual({ '/': 'static', '/about': 'static', '/blog/:slug': 'ssg' });
  expect(recommendation.state).toEqual(['local', 'embedded-data']);
  const landingPage = briefing({ seo: true, dataChangesEvery: 'never', routes: [{ path: '/' }] });
  expect(recommendArchitecture(landingPage).state).toEqual(['local']);
});

test('micro-frontends need several teams AND independent deploys; complex rules get a hexagonal domain', () => {
  const marketplace = briefing({
    product: 'Multi-team marketplace',
    teams: 4,
    independentDeploys: true,
    complexDomainRules: true,
  });
  expect(recommendArchitecture(marketplace).organization).toBe('micro-frontends');
  expect(recommendArchitecture(marketplace).domain).toBe('hexagonal');
  expect(recommendArchitecture({ ...marketplace, independentDeploys: false }).organization).toBe('modular-monolith');
  expect(recommendArchitecture({ ...marketplace, teams: 1 }).organization).toBe('feature-folders');
  expect(recommendArchitecture({ ...marketplace, complexDomainRules: false }).domain).toBe('in-components');
});

test('a BFF is recommended only when more than one kind of client consumes the backend', () => {
  const webAndMobile = briefing({ product: 'Banking app', clients: ['web', 'mobile'] });
  expect(recommendArchitecture(webAndMobile).bff).toBe(true);
  expect(recommendArchitecture({ ...webAndMobile, clients: ['web', 'mobile', 'tv'] }).bff).toBe(true);
  expect(recommendArchitecture({ ...webAndMobile, clients: ['web'] }).bff).toBe(false);
  expect(recommendArchitecture({ ...webAndMobile, clients: ['mobile', 'mobile'] }).bff).toBe(false);
});

test('every decision comes with a reason in the "<subject>: <choice> because <why>" format', () => {
  const recommendation = recommendArchitecture(publicCatalog);
  const expectedPrefixes = [
    '/: ssg because ',
    '/products/:id: isr because ',
    '/search: ssr because ',
    '/account: spa because ',
    'organization: feature-folders because ',
    'domain: in-components because ',
    'state: local, server-cache, embedded-data because ',
    'bff: false because ',
  ];
  expect(recommendation.reasons).toHaveLength(expectedPrefixes.length);
  recommendation.reasons.forEach((reason, index) => {
    expect(reason.slice(0, expectedPrefixes[index].length)).toBe(expectedPrefixes[index]);
    expect(reason.length).toBeGreaterThan(expectedPrefixes[index].length + 10);
  });
});
