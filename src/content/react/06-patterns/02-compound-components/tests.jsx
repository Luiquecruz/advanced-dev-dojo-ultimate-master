test('shows the defaultValue panel and marks its tab as selected', () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Profile settings');
  expect(screen.queryByText('Billing settings')).toBeNull();
});

test('clicking a tab switches the visible panel', async () => {
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('tab', { name: 'Billing' }));
  expect(screen.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Billing settings');
});

test('calls onChange with the selected value', async () => {
  const { Tabs } = mod;
  const onChange = fn();
  render(
    <Tabs defaultValue="a" onChange={onChange}>
      <Tabs.List>
        <Tabs.Tab value="a">A</Tabs.Tab>
        <Tabs.Tab value="b">B</Tabs.Tab>
      </Tabs.List>
    </Tabs>,
  );
  await user.click(screen.getByRole('tab', { name: 'B' }));
  expect(onChange).toHaveBeenCalledWith('b');
});

test('parts work at any nesting depth (context, not cloneElement)', async () => {
  const { Tabs } = mod;
  const Section = ({ children }) => (
    <section>
      <div>{children}</div>
    </section>
  );
  render(
    <Tabs defaultValue="one">
      <Section>
        <Tabs.List aria-label="Nested">
          <span>
            <Tabs.Tab value="one">One</Tabs.Tab>
          </span>
          <span>
            <Tabs.Tab value="two">Two</Tabs.Tab>
          </span>
        </Tabs.List>
      </Section>
      <Section>
        <Tabs.Panel value="one">First</Tabs.Panel>
        <Tabs.Panel value="two">Second</Tabs.Panel>
      </Section>
    </Tabs>,
  );
  await user.click(screen.getByRole('tab', { name: 'Two' }));
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Second');
  expect(source).not.toMatch(/cloneElement/);
});

test('Tabs.Tab outside <Tabs> throws a helpful error', () => {
  const { Tabs } = mod;
  const original = console.error;
  console.error = () => {};
  try {
    expect(() => render(<Tabs.Tab value="x">X</Tabs.Tab>)).toThrow('must be used inside <Tabs>');
  } finally {
    console.error = original;
  }
});
