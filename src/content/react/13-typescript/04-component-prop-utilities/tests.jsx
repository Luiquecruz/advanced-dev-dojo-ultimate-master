test('Button forwards native props, defaults type="button" and builds the className', async () => {
  const { Button } = mod;
  const onClick = fn();
  render(
    <Button onClick={onClick} aria-describedby="hint" data-testid="save">
      Save
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Save' });
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toHaveAttribute('aria-describedby', 'hint');
  expect(button.className).toBe('btn btn-primary');
  await user.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('Button supports variant, extra className, disabled, type override and ref', () => {
  const { Button } = mod;
  const ref = React.createRef();
  render(
    <Button ref={ref} variant="ghost" className="wide" type="submit" disabled>
      Go
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Go' });
  expect(button.className).toBe('btn btn-ghost wide');
  expect(button).toHaveAttribute('type', 'submit');
  expect(button).toBeDisabled();
  expect(ref.current).toBe(button);
});

test('IconButton renders an accessible Button with the icon and passes props through', async () => {
  const { IconButton } = mod;
  const onClick = fn();
  render(<IconButton icon="★" label="Add to favorites" variant="ghost" onClick={onClick} />);
  const button = screen.getByRole('button', { name: 'Add to favorites' });
  expect(button).toHaveTextContent('★');
  expect(button.className).toBe('btn btn-ghost');
  await user.click(button);
  expect(onClick).toHaveBeenCalled();
});

test('Alert shows "Dismiss" only when dismissible, and Panel renders title and children', async () => {
  const { Alert, Panel } = mod;
  const onDismiss = fn();
  render(
    <Panel title="Notices">
      <Alert message="Read only" />
      <Alert message="Saved" dismissible onDismiss={onDismiss} />
    </Panel>,
  );
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Notices');
  const alerts = screen.getAllByRole('alert');
  expect(within(alerts[0]).queryByRole('button')).toBeNull();
  await user.click(within(alerts[1]).getByRole('button', { name: 'Dismiss' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('uses ComponentProps, Omit, PropsWithChildren and discriminated props', () => {
  expect(source).toMatch(/ComponentProps(WithRef)?<\s*['"]button['"]\s*>/);
  expect(source).toMatch(/Omit<\s*ComponentProps<\s*typeof\s+Button\s*>\s*,\s*['"]children['"]\s*>/);
  expect(source).toMatch(/PropsWithChildren<\s*\{\s*title\s*:\s*string;?\s*\}\s*>/);
  expect(source).toMatch(/dismissible\s*:\s*true/);
  expect(source).toMatch(/dismissible\?\s*:\s*false/);
  expect(source).toMatch(/onDismiss\?\s*:\s*never/);
  expect(source).not.toMatch(/:\s*any\b/);
});
