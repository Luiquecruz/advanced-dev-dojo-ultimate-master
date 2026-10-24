function CartButtons() {
  const { addItem, clear } = mod.useCartActions();
  return (
    <>
      <button onClick={() => addItem(mod.products[0])}>Add first</button>
      <button onClick={clear}>Clear</button>
    </>
  );
}

test('adding products and signing out update the summary and the badge', async () => {
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(screen.getByTestId('cart')).toHaveTextContent('Cart: 3 items ($285)');
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.getByText('Guest')).toBeInTheDocument();
  expect(screen.getByTestId('cart')).toHaveTextContent('Cart: 3 items ($285)');
});

test('a component that only reads the user does not re-render when the cart changes', async () => {
  const { ShopProvider, CartSummary } = mod;
  const renders = fn();
  function UserReader() {
    const { user } = mod.useUser();
    renders();
    return <span>{user.name}</span>;
  }
  render(
    <ShopProvider>
      <UserReader />
      <CartSummary />
      <CartButtons />
    </ShopProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Add first' }));
  await user.click(screen.getByRole('button', { name: 'Add first' }));
  expect(screen.getByTestId('cart')).toHaveTextContent('Cart: 2 items ($240)');
  expect(renders).toHaveBeenCalledTimes(1);
});

test('components that only use cart actions do not re-render when the cart changes', async () => {
  const { ShopProvider, CartSummary } = mod;
  const renders = fn();
  function ActionsOnly() {
    mod.useCartActions();
    renders();
    return null;
  }
  render(
    <ShopProvider>
      <ActionsOnly />
      <CartSummary />
      <CartButtons />
    </ShopProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Add first' }));
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByTestId('cart')).toHaveTextContent('Cart: 0 items ($0)');
  expect(renders).toHaveBeenCalledTimes(1);
});

test('cart consumers do not re-render when the user signs out', async () => {
  const { ShopProvider, UserBadge } = mod;
  const renders = fn();
  function CartReader() {
    const { count } = mod.useCart();
    renders();
    return <span>{count}</span>;
  }
  render(
    <ShopProvider>
      <UserBadge />
      <CartReader />
    </ShopProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.getByText('Guest')).toBeInTheDocument();
  expect(renders).toHaveBeenCalledTimes(1);
});

test('when the provider re-renders for unrelated reasons, no consumer re-renders', async () => {
  const { ShopProvider } = mod;
  const renders = fn();
  const Everything = React.memo(function Everything() {
    mod.useUser();
    mod.useCart();
    mod.useCartActions();
    renders();
    return null;
  });
  function Clock() {
    const [ticks, setTicks] = React.useState(0);
    return (
      <>
        <button onClick={() => setTicks(ticks + 1)}>Tick {ticks}</button>
        <ShopProvider>
          <Everything />
        </ShopProvider>
      </>
    );
  }
  render(<Clock />);
  await user.click(screen.getByRole('button', { name: 'Tick 0' }));
  await user.click(screen.getByRole('button', { name: 'Tick 1' }));
  expect(renders).toHaveBeenCalledTimes(1);
});

test('useCartActions returns the same object across cart updates', () => {
  const { result } = renderHook(() => ({ actions: mod.useCartActions(), cart: mod.useCart() }), { wrapper: mod.ShopProvider });
  const first = result.current.actions;
  act(() => first.addItem(mod.products[2]));
  expect(result.current.cart.total).toBe(340);
  expect(result.current.actions).toBe(first);
});
