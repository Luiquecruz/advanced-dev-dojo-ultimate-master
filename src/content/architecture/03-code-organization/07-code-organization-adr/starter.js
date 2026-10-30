export const adr = {
  id: 1,
  // TODO: a short imperative title
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'code-organization',
  // TODO: describe the pain and the team from the briefing
  context: '',
  // TODO: one sentence starting with "We will" that names the dependency direction and the public API rule
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected
  alternatives: [],
  // TODO: what the team gains and what it pays
  consequences: { positive: [], negative: [] },
};

export const structure = {
  // TODO: layers from highest ('app') to lowest ('shared')
  layers: [],
  // TODO: for each layer, the layers strictly below it that it may import
  allowedImports: {},
  // TODO: place appointments, invoices, pet and ui with their public API path
  slices: [],
};
