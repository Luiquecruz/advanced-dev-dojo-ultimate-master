`counter.ts` contains a finished `Counter` component: a `<p>` with `Count: N`, an `Increment` button and a `Reset` button. Your job is to **write its spec** in `counter.spec.ts`.

The exported function `counterSpec({ it, beforeEach, expect }, component)` registers test cases. The grader runs your cases against the real `Counter` **and** against broken copies (mutants), so your spec must:

1. In `beforeEach`: call `TestBed.configureTestingModule({ imports: [component] })`, create the fixture with `TestBed.createComponent(component)`, keep `fixture.nativeElement` and `await fixture.whenStable()`.
2. Keep the three `it` cases (you may add more):
   - `renders "Count: 0" initially`
   - `increments when Increment is clicked` (click twice, expect `Count: 2`)
   - `resets to 0 when Reset is clicked`
3. After every click, `await fixture.whenStable()` before asserting.
4. All cases pass for the real `Counter` and at least one case fails for each mutant: a counter starting at 1, an `Increment` button that does nothing, a `Reset` button that does nothing.

Always use the `component` parameter, not the imported `Counter`, so the grader can swap it.
