const { Component } = require('@angular/core');
const StarRating = modules['rating.ts'].StarRating;

@Component({
  selector: 'test-host',
  imports: [StarRating],
  template: `<app-star-rating (rated)="rated.push($event)" (cleared)="cleared = cleared + 1" (previewed)="previewed.push($event)" />`,
})
class Host {
  rated: number[] = [];
  cleared = 0;
  previewed: number[] = [];
}

const filledStars = (element: HTMLElement) => (element.textContent!.match(/★/g) ?? []).length;

test('StarRating emits rated with the clicked star', async () => {
  const { component } = await render(Host);
  await user.click(screen.getByRole('button', { name: 'Rate 4' }));
  await user.click(screen.getByRole('button', { name: 'Rate 2' }));
  expect(component.rated).toEqual([4, 2]);
});

test('StarRating emits cleared when Clear is clicked', async () => {
  const { component } = await render(Host);
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(component.cleared).toBe(1);
});

test('previewed emits on hover, skipping repeated stars', async () => {
  const { component } = await render(Host);
  const star2 = screen.getByRole('button', { name: 'Rate 2' });
  await user.hover(star2);
  await user.unhover(star2);
  await user.hover(star2);
  await user.hover(screen.getByRole('button', { name: 'Rate 3' }));
  expect(component.previewed).toEqual([2, 3]);
});

test('App stores the rating and resets it on clear', async () => {
  const { element } = await render(mod.App);
  expect(element.querySelector('.summary')).toHaveTextContent('Not rated yet');
  await user.click(screen.getByRole('button', { name: 'Rate 4' }));
  await stable();
  expect(element.querySelector('.summary')).toHaveTextContent('You rated 4/5');
  expect(filledStars(element.querySelector('app-star-rating') as HTMLElement)).toBe(4);
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  await stable();
  expect(element.querySelector('.summary')).toHaveTextContent('Not rated yet');
});

test('App shows the hovered star as preview', async () => {
  const { element } = await render(mod.App);
  await user.hover(screen.getByRole('button', { name: 'Rate 3' }));
  await stable();
  expect(element.querySelector('.preview')).toHaveTextContent('Preview: 3');
});

test('uses output() and outputFromObservable instead of EventEmitter', () => {
  const code = sources['rating.ts'];
  expect(code).toMatch(/rated\s*=\s*output\s*<\s*number\s*>\s*\(/);
  expect(code).toMatch(/outputFromObservable\s*\(/);
  expect(code).not.toMatch(/EventEmitter/);
});
