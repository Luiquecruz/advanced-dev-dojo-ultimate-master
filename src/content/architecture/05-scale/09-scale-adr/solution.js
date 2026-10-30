export const adr = {
  id: 8,
  title: 'Keep one deploy as a modular monolith with team ownership',
  status: 'accepted',
  layer: 'scale',
  context:
    'Three product teams of 18 engineers share one React 19 app released by a weekly release train. Twice last quarter an account bug held back the train and an urgent booking fix. About 85% of changes stay inside one domain, every team uses the same React version and design system, and no domain has its own lifecycle.',
  decision:
    'We will run Tidepool as a modular monolith with search, booking, payments and account modules behind public APIs, owned per team in CODEOWNERS and checked by an architecture test, and replace the weekly train with daily deploys behind feature flags.',
  alternatives: [
    {
      option: 'Micro-frontends per team',
      reason:
        'Three teams sharing one React version do not need independent runtimes; the weekly release train blocks them because of process, which daily deploys and feature flags fix without distributed contracts.',
    },
    {
      option: 'Monorepo with one app per team',
      reason: 'Search, booking and payments form one journey; separate apps would add hard navigations and duplicated shells.',
    },
    {
      option: 'Keep the monolith as it is',
      reason: 'Without boundaries or ownership an account bug keeps blocking booking releases.',
    },
  ],
  consequences: {
    positive: [
      'A broken account change is hidden behind its flag instead of holding back booking fixes.',
      'Each team reviews and owns its modules through CODEOWNERS.',
      'Module public APIs make a later extraction to a micro-frontend a move, not a rewrite.',
    ],
    negative: [
      'All teams still share one build, one React upgrade and one deploy pipeline.',
      'Feature flags need cleanup discipline or dead branches pile up.',
      'The architecture test must be maintained as modules evolve.',
    ],
  },
};

export const plan = {
  topology: 'modular-monolith',
  modules: [
    { name: 'search', owner: 'discovery' },
    { name: 'booking', owner: 'checkout' },
    { name: 'payments', owner: 'checkout' },
    { name: 'account', owner: 'accounts' },
  ],
  revisitWhen: [
    'A fifth autonomous team joins and owns a domain with its own release cadence.',
    'A domain must ship several times a day and feature flags no longer isolate its releases.',
    'A domain needs a different React version or a gradual rewrite.',
  ],
};
