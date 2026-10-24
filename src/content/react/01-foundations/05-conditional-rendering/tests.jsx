const text = (element) => element.textContent.replace(/\s+/g, ' ').trim();

test('shows only "Please sign in." when logged out', () => {
  const Inbox = mod.default;
  const { container } = render(<Inbox isLoggedIn={false} messages={['Hi']} />);
  expect(text(container)).toBe('Please sign in.');
  expect(container.querySelector('section')).toBeNull();
});

test('shows "No new messages" and no stray 0 when the inbox is empty', () => {
  const Inbox = mod.default;
  const { container } = render(<Inbox isLoggedIn messages={[]} />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Inbox');
  expect(screen.getByText('No new messages')).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/\d/);
});

test('uses the singular for exactly one message', () => {
  const Inbox = mod.default;
  const { container } = render(<Inbox isLoggedIn messages={['Hello']} />);
  const paragraph = container.querySelector('section > p');
  expect(text(paragraph)).toBe('You have 1 unread message');
});

test('uses the plural for several messages', () => {
  const Inbox = mod.default;
  const { container } = render(<Inbox isLoggedIn messages={['a', 'b', 'c']} />);
  const paragraph = container.querySelector('section > p');
  expect(text(paragraph)).toBe('You have 3 unread messages');
});

test('renders the badge only when there are messages', () => {
  const Inbox = mod.default;
  const { container, rerender } = render(<Inbox isLoggedIn messages={[]} />);
  expect(container.querySelector('.badge')).toBeNull();
  rerender(<Inbox isLoggedIn messages={['a', 'b']} />);
  expect(container.querySelector('h2 > .badge')).toHaveTextContent('2');
});
