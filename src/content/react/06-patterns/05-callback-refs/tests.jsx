const contacts = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
];

test('AutoFocusInput focuses itself through a callback ref', () => {
  const { AutoFocusInput } = mod;
  render(<AutoFocusInput label="Name" />);
  expect(screen.getByLabelText('Name')).toHaveFocus();
  expect(source).not.toMatch(/useEffect|useRef/);
});

test('App focuses the search input when "Show search" is checked', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.queryByLabelText('Search')).toBeNull();
  await user.click(screen.getByRole('checkbox', { name: 'Show search' }));
  expect(screen.getByLabelText('Search')).toHaveFocus();
});

test('ContactList registers every <li> node in the registry by id', () => {
  const { ContactList } = mod;
  const registry = new Map();
  render(<ContactList contacts={contacts} registry={registry} />);
  expect(registry.size).toBe(3);
  expect(registry.get(2).tagName).toBe('LI');
  expect(registry.get(2)).toHaveTextContent('Alan Turing');
});

test('removing a contact deletes its entry from the registry', () => {
  const { ContactList } = mod;
  const registry = new Map();
  const { rerender } = render(<ContactList contacts={contacts} registry={registry} />);
  rerender(<ContactList contacts={contacts.filter((contact) => contact.id !== 2)} registry={registry} />);
  expect([...registry.keys()].sort()).toEqual([1, 3]);
  expect(registry.get(3)).toHaveTextContent('Grace Hopper');
});

test('uses a React 19 ref cleanup: unmounting empties the registry', () => {
  const { ContactList } = mod;
  const registry = new Map();
  const { unmount } = render(<ContactList contacts={contacts} registry={registry} />);
  unmount();
  expect(registry.size).toBe(0);
  expect(source).toMatch(/registry\.delete/);
  expect(source).toMatch(/return\s*\(?\s*\)?\s*=>/);
});
