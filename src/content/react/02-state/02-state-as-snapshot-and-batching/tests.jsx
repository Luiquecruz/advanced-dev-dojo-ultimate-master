const score = () => screen.getByText(/^Score:/).textContent.replace(/\s+/g, ' ').trim();

test('"+1" adds one point', async () => {
  const ScoreBoard = mod.default;
  render(<ScoreBoard />);
  await user.click(screen.getByRole('button', { name: '+1' }));
  expect(score()).toBe('Score: 1');
});

test('"+3" adds three points', async () => {
  const ScoreBoard = mod.default;
  render(<ScoreBoard />);
  await user.click(screen.getByRole('button', { name: '+3' }));
  expect(score()).toBe('Score: 3');
});

test('"+3" keeps adding on top of the current score', async () => {
  const ScoreBoard = mod.default;
  render(<ScoreBoard />);
  await user.click(screen.getByRole('button', { name: '+1' }));
  await user.click(screen.getByRole('button', { name: '+3' }));
  await user.click(screen.getByRole('button', { name: '+3' }));
  expect(score()).toBe('Score: 7');
});

test('two quick "Bonus later" clicks add 2 after the timers finish', async () => {
  const ScoreBoard = mod.default;
  render(<ScoreBoard />);
  const bonus = screen.getByRole('button', { name: 'Bonus later' });
  await user.click(bonus);
  await user.click(bonus);
  expect(score()).toBe('Score: 0');
  await act(() => sleep(200));
  expect(score()).toBe('Score: 2');
});

test('a bonus is applied on top of points added while it was pending', async () => {
  const ScoreBoard = mod.default;
  render(<ScoreBoard />);
  await user.click(screen.getByRole('button', { name: 'Bonus later' }));
  await user.click(screen.getByRole('button', { name: '+3' }));
  await act(() => sleep(200));
  expect(score()).toBe('Score: 4');
});

test('uses updater functions', () => {
  const updaters = source.match(/setScore\s*\(\s*\(?\s*\w+\s*\)?\s*=>/g) ?? [];
  expect(updaters.length).toBeGreaterThanOrEqual(2);
});
