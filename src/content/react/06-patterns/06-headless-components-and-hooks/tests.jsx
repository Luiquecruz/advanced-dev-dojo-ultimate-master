test('useDisclosure exposes isOpen with open, close and toggle', () => {
  const { result } = renderHook(() => mod.useDisclosure());
  expect(result.current.isOpen).toBe(false);
  act(() => result.current.open());
  expect(result.current.isOpen).toBe(true);
  act(() => result.current.toggle());
  expect(result.current.isOpen).toBe(false);
  act(() => result.current.toggle());
  act(() => result.current.close());
  expect(result.current.isOpen).toBe(false);
});

test('useDisclosure honors defaultOpen', () => {
  const { result } = renderHook(() => mod.useDisclosure({ defaultOpen: true }));
  expect(result.current.isOpen).toBe(true);
  expect(result.current.getPanelProps().hidden).toBe(false);
});

test('prop getters wire aria-expanded, aria-controls and a useId panel id', () => {
  const { result } = renderHook(() => mod.useDisclosure());
  const button = result.current.getButtonProps();
  const panel = result.current.getPanelProps();
  expect(button.type).toBe('button');
  expect(button['aria-expanded']).toBe(false);
  expect(typeof panel.id).toBe('string');
  expect(panel.id.length).toBeGreaterThan(0);
  expect(button['aria-controls']).toBe(panel.id);
  expect(panel.hidden).toBe(true);
  expect(source).toMatch(/useId\(/);
});

test('getButtonProps keeps user props and composes the user onClick', async () => {
  const { useDisclosure } = mod;
  const onClick = fn();
  function Custom() {
    const { isOpen, getButtonProps, getPanelProps } = useDisclosure();
    return (
      <div>
        <button {...getButtonProps({ className: 'trigger', onClick })}>Toggle</button>
        <div {...getPanelProps({ className: 'panel' })}>Panel {String(isOpen)}</div>
      </div>
    );
  }
  const { container } = render(<Custom />);
  const button = screen.getByRole('button', { name: 'Toggle' });
  expect(button).toHaveClass('trigger');
  expect(container.querySelector('.panel')).toBeInTheDocument();
  await user.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.panel')).toHaveTextContent('Panel true');
});

test('FaqItem reveals the answer and updates aria-expanded', async () => {
  const FaqItem = mod.default;
  render(<FaqItem question="Why headless?" answer="Reuse behavior, own the markup." />);
  const button = screen.getByRole('button', { name: 'Why headless?' });
  const answer = screen.getByText('Reuse behavior, own the markup.');
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(answer).toHaveAttribute('hidden');
  await user.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(answer).not.toHaveAttribute('hidden');
  expect(button).toHaveAttribute('aria-controls', answer.id);
});
