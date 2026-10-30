const IMPORT_PATTERN = /(?:from|import)\s*['"]([^'"]+)['"]/g;

function importsOf(fileName) {
  return [...sources[fileName].matchAll(IMPORT_PATTERN)].map((match) => match[1]);
}

function resolveImport(fileName, specifier) {
  if (!specifier.startsWith('.')) return null;
  const segments = fileName.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '..') segments.pop();
    else if (part && part !== '.') segments.push(part);
  }
  return segments.join('/');
}

function featureOf(path) {
  const match = path.match(/^features\/([^/]+)(?:\/(.*))?$/);
  return match ? { name: match[1], rest: match[2] ?? '' } : null;
}

function isPublicApi(rest) {
  return rest === '' || /^index(\.jsx?)?$/.test(rest);
}

function crossFeatureDeepImports(fileName) {
  const ownFeature = featureOf(fileName)?.name;
  return importsOf(fileName)
    .map((specifier) => resolveImport(fileName, specifier))
    .filter(Boolean)
    .filter((target) => {
      const feature = featureOf(target);
      return feature && feature.name !== ownFeature && !isPublicApi(feature.rest);
    })
    .map((target) => `${fileName} -> ${target}`);
}

test('the shop still works: adding products updates the cart badge', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByTestId('cart-badge')).toHaveTextContent('Cart: 0 · $0.00');
  await user.click(await screen.findByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(screen.getByTestId('cart-badge')).toHaveTextContent('Cart: 2 · $165.00');
  expect(within(screen.getByRole('list', { name: 'Products' })).getByText(/Monitor \$340\.00/)).toBeInTheDocument();
});

test('App.jsx imports the catalog and cart features only through their public APIs', () => {
  expect(crossFeatureDeepImports('App.jsx')).toEqual([]);
  const targets = importsOf('App.jsx').map((specifier) => resolveImport('App.jsx', specifier));
  expect(targets.some((target) => /^features\/catalog(\/index(\.js)?)?$/.test(target))).toBe(true);
  expect(targets.some((target) => /^features\/cart(\/index(\.js)?)?$/.test(target))).toBe(true);
});

test('a feature imports another feature only through its index, never its internals', () => {
  const featureFiles = Object.keys(sources).filter((fileName) => fileName.startsWith('features/'));
  expect(featureFiles.flatMap(crossFeatureDeepImports)).toEqual([]);
  const catalogImports = importsOf('features/catalog/components/ProductList.jsx').map((specifier) =>
    resolveImport('features/catalog/components/ProductList.jsx', specifier),
  );
  expect(catalogImports.some((target) => /^features\/cart(\/index(\.js)?)?$/.test(target))).toBe(true);
});

test('each public API exports exactly its named list and does not leak internals', () => {
  expect(Object.keys(modules['features/catalog/index.js']).sort()).toEqual(['ProductList']);
  expect(Object.keys(modules['features/cart/index.js']).sort()).toEqual(['CartBadge', 'CartProvider', 'useCart']);
  expect(sources['features/catalog/index.js']).not.toMatch(/export\s*\*/);
  expect(sources['features/cart/index.js']).not.toMatch(/export\s*\*/);
});

test('formatPrice lives once in shared/lib, and shared never imports features', () => {
  expect(modules['shared/lib/formatPrice.js'].formatPrice(45)).toBe('$45.00');
  expect(modules['shared/lib/formatPrice.js'].formatPrice(1234.5)).toBe('$1234.50');
  const featureFiles = Object.keys(sources).filter((fileName) => fileName.startsWith('features/'));
  const duplicates = featureFiles.filter((fileName) => /function\s+formatPrice|formatPrice\s*=/.test(sources[fileName]));
  expect(duplicates).toEqual([]);
  const sharedFiles = Object.keys(sources).filter((fileName) => fileName.startsWith('shared/'));
  const sharedToFeatures = sharedFiles.filter((fileName) => importsOf(fileName).some((specifier) => /features\//.test(specifier)));
  expect(sharedToFeatures).toEqual([]);
});
