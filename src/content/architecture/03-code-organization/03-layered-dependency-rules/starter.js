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
  // TODO: return 'upward-import', 'sibling-slice', 'deep-import' or null, checking the rules in that order
  return null;
}

export function checkDependencies(graph) {
  // TODO: turn every import of the graph into { from, to, rule }, keep only the violations and sort them by from, then to
  return [];
}
