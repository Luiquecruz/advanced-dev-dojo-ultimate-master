export const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

const SLICED_LAYERS = new Set(['pages', 'widgets', 'features', 'entities']);
const PUBLIC_API_FILE = /^index\.(js|jsx|ts|tsx)$/;

export function describeFile(path) {
  const [layer, ...rest] = path.split('/');
  if (!SLICED_LAYERS.has(layer)) {
    return { layer, slice: null, rest: rest.join('/') };
  }
  const [slice, ...inner] = rest;
  return { layer, slice, rest: inner.join('/') };
}

function ruleFor(from, to) {
  const source = describeFile(from);
  const target = describeFile(to);
  if (LAYERS.indexOf(target.layer) < LAYERS.indexOf(source.layer)) {
    return 'upward-import';
  }
  if (target.slice === null) {
    return null;
  }
  if (source.layer === target.layer) {
    return source.slice === target.slice ? null : 'sibling-slice';
  }
  return PUBLIC_API_FILE.test(target.rest) ? null : 'deep-import';
}

function compareViolations(first, second) {
  if (first.from !== second.from) {
    return first.from < second.from ? -1 : 1;
  }
  if (first.to !== second.to) {
    return first.to < second.to ? -1 : 1;
  }
  return 0;
}

export function checkDependencies(graph) {
  return Object.entries(graph)
    .flatMap(([from, imports]) => imports.map((to) => ({ from, to, rule: ruleFor(from, to) })))
    .filter((violation) => violation.rule !== null)
    .sort(compareViolations);
}
