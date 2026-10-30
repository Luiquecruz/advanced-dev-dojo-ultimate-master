const { Shell } = modules['shell/Shell.jsx'];
const { createShell } = modules['shell/createShell.js'];

function importSpecifiers(code) {
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;
  return [...code.matchAll(pattern)].map((match) => match[1]);
}

function resolveFrom(fileName, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
  const segments = specifier.startsWith('/') ? [] : fileName.split('/').slice(0, -1);
  specifier.split('/').forEach((segment) => {
    if (segment === '..') segments.pop();
    else if (segment && segment !== '.') segments.push(segment);
  });
  return segments.join('/');
}

function navigation() {
  return within(screen.getByRole('navigation', { name: 'Modules' }));
}

test('every module adds its page through register(shell) and the nav lists them all', () => {
  ['catalog', 'cart', 'account'].forEach((name) => {
    const shell = createShell();
    modules[`modules/${name}/index.js`].register(shell);
    expect(shell.pages).toHaveLength(1);
    expect(shell.pages[0].path).toBe(`/${name}`);
  });
  render(<mod.default />);
  const titles = navigation().getAllByRole('button').map((button) => button.textContent);
  expect(titles).toEqual(['Catalog', 'Cart', 'Account']);
});

test('navigating renders the page of the selected module', async () => {
  render(<mod.default />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Catalog');
  await user.click(navigation().getByRole('button', { name: 'Account' }));
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Account');
  expect(navigation().getByRole('button', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('Signed in as Ada Lovelace')).toBeInTheDocument();
});

test('adding from the catalog emits cart:add and the cart module counts it', async () => {
  const shell = mod.createApp();
  const received = fn();
  shell.events.on('cart:add', received);
  render(<Shell shell={shell} />);
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(received).toHaveBeenCalledTimes(3);
  expect(received).toHaveBeenLastCalledWith({ id: 2, name: 'Mouse', price: 45 });
  await user.click(navigation().getByRole('button', { name: 'Cart' }));
  expect(screen.getByTestId('cart-count')).toHaveTextContent('Items: 3');
  expect(screen.getByRole('list', { name: 'Cart lines' })).toHaveTextContent('Keyboard × 2');
});

test('each app instance gets its own cart: module state is created in register, not at import time', async () => {
  const first = mod.createApp();
  const second = mod.createApp();
  first.events.emit('cart:add', { id: 1, name: 'Keyboard', price: 120 });
  render(<Shell shell={second} />);
  await user.click(navigation().getByRole('button', { name: 'Cart' }));
  expect(screen.getByTestId('cart-count')).toHaveTextContent('Items: 0');
});

test('no module imports another module', () => {
  const violations = [];
  Object.keys(sources)
    .filter((fileName) => fileName.startsWith('modules/'))
    .forEach((fileName) => {
      const owner = fileName.split('/')[1];
      importSpecifiers(sources[fileName]).forEach((specifier) => {
        const target = resolveFrom(fileName, specifier);
        if (target && target.startsWith('modules/') && target.split('/')[1] !== owner) {
          violations.push(`${fileName} -> ${specifier}`);
        }
      });
    });
  expect(violations).toEqual([]);
});

test('the composition root and the shell import modules only through their public index', () => {
  const violations = [];
  Object.keys(sources)
    .filter((fileName) => !fileName.startsWith('modules/'))
    .forEach((fileName) => {
      importSpecifiers(sources[fileName]).forEach((specifier) => {
        const target = resolveFrom(fileName, specifier);
        if (target && target.startsWith('modules/') && !/^modules\/[^/]+(\/index(\.js)?)?$/.test(target)) {
          violations.push(`${fileName} -> ${specifier}`);
        }
      });
    });
  expect(violations).toEqual([]);
});
