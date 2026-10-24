function tuple<const T extends unknown[]>(...items: T): T {
  return items;
}

function oneOf<const T extends readonly string[]>(values: T): (input: unknown) => input is T[number] {
  return (input): input is T[number] => typeof input === 'string' && values.includes(input);
}

function defineRoutes<const T extends Record<string, string>>(routes: T): T {
  return routes;
}
