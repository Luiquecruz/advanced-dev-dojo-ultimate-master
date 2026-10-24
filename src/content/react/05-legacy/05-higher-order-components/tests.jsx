test('withLoading renders a "Loading..." status when isLoading is true', () => {
  const Wrapped = () => <p>Content</p>;
  const Enhanced = mod.withLoading(Wrapped);
  render(<Enhanced isLoading />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  expect(screen.queryByText('Content')).toBeNull();
});

test('withLoading forwards every prop except isLoading, including ref', () => {
  const spy = fn();
  const Field = (props) => {
    spy(props);
    return <input ref={props.ref} aria-label={props.label} />;
  };
  const Enhanced = mod.withLoading(Field);
  const ref = React.createRef();
  render(<Enhanced isLoading={false} label="Name" ref={ref} />);
  const received = spy.mock.calls[0][0];
  expect(received.label).toBe('Name');
  expect('isLoading' in received).toBe(false);
  expect(ref.current).toBe(screen.getByLabelText('Name'));
});

test('withLoading sets displayName to "WithLoading(<name>)"', () => {
  function UserList() {
    return null;
  }
  const Named = () => null;
  Named.displayName = 'FancyList';
  expect(mod.withLoading(UserList).displayName).toBe('WithLoading(UserList)');
  expect(mod.withLoading(Named).displayName).toBe('WithLoading(FancyList)');
});

test('withCurrentUser injects the context user, and an explicit currentUser prop wins', () => {
  const { withCurrentUser, UserContext } = mod;
  const Show = ({ currentUser, extra }) => (
    <p>
      {currentUser.name}-{extra}
    </p>
  );
  const Enhanced = withCurrentUser(Show);
  expect(Enhanced.displayName).toBe('WithCurrentUser(Show)');
  const { container, rerender } = render(
    <UserContext value={{ name: 'Grace Hopper' }}>
      <Enhanced extra="x" />
    </UserContext>,
  );
  expect(container.textContent).toBe('Grace Hopper-x');
  rerender(
    <UserContext value={{ name: 'Grace Hopper' }}>
      <Enhanced extra="y" currentUser={{ name: 'Linus Torvalds' }} />
    </UserContext>,
  );
  expect(container.textContent).toBe('Linus Torvalds-y');
});

test('Greeting composes both HOCs', () => {
  const { Greeting, UserContext } = mod;
  expect(Greeting.displayName).toBe('WithCurrentUser(WithLoading(GreetingView))');
  const { rerender } = render(
    <UserContext value={{ name: 'Margaret Hamilton' }}>
      <Greeting isLoading />
    </UserContext>,
  );
  expect(screen.getByRole('status')).toBeInTheDocument();
  rerender(
    <UserContext value={{ name: 'Margaret Hamilton' }}>
      <Greeting isLoading={false} />
    </UserContext>,
  );
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Hello, Margaret Hamilton');
});
