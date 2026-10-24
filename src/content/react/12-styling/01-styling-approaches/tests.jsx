test('Button renders the default classes btn, btn-primary and btn-md without btn-block', () => {
  const { Button } = mod;
  render(<Button>Save</Button>);
  const button = screen.getByRole('button', { name: 'Save' });
  expect(button).toHaveClass('btn', 'btn-primary', 'btn-md');
  expect(button).not.toHaveClass('btn-block');
});

test('Button maps variant, size and fullWidth to classes', () => {
  const { Button } = mod;
  render(
    <Button variant="secondary" size="lg" fullWidth>
      Cancel
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Cancel' });
  expect(button).toHaveClass('btn', 'btn-secondary', 'btn-lg', 'btn-block');
  expect(button).not.toHaveClass('btn-primary');
  expect(button.className).not.toMatch(/undefined|false/);
});

test('Button appends className and forwards other props', async () => {
  const { Button } = mod;
  const onClick = fn();
  render(
    <Button className="mt-2" type="submit" onClick={onClick}>
      Send
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Send' });
  expect(button).toHaveClass('btn', 'mt-2');
  expect(button).toHaveAttribute('type', 'submit');
  await user.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('ProgressBar sets an inline width and the ARIA values', () => {
  const { ProgressBar } = mod;
  const { container } = render(<ProgressBar value={40} />);
  const bar = screen.getByRole('progressbar');
  expect(bar).toHaveClass('progress');
  expect(bar).toHaveAttribute('aria-valuenow', '40');
  expect(bar).toHaveAttribute('aria-valuemin', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '100');
  expect(container.querySelector('.progress-fill')).toHaveStyle({ width: '40%' });
});

test('ProgressBar clamps the value between 0 and 100', () => {
  const { ProgressBar } = mod;
  const { container, rerender } = render(<ProgressBar value={150} />);
  expect(container.querySelector('.progress-fill')).toHaveStyle({ width: '100%' });
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  rerender(<ProgressBar value={-5} />);
  expect(container.querySelector('.progress-fill')).toHaveStyle({ width: '0%' });
});

test('builds the class list with clsx', () => {
  expect(source).toMatch(/clsx\s*\(/);
});
