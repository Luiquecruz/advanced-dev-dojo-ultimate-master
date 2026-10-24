## The problem harnesses solve

Tests that query raw DOM couple themselves to markup details:

```ts
const button = fixture.nativeElement.querySelector('.mat-mdc-button-base.save span.label');
```

The day the component library changes its internal structure, dozens of tests break even though behavior did not change. **Component harnesses** from the Angular CDK (`@angular/cdk/testing`) put a small, stable API in front of a component: tests talk to the harness, and only the harness knows the DOM.

```ts
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

it('saves the form', async () => {
  const fixture = TestBed.createComponent(ProfileForm);
  const loader = TestbedHarnessEnvironment.loader(fixture);

  const save = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
  expect(await save.isDisabled()).toBe(false);
  await save.click();
});
```

Angular Material ships a harness for every component in `@angular/material/<component>/testing` (`MatInputHarness`, `MatSelectHarness`, `MatDialogHarness`...).

## Key pieces

- **`HarnessEnvironment`**: adapts harnesses to a test environment. `TestbedHarnessEnvironment` works with TestBed unit tests; the same harness can run in end-to-end tests with `SeleniumWebDriverHarnessEnvironment`.
- **`HarnessLoader`**: finds harnesses. `loader.getHarness(X)` returns the first match (throws if none), `getAllHarnesses(X)` returns all, `getHarnessOrNull(X)` returns `null` when missing. `TestbedHarnessEnvironment.documentRootLoader(fixture)` searches the whole document, which you need for overlays such as dialogs and menus rendered outside the component.
- **`HarnessPredicate` / `.with({...})`**: filters, e.g. `MatButtonHarness.with({ text: 'Save' })`.
- **`TestElement`**: the abstraction over a DOM element (`click()`, `text()`, `setInputValue()`, `getAttribute()`). It is environment-agnostic, so it works in TestBed and in a real browser driver.

Every harness method is **async** and automatically waits for the component to be stable (it triggers change detection and awaits `whenStable` for you). That removes most manual `detectChanges` calls from tests.

## Writing your own harness

```ts
import { ComponentHarness } from '@angular/cdk/testing';

export class RatingHarness extends ComponentHarness {
  static hostSelector = 'app-rating';

  private readonly stars = this.locatorForAll('button.star');
  private readonly label = this.locatorFor('.label');

  async getValue(): Promise<number> {
    return Number(await (await this.host()).getAttribute('data-value'));
  }

  async rate(value: number): Promise<void> {
    const stars = await this.stars();
    await stars[value - 1].click();
  }

  async getLabel(): Promise<string> {
    return (await this.label()).text();
  }
}
```

- `static hostSelector` tells loaders which element is the component.
- `locatorFor(selector)` returns a function that finds **one** element (throws if missing); `locatorForOptional` returns `null`; `locatorForAll` returns a list. Locators also accept other harness classes to compose harnesses.
- Expose **user-level** methods (`rate`, `getValue`), never raw elements.
- Ship the harness next to the component (often in a `testing` entry point) so every consumer reuses it.

## Performance tip

Each harness call may trigger change detection. Use `parallel(() => [a.getText(), b.getText()])` from `@angular/cdk/testing` to batch several reads into one stabilization.

## When to use them

- Testing code that uses **Angular Material or CDK components**: always prefer the official harnesses over DOM selectors.
- **Design systems and shared components**: write a harness and publish it for consumers.
- Small app components with plain HTML: Testing Library style queries (`getByRole`, `getByText`) are often enough and equally resilient.

> The CDK is not installed in this sandbox, so this lesson is theory plus a quiz. Harnesses work the same with Vitest and Karma.
