const users = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
];

test('List renders each item with renderItem inside an <li>', () => {
  const { List } = mod;
  render(<List items={users} getKey={(user) => user.id} renderItem={(user) => <strong>{user.name}</strong>} />);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(items[1].querySelector('strong')).toHaveTextContent('Alan Turing');
});

test('List renders emptyText (default "No items") when there are no items', () => {
  const { List } = mod;
  const { rerender } = render(<List items={[]} getKey={(item) => item} renderItem={(item) => item} />);
  expect(screen.queryByRole('list')).toBeNull();
  expect(screen.getByText('No items')).toBeInTheDocument();
  rerender(<List items={[]} getKey={(item) => item} renderItem={(item) => item} emptyText="Nothing here" />);
  expect(screen.getByText('Nothing here')).toBeInTheDocument();
});

test('Select renders labelled options and calls onChange with the original object', async () => {
  const { Select } = mod;
  const onChange = fn();
  render(
    <Select
      label="Person"
      options={users}
      value={users[0]}
      getLabel={(user) => user.name}
      getValue={(user) => String(user.id)}
      onChange={onChange}
    />,
  );
  const select = screen.getByLabelText(/Person/);
  expect(select).toHaveValue('1');
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Ada Lovelace', 'Alan Turing']);
  await user.selectOptions(select, '2');
  expect(onChange).toHaveBeenCalledWith(users[1]);
  expect(onChange.mock.calls[0][0]).toBe(users[1]);
});

test('App selects a product through the generic Select', async () => {
  const App = mod.default;
  render(<App />);
  await user.selectOptions(screen.getByLabelText(/Product/), '3');
  expect(screen.getByText('Selected: Monitor')).toBeInTheDocument();
  expect(screen.getByText('Mouse: $45')).toBeInTheDocument();
});

test('declares generic props and components', () => {
  expect(source).toMatch(/(interface\s+ListProps<\s*T\s*>|type\s+ListProps<\s*T\s*>\s*=)/);
  expect(source).toMatch(/items\??\s*:\s*(readonly\s+)?T\[\]/);
  expect(source).toMatch(/renderItem\s*:\s*\(\s*\w+\s*:\s*T\s*\)\s*=>\s*(React\.)?ReactNode/);
  expect(source).toMatch(/function\s+List<\s*T|List\s*=\s*<\s*T\s*,/);
  expect(source).toMatch(/:\s*ListProps<\s*T\s*>/);
  expect(source).toMatch(/function\s+Select<\s*T|Select\s*=\s*<\s*T\s*,/);
  expect(source).toMatch(/onChange\s*:\s*\(\s*\w+\s*:\s*T\s*\)\s*=>\s*void/);
  expect(source).not.toMatch(/:\s*any\b/);
});
