export const adr = {
  id: 1,
  // TODO: a short imperative title
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'state-and-data',
  // TODO: describe the server and client state of the briefing and what hurts today
  context: '',
  // TODO: one sentence starting with "We will" that gives each kind of state a home
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected
  alternatives: [],
  // TODO: what the team gains and what it pays
  consequences: { positive: [], negative: [] },
};

export const stateMap = [
  // TODO: choose a home and a reason for every piece of state
  { state: 'products', home: 'client-store', reason: '' },
  { state: 'currentUser', home: 'client-store', reason: '' },
  { state: 'aisle', home: 'client-store', reason: '' },
  { state: 'page', home: 'client-store', reason: '' },
  { state: 'cart', home: 'client-store', reason: '' },
  { state: 'cartTotal', home: 'client-store', reason: '' },
  { state: 'addressDraft', home: 'client-store', reason: '' },
  { state: 'isFilterPanelOpen', home: 'client-store', reason: '' },
  { state: 'checkoutStep', home: 'client-store', reason: '' },
];
