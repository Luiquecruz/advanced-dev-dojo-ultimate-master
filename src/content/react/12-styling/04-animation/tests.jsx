function stubReducedMotion(matches) {
  const listeners = new Set();
  const media = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener),
  };
  const matchMedia = fn(() => media);
  window.matchMedia = matchMedia;
  return {
    matchMedia,
    change(next) {
      media.matches = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
  };
}

function finishAnimation(element) {
  act(() => {
    ['animationend', 'webkitAnimationEnd'].forEach((type) => element.dispatchEvent(new Event(type, { bubbles: true })));
  });
}

test('usePrefersReducedMotion reads the reduced-motion media query and follows changes', () => {
  const stub = stubReducedMotion(true);
  const { result } = renderHook(() => mod.usePrefersReducedMotion());
  expect(result.current).toBe(true);
  expect(stub.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  act(() => stub.change(false));
  expect(result.current).toBe(false);
});

test('an open panel has data-state="open" and the fade-in class', () => {
  stubReducedMotion(false);
  const { FadePanel } = mod;
  render(<FadePanel open>Details</FadePanel>);
  const panel = screen.getByText('Details');
  expect(panel).toHaveAttribute('data-state', 'open');
  expect(panel).toHaveClass('fade-in');
});

test('closing keeps the panel mounted with fade-out until animationend fires', () => {
  stubReducedMotion(false);
  const { FadePanel } = mod;
  const { rerender } = render(<FadePanel open>Details</FadePanel>);
  rerender(<FadePanel open={false}>Details</FadePanel>);
  const panel = screen.getByText('Details');
  expect(panel).toHaveAttribute('data-state', 'closed');
  expect(panel).toHaveClass('fade-out');
  finishAnimation(panel);
  expect(screen.queryByText('Details')).toBeNull();
});

test('reopening during the exit animation returns to the open state', () => {
  stubReducedMotion(false);
  const { FadePanel } = mod;
  const { rerender } = render(<FadePanel open>Details</FadePanel>);
  rerender(<FadePanel open={false}>Details</FadePanel>);
  rerender(<FadePanel open>Details</FadePanel>);
  const panel = screen.getByText('Details');
  expect(panel).toHaveAttribute('data-state', 'open');
  finishAnimation(panel);
  expect(screen.getByText('Details')).toBeInTheDocument();
});

test('with reduced motion, closing removes the panel immediately', () => {
  stubReducedMotion(true);
  const { FadePanel } = mod;
  const { rerender } = render(<FadePanel open>Details</FadePanel>);
  rerender(<FadePanel open={false}>Details</FadePanel>);
  expect(screen.queryByText('Details')).toBeNull();
});

test('renders nothing when it starts closed', () => {
  stubReducedMotion(false);
  const { FadePanel } = mod;
  const { container } = render(<FadePanel open={false}>Details</FadePanel>);
  expect(container.innerHTML).toBe('');
});
