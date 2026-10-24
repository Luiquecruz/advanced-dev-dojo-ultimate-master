// TODO: add const type parameters so callers do not need `as const`

function tuple<T extends unknown[]>(...items: T): T {
  return items;
}

function oneOf<T extends readonly string[]>(values: T): (input: unknown) => input is T[number] {
  // TODO: return true only for strings included in values
  return (input): input is T[number] => false;
}

function defineRoutes<T extends Record<string, string>>(routes: T): T {
  return routes;
}
