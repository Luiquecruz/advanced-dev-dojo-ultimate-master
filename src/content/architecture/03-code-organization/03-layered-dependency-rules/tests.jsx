const { checkDependencies } = mod;

test('a clean graph has no violations', () => {
  const graph = {
    'app/App.jsx': ['app/providers.jsx', 'pages/home/index.js', 'shared/ui/Button.jsx'],
    'app/providers.jsx': [],
    'pages/home/index.js': ['pages/home/ui/HomePage.jsx'],
    'pages/home/ui/HomePage.jsx': ['widgets/header/index.js', 'features/cart/index.js', 'entities/product/index.ts', 'shared/lib/format.js'],
    'widgets/header/ui/Header.jsx': ['features/auth/index.jsx', 'shared/ui/Button.jsx'],
    'features/cart/ui/CartButton.jsx': ['features/cart/model/store.js', 'entities/product/index.js', 'shared/ui/Button.jsx'],
    'entities/product/model/product.js': ['entities/product/lib/price.js', 'shared/lib/format.js'],
    'shared/ui/Button.jsx': ['shared/lib/classNames.js'],
  };
  expect(checkDependencies(graph)).toEqual([]);
});

test('upward-import: a file never imports a higher layer', () => {
  const graph = {
    'entities/product/model/product.js': ['features/cart/index.js'],
    'shared/lib/api.js': ['app/config.js'],
    'widgets/header/ui/Header.jsx': ['pages/home/ui/HomePage.jsx'],
  };
  expect(checkDependencies(graph)).toEqual([
    { from: 'entities/product/model/product.js', to: 'features/cart/index.js', rule: 'upward-import' },
    { from: 'shared/lib/api.js', to: 'app/config.js', rule: 'upward-import' },
    { from: 'widgets/header/ui/Header.jsx', to: 'pages/home/ui/HomePage.jsx', rule: 'upward-import' },
  ]);
});

test('sibling-slice: two slices of the same layer never import each other, not even through the public API', () => {
  const graph = {
    'features/cart/ui/CartButton.jsx': ['features/catalog/index.js', 'features/cart/model/store.js'],
    'entities/order/model/order.js': ['entities/product/index.js'],
    'pages/home/ui/HomePage.jsx': ['pages/product/ui/ProductPage.jsx'],
  };
  expect(checkDependencies(graph)).toEqual([
    { from: 'entities/order/model/order.js', to: 'entities/product/index.js', rule: 'sibling-slice' },
    { from: 'features/cart/ui/CartButton.jsx', to: 'features/catalog/index.js', rule: 'sibling-slice' },
    { from: 'pages/home/ui/HomePage.jsx', to: 'pages/product/ui/ProductPage.jsx', rule: 'sibling-slice' },
  ]);
});

test('deep-import: another slice is reached only through its index file; shared and app are not sliced', () => {
  const graph = {
    'app/App.jsx': ['features/cart/model/store.js', 'app/router.jsx'],
    'widgets/header/ui/Header.jsx': ['features/auth/ui/LoginButton.jsx', 'features/auth/index.tsx', 'shared/ui/icons/CartIcon.jsx'],
    'features/cart/model/store.js': ['entities/product/model/types.js', 'entities/product/index.ts'],
  };
  expect(checkDependencies(graph)).toEqual([
    { from: 'app/App.jsx', to: 'features/cart/model/store.js', rule: 'deep-import' },
    { from: 'features/cart/model/store.js', to: 'entities/product/model/types.js', rule: 'deep-import' },
    { from: 'widgets/header/ui/Header.jsx', to: 'features/auth/ui/LoginButton.jsx', rule: 'deep-import' },
  ]);
});

test('reports one violation per offending import, sorted by from and then by to, without changing the graph', () => {
  const graph = {
    'shared/ui/Button.jsx': ['entities/user/index.js'],
    'features/search/ui/SearchBox.jsx': ['widgets/sidebar/index.js', 'entities/user/model/user.js', 'features/filters/index.js'],
    'app/App.jsx': ['pages/search/ui/SearchPage.jsx'],
  };
  const snapshot = JSON.stringify(graph);
  expect(checkDependencies(graph)).toEqual([
    { from: 'app/App.jsx', to: 'pages/search/ui/SearchPage.jsx', rule: 'deep-import' },
    { from: 'features/search/ui/SearchBox.jsx', to: 'entities/user/model/user.js', rule: 'deep-import' },
    { from: 'features/search/ui/SearchBox.jsx', to: 'features/filters/index.js', rule: 'sibling-slice' },
    { from: 'features/search/ui/SearchBox.jsx', to: 'widgets/sidebar/index.js', rule: 'upward-import' },
    { from: 'shared/ui/Button.jsx', to: 'entities/user/index.js', rule: 'upward-import' },
  ]);
  expect(JSON.stringify(graph)).toBe(snapshot);
});
