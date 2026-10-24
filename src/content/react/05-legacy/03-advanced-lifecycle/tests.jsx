const spyOnRender = (ComponentClass) => {
  const spy = fn();
  const original = ComponentClass.prototype.render;
  ComponentClass.prototype.render = function render() {
    spy();
    return original.call(this);
  };
  return spy;
};

test('PriceTag renders "<currency> <price with 2 decimals>" in a <span>', () => {
  const { PriceTag } = mod;
  const { container } = render(<PriceTag price={10} currency="USD" lastChecked={1} />);
  expect(container.querySelector('span').textContent.replace(/\s+/g, ' ').trim()).toBe('USD 10.00');
});

test('PriceTag skips render when only lastChecked changes, but updates on a new price', () => {
  const { PriceTag } = mod;
  const renders = spyOnRender(PriceTag);
  const { container, rerender } = render(<PriceTag price={10} currency="USD" lastChecked={1} />);
  rerender(<PriceTag price={10} currency="USD" lastChecked={2} />);
  expect(renders).toHaveBeenCalledTimes(1);
  rerender(<PriceTag price={12.5} currency="USD" lastChecked={3} />);
  expect(renders).toHaveBeenCalledTimes(2);
  expect(container.textContent).toContain('12.50');
  rerender(<PriceTag price={12.5} currency="EUR" lastChecked={4} />);
  expect(container.textContent).toContain('EUR');
});

test('Row extends PureComponent and skips render for equal props', () => {
  const { Row } = mod;
  expect(Row.prototype.isPureReactComponent).toBe(true);
  const renders = spyOnRender(Row);
  const { rerender } = render(<ul><Row label="A" /></ul>);
  rerender(<ul><Row label="A" /></ul>);
  expect(renders).toHaveBeenCalledTimes(1);
  rerender(<ul><Row label="B" /></ul>);
  expect(screen.getByRole('listitem')).toHaveTextContent('B');
});

test('EmailEditor keeps typed text when re-rendered with the same userId', async () => {
  const { EmailEditor } = mod;
  const { rerender } = render(<EmailEditor userId={1} defaultEmail="ada@example.com" />);
  const input = screen.getByLabelText('Email');
  await user.clear(input);
  await user.type(input, 'lovelace@example.com');
  rerender(<EmailEditor userId={1} defaultEmail="ada@example.com" />);
  expect(screen.getByLabelText('Email')).toHaveValue('lovelace@example.com');
});

test('EmailEditor resets the email with getDerivedStateFromProps when userId changes', async () => {
  const { EmailEditor } = mod;
  expect(typeof EmailEditor.getDerivedStateFromProps).toBe('function');
  const { rerender } = render(<EmailEditor userId={1} defaultEmail="ada@example.com" />);
  await user.type(screen.getByLabelText('Email'), 'xyz');
  rerender(<EmailEditor userId={2} defaultEmail="alan@example.com" />);
  expect(screen.getByLabelText('Email')).toHaveValue('alan@example.com');
});
