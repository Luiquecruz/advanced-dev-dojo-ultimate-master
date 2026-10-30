export const adr = {
  id: 5,
  title: 'Organize code in feature slices with downward imports',
  status: 'accepted',
  layer: 'code-organization',
  context:
    'Two squads of six developers share a type-based src with 140 components where any file imports any other. An invoice formatting change broke the appointment calendar twice last quarter, onboarding takes three weeks, and a modular monolith is planned for next year, so boundaries must be checkable in CI.',
  decision:
    'We will organize src into app, pages, features, entities and shared layers that import only downward, and every slice will be reached only through its public API index file, checked by eslint-plugin-boundaries in CI.',
  alternatives: [
    {
      option: 'Keep folders by type',
      reason: 'Unrestricted imports between types are what let invoice changes break the calendar.',
    },
    {
      option: 'Feature folders without layers',
      reason: 'The pet record is used by appointments and invoices and would force one feature to import another.',
    },
    {
      option: 'Hexagonal core with ports for every slice',
      reason: 'Scheduling and billing rules are simple today; ports and adapters would add ceremony without a payoff.',
    },
  ],
  consequences: {
    positive: [
      'Invoice changes stay inside features/invoices and cannot reach the calendar internals.',
      'A new developer finds a capability by its folder name.',
      'Slices with an index file are ready to become modules of the planned modular monolith.',
    ],
    negative: [
      'Moving 140 components and rewriting imports costs about two sprints of migration work.',
      'Lint failures block quick cross-slice imports until code is moved down a layer.',
      'The team will debate whether new code is a feature or an entity.',
    ],
  },
};

export const structure = {
  layers: ['app', 'pages', 'features', 'entities', 'shared'],
  allowedImports: {
    app: ['pages', 'features', 'entities', 'shared'],
    pages: ['features', 'entities', 'shared'],
    features: ['entities', 'shared'],
    entities: ['shared'],
    shared: [],
  },
  slices: [
    { name: 'appointments', layer: 'features', publicApi: 'src/features/appointments/index.js' },
    { name: 'invoices', layer: 'features', publicApi: 'src/features/invoices/index.js' },
    { name: 'pet', layer: 'entities', publicApi: 'src/entities/pet/index.js' },
    { name: 'ui', layer: 'shared', publicApi: 'src/shared/ui/index.js' },
  ],
};
