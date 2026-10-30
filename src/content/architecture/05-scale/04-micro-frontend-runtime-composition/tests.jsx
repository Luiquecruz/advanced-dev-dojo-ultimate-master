const { createShell } = modules['shell.js'];
const profile = modules['microfrontends/profile.jsx'];
const checkout = modules['microfrontends/checkout.js'];

function setup() {
  const container = document.createElement('div');
  document.body.append(container);
  return { container, shell: createShell(container) };
}

function fakeMicroFrontend(text) {
  const unmount = fn();
  const mount = fn((element) => {
    element.textContent = text;
    return unmount;
  });
  return { mount, unmount };
}

function trackedProfile() {
  const tracked = { unmount: null };
  tracked.mount = (element, props) => {
    tracked.unmount = fn(profile.mount(element, props));
    return tracked.unmount;
  };
  return tracked;
}

test('navigate mounts the micro-frontend whose route matches into its own section', async () => {
  const { container, shell } = setup();
  const orders = fakeMicroFrontend('Orders app');
  shell.register('profile', { route: '/profile', load: () => Promise.resolve(profile) });
  shell.register('orders', { route: '/orders', load: () => Promise.resolve(orders) });
  await act(() => shell.navigate('/orders/42'));
  const section = container.querySelector('section[data-micro-frontend="orders"]');
  expect(section).not.toBeNull();
  expect(section).toHaveTextContent('Orders app');
  expect(orders.mount).toHaveBeenCalledWith(section, { path: '/orders/42' });
  await act(() => shell.navigate('/profile'));
  expect(within(container).getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  expect(container.querySelector('[data-micro-frontend="orders"]')).toBeNull();
  shell.destroy();
});

test('navigating away calls the unmount of the previous micro-frontend', async () => {
  const { container, shell } = setup();
  const reactProfile = trackedProfile();
  const orders = fakeMicroFrontend('Orders app');
  shell.register('profile', { route: '/profile', load: () => Promise.resolve(reactProfile) });
  shell.register('orders', { route: '/orders', load: () => Promise.resolve(orders) });
  await act(() => shell.navigate('/profile'));
  await user.click(within(container).getByRole('button', { name: 'Follow' }));
  expect(within(container).getByRole('button', { name: 'Following' })).toBeInTheDocument();
  await act(() => shell.navigate('/orders'));
  expect(reactProfile.unmount).toHaveBeenCalledTimes(1);
  expect(within(container).queryByRole('heading', { name: 'Profile' })).toBeNull();
  await act(() => shell.navigate('/profile'));
  expect(orders.unmount).toHaveBeenCalledTimes(1);
  expect(within(container).getByRole('button', { name: 'Follow' })).toBeInTheDocument();
  shell.destroy();
});

test('load() runs once per micro-frontend and the module is reused', async () => {
  const { shell } = setup();
  const orders = fakeMicroFrontend('Orders app');
  const loadOrders = fn(() => Promise.resolve(orders));
  const loadCheckout = fn(() => Promise.resolve(checkout));
  shell.register('orders', { route: '/orders', load: loadOrders });
  shell.register('checkout', { route: '/checkout', load: loadCheckout });
  await act(() => shell.navigate('/orders'));
  await act(() => shell.navigate('/checkout'));
  await act(() => shell.navigate('/orders'));
  await act(() => shell.navigate('/orders/7'));
  expect(loadOrders).toHaveBeenCalledTimes(1);
  expect(loadCheckout).toHaveBeenCalledTimes(1);
  expect(orders.mount).toHaveBeenCalledTimes(3);
  shell.destroy();
});

test('a micro-frontend that fails to load or mount shows a fallback and the shell keeps working', async () => {
  const { container, shell } = setup();
  const orders = fakeMicroFrontend('Orders app');
  shell.register('broken', {
    route: '/broken',
    load: () =>
      Promise.resolve({
        mount() {
          throw new Error('Cannot read properties of undefined');
        },
      }),
  });
  shell.register('offline', { route: '/offline', load: () => Promise.reject(new Error('Chunk failed to load')) });
  shell.register('orders', { route: '/orders', load: () => Promise.resolve(orders) });
  await act(() => shell.navigate('/broken'));
  expect(within(container).getByRole('alert')).toHaveTextContent('Failed to load broken');
  await act(() => shell.navigate('/offline'));
  expect(within(container).getByRole('alert')).toHaveTextContent('Failed to load offline');
  await act(() => shell.navigate('/orders'));
  expect(within(container).queryByRole('alert')).toBeNull();
  expect(container).toHaveTextContent('Orders app');
  shell.destroy();
});

test('a window mfe:navigate CustomEvent navigates, and destroy() stops listening and unmounts', async () => {
  const { container, shell } = setup();
  shell.register('profile', { route: '/profile', load: () => Promise.resolve(profile) });
  shell.register('checkout', { route: '/checkout', load: () => Promise.resolve(checkout) });
  await act(() => shell.navigate('/profile'));
  await user.click(within(container).getByRole('button', { name: 'Go to checkout' }));
  await waitFor(() => expect(within(container).getByRole('heading', { name: 'Checkout' })).toBeInTheDocument());
  expect(within(container).queryByRole('heading', { name: 'Profile' })).toBeNull();
  shell.destroy();
  expect(container.textContent).toBe('');
  window.dispatchEvent(new CustomEvent('mfe:navigate', { detail: { path: '/profile' } }));
  await sleep(50);
  expect(container.textContent).toBe('');
});
