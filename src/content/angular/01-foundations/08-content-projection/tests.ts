const { Component } = require('@angular/core');
const Panel = modules['panel.ts'].Panel;

@Component({
  selector: 'test-host',
  imports: [Panel],
  template: `
    <app-panel>
      <p>Body first</p>
      <button panel-actions>Cancel</button>
      <span panel-title>Title</span>
      <p>Body second</p>
      <button panel-actions>Confirm</button>
    </app-panel>
  `,
})
class Host {}

const region = (element: Element, selector: string) => element.querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();

test('projects [panel-title] into the header', async () => {
  const { element } = await render(Host);
  expect(region(element, '.panel-header')).toBe('Title');
});

test('projects the remaining content into the body, in order', async () => {
  const { element } = await render(Host);
  const paragraphs = [...element.querySelectorAll('.panel-body p')].map((paragraph) => paragraph.textContent);
  expect(paragraphs).toEqual(['Body first', 'Body second']);
  expect(element.querySelector('.panel-body [panel-title]')).toBeNull();
});

test('projects every [panel-actions] element into the footer', async () => {
  const { element } = await render(Host);
  const buttons = [...element.querySelectorAll('.panel-footer button')].map((button) => button.textContent);
  expect(buttons).toEqual(['Cancel', 'Confirm']);
  expect(region(element, '.panel-footer')).not.toContain('No actions');
});

test('shows "No actions" when no actions are projected', async () => {
  const { element } = await render(mod.App);
  const [notifications, profile] = [...element.querySelectorAll('app-panel')];
  expect(region(profile, '.panel-header')).toBe('Profile');
  expect(region(profile, '.panel-footer')).toBe('No actions');
  expect(region(notifications, '.panel-footer')).toBe('Mark all as read');
});

test('projected content keeps the parent bindings', async () => {
  const { element } = await render(mod.App);
  const notifications = element.querySelector('app-panel')!;
  expect(region(notifications, '.panel-body')).toBe('You have 3 unread messages.');
  await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
  await stable();
  expect(region(notifications, '.panel-body')).toBe('You have 0 unread messages.');
});
