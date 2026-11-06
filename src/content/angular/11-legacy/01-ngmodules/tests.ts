const { Component, reflectComponentType } = require('@angular/core');

@Component({
  selector: 'app-badge-probe',
  imports: [mod.UsersModule],
  template: `<app-badge>Leaked</app-badge>`,
})
class BadgeProbe {}

test('renders one card per user with the name in uppercase', async () => {
  await render(mod.App);
  const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent.trim());
  expect(headings).toEqual(['ADA LOVELACE', 'ALAN TURING']);
});

test('each card shows its role inside the badge component', async () => {
  const { element } = await render(mod.App);
  const badges = Array.from(element.querySelectorAll('app-badge .badge')).map((badge) => badge.textContent.trim());
  expect(badges).toEqual(['Admin', 'Member']);
});

test('BadgeComponent and UserCardComponent are declared in an NgModule (standalone: false)', () => {
  expect(reflectComponentType(mod.BadgeComponent).isStandalone).toBe(false);
  expect(reflectComponentType(mod.UserCardComponent).isStandalone).toBe(false);
  expect(sources['app.ts']).toMatch(/declarations\s*:\s*\[[^\]]*BadgeComponent[^\]]*\]/);
});

test('UsersModule keeps BadgeComponent private (only UserCardComponent is exported)', async () => {
  const { element } = await render(BadgeProbe);
  expect(element.querySelector('.badge')).toBeNull();
  expect(sources['app.ts']).toMatch(/exports\s*:\s*\[\s*UserCardComponent\s*\]/);
});

test('the standalone App imports UsersModule', () => {
  expect(reflectComponentType(mod.App).isStandalone).toBe(true);
  expect(source).toMatch(/imports\s*:\s*\[\s*UsersModule\s*\]/);
});
