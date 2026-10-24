test('starts at "Ada: 0" with an empty history', () => {
  render(mod.default);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ada: 0');
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
});

test('adds points and records them in the history', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: '+5' }));
  await user.click(screen.getByRole('button', { name: '+1' }));
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ada: 6');
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['5', '1']);
});

test('resets the score and the history', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: '+5' }));
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ada: 0');
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: '+1' }));
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ada: 1');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('declares score with ref() and player with reactive()', () => {
  expect(source).toMatch(/score\s*=\s*ref(<[^>]*>)?\(\s*0\s*\)/);
  expect(source).toMatch(/player\s*=\s*reactive(<[^>]*>)?\(/);
});

test('does not replace the player object', () => {
  expect(source).not.toMatch(/\bplayer\s*=(?!=)[^]*\bplayer\s*=(?!=)/);
  expect(source).not.toMatch(/let\s+player\b/);
});
