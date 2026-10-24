test('Card renders its title in an <h2>', () => {
  const { Card } = modules['Card.jsx'];
  render(<Card title="Stats" />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Stats');
});

test('Card renders any children inside .card-body', () => {
  const { Card } = modules['Card.jsx'];
  const { container } = render(
    <Card title="Stats">
      <strong>42</strong>
      <em>points</em>
    </Card>
  );
  const body = container.querySelector('section.card > .card-body');
  expect(body).toBeInTheDocument();
  expect(body.querySelector('strong')).toHaveTextContent('42');
  expect(body.querySelector('em')).toHaveTextContent('points');
});

test('Layout renders the sidebar prop in <aside> and children in <main>', () => {
  const { Layout } = modules['Layout.jsx'];
  const { container } = render(
    <Layout sidebar={<span>Links</span>}>
      <h1>Page</h1>
    </Layout>
  );
  expect(container.querySelector('.layout > aside')).toHaveTextContent('Links');
  expect(container.querySelector('.layout > main h1')).toHaveTextContent('Page');
});

test('App passes a <nav> as the sidebar', () => {
  const App = mod.default;
  const { container } = render(<App />);
  expect(container.querySelector('aside > nav')).toHaveTextContent('Menu');
});

test('App renders the Welcome card with its paragraph inside <main>', () => {
  const App = mod.default;
  const { container } = render(<App />);
  expect(within(container.querySelector('main')).getByRole('heading', { level: 2 })).toHaveTextContent('Welcome');
  expect(container.querySelector('main .card-body p')).toHaveTextContent('Glad to see you here.');
});
