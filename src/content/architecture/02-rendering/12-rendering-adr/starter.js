export const adr = {
  id: 1,
  // TODO: a short imperative title
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'rendering',
  // TODO: describe the forces from the briefing: SEO, data freshness, traffic, budget
  context: '',
  // TODO: one sentence starting with "We will", naming the model per kind of route
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected
  alternatives: [],
  // TODO: what the team gains and what it pays
  consequences: { positive: [], negative: [] },
};

export const routes = [
  // TODO: pick a model ('static', 'ssg', 'isr', 'ssr' or 'spa') and a reason for each route
  { path: '/', model: '', reason: '' },
  { path: '/events/:slug', model: '', reason: '' },
  { path: '/events/:slug/checkout', model: '', reason: '' },
  { path: '/account/tickets', model: '', reason: '' },
  { path: '/help/:article', model: '', reason: '' },
];
