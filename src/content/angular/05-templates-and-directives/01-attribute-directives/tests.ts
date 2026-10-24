async function hover(element) {
  fireEvent.mouseEnter(element);
  await stable();
}

async function leave(element) {
  fireEvent.mouseLeave(element);
  await stable();
}

test('highlights with the attribute color while hovered', async () => {
  await render(mod.App);
  const paragraph = screen.getByText('Orange paragraph');
  expect(paragraph.style.backgroundColor).toBe('');
  await hover(paragraph);
  expect(paragraph.style.backgroundColor).toBe('orange');
  await leave(paragraph);
  expect(paragraph.style.backgroundColor).toBe('');
});

test('falls back to yellow when no color is given', async () => {
  await render(mod.App);
  const paragraph = screen.getByText('Default paragraph');
  await hover(paragraph);
  expect(paragraph.style.backgroundColor).toBe('yellow');
});

test('Card applies Highlight through hostDirectives with the highlightColor input', async () => {
  const { reflectComponentType } = require('@angular/core');
  await render(mod.App);
  const card = screen.getByText('Pink card');
  expect(card.tagName).toBe('APP-CARD');
  await hover(card);
  expect(card.style.backgroundColor).toBe('pink');
  expect(reflectComponentType(mod.Card).inputs.length).toBe(0);
  expect(source).toMatch(/hostDirectives\s*:/);
});

test('uses host metadata instead of @HostBinding/@HostListener', () => {
  expect(source).toMatch(/host\s*:\s*\{/);
  expect(source).not.toMatch(/@HostBinding|@HostListener/);
});
