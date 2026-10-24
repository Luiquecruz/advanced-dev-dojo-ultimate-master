test('renders the name in an <h2>', async () => {
  await render(mod.ProfileCard);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ada Lovelace');
});

test('binds the image src and alt', async () => {
  const { component, stable } = await render(mod.ProfileCard);
  const image = screen.getByRole('img');
  expect(image.getAttribute('src')).toBe('/avatars/ada.png');
  expect(image).toHaveAttribute('alt', 'Ada Lovelace avatar');
  component.name.set('Grace Hopper');
  await stable();
  expect(screen.getByRole('img')).toHaveAttribute('alt', 'Grace Hopper avatar');
});

test('toggles the "online" class and the status text', async () => {
  const { component, element, stable } = await render(mod.ProfileCard);
  const card = element.querySelector('article');
  expect(card).toHaveClass('card');
  expect(card).toHaveClass('online');
  expect(element.querySelector('.status')).toHaveTextContent('Online');
  component.isOnline.set(false);
  await stable();
  expect(card).not.toHaveClass('online');
  expect(card).toHaveClass('card');
  expect(element.querySelector('.status')).toHaveTextContent('Offline');
});

test('binds aria-valuenow and the bar width to progress', async () => {
  const { component, element, stable } = await render(mod.ProfileCard);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  expect((element.querySelector('.bar') as HTMLElement).style.width).toBe('40%');
  component.progress.set(75);
  await stable();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  expect((element.querySelector('.bar') as HTMLElement).style.width).toBe('75%');
});

test('uses property, attribute, class and style bindings', () => {
  expect(source).toMatch(/\[src\]\s*=/);
  expect(source).toMatch(/\[attr\.aria-valuenow\]\s*=/);
  expect(source).toMatch(/\[class\.online\]\s*=/);
  expect(source).toMatch(/\[style\.width\.%\]\s*=/);
});
