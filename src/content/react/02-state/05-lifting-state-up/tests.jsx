const about = 'Almaty is the largest city in Kazakhstan.';
const etymology = 'The name comes from the Kazakh word for apple.';

test('Panel shows its content when isActive is true', () => {
  const Panel = mod.Panel;
  render(
    <Panel title="Info" isActive onShow={() => undefined}>
      Details
    </Panel>
  );
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Info');
  expect(screen.getByText('Details')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Show' })).toBeNull();
});

test('Panel is controlled: clicking "Show" calls onShow and does not open itself', async () => {
  const Panel = mod.Panel;
  const onShow = fn();
  render(
    <Panel title="Info" isActive={false} onShow={onShow}>
      Details
    </Panel>
  );
  await user.click(screen.getByRole('button', { name: 'Show' }));
  expect(onShow).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Details')).toBeNull();
});

test('Accordion opens the first panel initially', () => {
  const Accordion = mod.default;
  render(<Accordion />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Almaty, Kazakhstan');
  expect(screen.getByText(about)).toBeInTheDocument();
  expect(screen.queryByText(etymology)).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Show' })).toHaveLength(1);
});

test('opening a panel closes the other one', async () => {
  const Accordion = mod.default;
  render(<Accordion />);
  await user.click(screen.getByRole('button', { name: 'Show' }));
  expect(screen.getByText(etymology)).toBeInTheDocument();
  expect(screen.queryByText(about)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show' }));
  expect(screen.getByText(about)).toBeInTheDocument();
  expect(screen.queryByText(etymology)).toBeNull();
});

test('Panel no longer declares its own state', () => {
  const panelSource = source.slice(source.search(/function\s+Panel/), source.search(/function\s+Accordion/));
  expect(panelSource).not.toMatch(/useState/);
});
