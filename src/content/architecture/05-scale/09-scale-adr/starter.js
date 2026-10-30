export const adr = {
  id: 1,
  // TODO: a short imperative title
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'scale',
  // TODO: describe the teams, the deploy cadence, the incident and how coupled changes are
  context: '',
  // TODO: one sentence starting with "We will" that names the topology and how boundaries are enforced
  decision: '',
  // TODO: at least two { option, reason }, including micro-frontends with the briefing numbers
  alternatives: [],
  // TODO: what the teams gain and what they pay
  consequences: { positive: [], negative: [] },
};

export const plan = {
  // TODO: 'monolith', 'modular-monolith', 'monorepo' or 'micro-frontends'
  topology: '',
  // TODO: give search, booking, payments and account an owning team
  modules: [],
  // TODO: signals that would make the team reconsider
  revisitWhen: [],
};
