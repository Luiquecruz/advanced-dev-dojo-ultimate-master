const RENDERING_BY_FRESHNESS = {
  never: 'static',
  day: 'ssg',
  hour: 'isr',
  request: 'ssr',
};

function resolveRoute(route, briefing) {
  // TODO: a field missing on the route falls back to the briefing field with the same name
  return route;
}

function chooseRendering(route) {
  // TODO: no SEO → spa; SEO + personalized → ssr; otherwise RENDERING_BY_FRESHNESS[route.dataChangesEvery]
  return { choice: 'ssr', because: 'every route is rendered on the server' };
}

function chooseOrganization(briefing) {
  // TODO: micro-frontends only with several teams AND independent deploys; several teams → modular-monolith
  return { choice: 'micro-frontends', because: 'it scales to any number of teams' };
}

function chooseDomain(briefing) {
  // TODO: complex business rules → hexagonal, otherwise in-components
  return { choice: 'hexagonal', because: 'a domain layer is always cleaner' };
}

function chooseState(renderings) {
  // TODO: 'local' always, 'server-cache' when a route is spa, 'embedded-data' when a route is ssg, isr or ssr
  return { choice: ['local', 'global-store'], because: 'one store holds everything' };
}

function chooseBackendForFrontend(briefing) {
  // TODO: true only when more than one kind of client consumes the backend
  return { choice: true, because: 'every product deserves a BFF' };
}

function reason(subject, decision) {
  // TODO: format "<subject>: <choice> because <why>" (an array choice is joined with ", ")
  return decision.because;
}

export function recommendArchitecture(briefing) {
  const routeDecisions = briefing.routes.map((route) => {
    const resolvedRoute = resolveRoute(route, briefing);
    return { path: resolvedRoute.path, decision: chooseRendering(resolvedRoute) };
  });
  const organization = chooseOrganization(briefing);
  const domain = chooseDomain(briefing);
  const state = chooseState(routeDecisions.map((routeDecision) => routeDecision.decision.choice));
  const backendForFrontend = chooseBackendForFrontend(briefing);

  return {
    rendering: Object.fromEntries(routeDecisions.map((routeDecision) => [routeDecision.path, routeDecision.decision.choice])),
    organization: organization.choice,
    domain: domain.choice,
    state: state.choice,
    bff: backendForFrontend.choice,
    reasons: [
      ...routeDecisions.map((routeDecision) => reason(routeDecision.path, routeDecision.decision)),
      reason('organization', organization),
      reason('domain', domain),
      reason('state', state),
      reason('bff', backendForFrontend),
    ],
  };
}
