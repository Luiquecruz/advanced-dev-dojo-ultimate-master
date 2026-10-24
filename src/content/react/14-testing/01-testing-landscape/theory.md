## Why test React code?

Tests let you change code without fear. For UI, the goal is confidence that **users can do what they came to do**, not that a component calls `setState` three times. Kent C. Dodds' guiding principle sums up the modern approach:

> The more your tests resemble the way your software is used, the more confidence they can give you.

## The layers

| Layer | What it checks | Typical tools |
| --- | --- | --- |
| Static | types, lint rules | TypeScript, ESLint (`eslint-plugin-react-hooks`, `jsx-a11y`) |
| Unit | pure functions, hooks, reducers | Vitest, Jest |
| Component / integration | a component tree in a DOM: render, click, type, assert | Testing Library + Vitest or Jest; Vitest Browser Mode |
| End-to-end (E2E) | the real app in real browsers, with routing, network and backend | Playwright, Cypress |
| Visual | pixels did not change | Playwright screenshots, Vitest `toMatchScreenshot`, Chromatic |

The "testing trophy" puts most effort in **integration** tests: cheap enough to write many, realistic enough to catch real bugs.

## Test runners

**Vitest** is the default for Vite-based projects. It reuses your Vite config and plugins, speaks the Jest API (`describe`, `it`, `expect`, `vi.fn()`, `vi.mock()`), runs native ESM and TypeScript, and has a fast watch mode. **Browser Mode** (stable since Vitest 4) runs component tests in a real Chromium, Firefox or WebKit through Playwright instead of a simulated DOM.

**Jest** is the long-standing runner from Meta, still everywhere in existing codebases and React Native projects. Jest 30 (2025) improved speed and memory. ESM and TypeScript need extra transforms (Babel or `ts-jest`/SWC).

Both default to Node with a **simulated DOM** (`jsdom` or the faster `happy-dom`) for component tests. A simulated DOM has no layout: `getBoundingClientRect` returns zeros, CSS animations do not run, and `matchMedia` is missing unless you stub it.

```ts
// vitest.config.ts
export default defineConfig({
  test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] },
});
```

## React Testing Library

RTL renders components into the DOM and gives you **queries that mirror how users find things**: by role, label and visible text. It deliberately hides component internals (no state, no instance), so refactors do not break tests.

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('adds a todo', async () => {
  const user = userEvent.setup();
  render(<TodoApp />);
  await user.type(screen.getByLabelText('New todo'), 'Write tests');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('listitem')).toHaveTextContent('Write tests');
});
```

`@testing-library/user-event` simulates full interactions (focus, keydown, input, keyup, click) and is preferred over the low-level `fireEvent`. `@testing-library/jest-dom` adds matchers such as `toBeInTheDocument` and `toHaveAccessibleName`.

**Legacy vs modern.** Enzyme tested implementation details (`wrapper.state()`, shallow rendering) and was never updated for React 18; it is effectively dead. `react-test-renderer` is deprecated since React 19. Use RTL.

## End-to-end tools

**Playwright** (Microsoft) drives Chromium, Firefox and WebKit, runs tests in parallel, auto-waits for elements, and ships a trace viewer, code generator and component testing. It uses the same accessible locators: `page.getByRole('button', { name: 'Save' })`.

**Cypress** runs inside the browser with an interactive time-travel UI and its own command chain (`cy.get(...).click()`). It also supports component testing.

E2E tests are the most realistic and the most expensive: slower, harder to debug, sensitive to data. Keep a focused set for critical journeys (sign up, checkout).

## Mocking the network

**Mock Service Worker (MSW)** intercepts requests at the network level, in Node for tests and in the browser for development. Components keep calling `fetch` normally, so tests stay realistic, and the same handlers work in Storybook and E2E.

## Pitfalls

- Testing implementation details (state values, private functions, CSS class names that users never perceive).
- Snapshot tests of whole trees: they break on every change and get blindly updated.
- Using `getByTestId` first: it says nothing about accessibility. Prefer roles and labels.
- Forgetting `await` with `user-event` and `findBy*` queries: the test finishes before the UI updates.
