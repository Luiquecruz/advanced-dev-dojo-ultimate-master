const RENDERING_BY_FRESHNESS = {
  never: 'static',
  day: 'ssg',
  hour: 'isr',
  request: 'ssr',
};

const FRESHNESS_LABELS = {
  never: 'never changes',
  day: 'changes daily',
  hour: 'changes hourly',
  request: 'changes on every request',
};

const SERVER_RENDERINGS = ['ssg', 'isr', 'ssr'];

function resolveRoute(route, briefing) {
  return {
    path: route.path,
    seo: route.seo ?? briefing.seo,
    personalized: route.personalized ?? briefing.personalized,
    dataChangesEvery: route.dataChangesEvery ?? briefing.dataChangesEvery,
  };
}

function chooseRendering(route) {
  if (!route.seo) {
    return { choice: 'spa', because: 'it needs no indexing, so the browser renders it and no server is needed' };
  }
  if (route.personalized) {
    return { choice: 'ssr', because: 'it must be indexed and its HTML differs per user, so it renders per request' };
  }
  return {
    choice: RENDERING_BY_FRESHNESS[route.dataChangesEvery],
    because: `it must be indexed, is shared by every visitor and its data ${FRESHNESS_LABELS[route.dataChangesEvery]}`,
  };
}

function chooseOrganization(briefing) {
  if (briefing.teams > 1 && briefing.independentDeploys) {
    return { choice: 'micro-frontends', because: `${briefing.teams} teams need independent deploys` };
  }
  if (briefing.teams > 1) {
    return { choice: 'modular-monolith', because: `${briefing.teams} teams need module ownership but can release together` };
  }
  return { choice: 'feature-folders', because: 'one team ships one deploy, so micro-frontends and module boundaries would only add cost' };
}

function chooseDomain(briefing) {
  if (briefing.complexDomainRules) {
    return { choice: 'hexagonal', because: 'complex business rules must be tested without React or the network' };
  }
  return { choice: 'in-components', because: 'the rules are simple enough to live in components and hooks' };
}

function chooseState(renderings) {
  const homes = ['local'];
  if (renderings.includes('spa')) {
    homes.push('server-cache');
  }
  if (renderings.some((rendering) => SERVER_RENDERINGS.includes(rendering))) {
    homes.push('embedded-data');
  }
  return {
    choice: homes,
    because: 'UI state stays local, client-rendered routes cache server data and server-rendered routes embed it for hydration',
  };
}

function chooseBackendForFrontend(briefing) {
  const clientKinds = new Set(briefing.clients);
  if (clientKinds.size > 1) {
    return { choice: true, because: `${clientKinds.size} kinds of client need differently shaped payloads` };
  }
  return { choice: false, because: 'a single client can call the API directly' };
}

function reason(subject, decision) {
  const choice = Array.isArray(decision.choice) ? decision.choice.join(', ') : String(decision.choice);
  return `${subject}: ${choice} because ${decision.because}`;
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
