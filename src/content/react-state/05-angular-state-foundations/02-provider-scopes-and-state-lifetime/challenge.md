Show the difference between a root-scoped and a component-scoped service. The project has two files.

**`counters.ts`** exports two services, both with a `count` signal exposed read-only and an `increment()` method that adds 1 (starting at `0`):

- `SharedCounter`: `@Injectable({ providedIn: 'root' })`.
- `LocalCounter`: `@Injectable()` with **no** `providedIn`, so nothing outside a `providers` array can create it.

**`app.ts`** exports two components:

- `Counter` (selector `app-counter`) lists `providers: [LocalCounter]`, injects both services, and renders `<p>Local: {{ local }}</p>` and `<p>Shared: {{ shared }}</p>` with the buttons `Local +1` and `Shared +1` calling the matching `increment()`.
- `Page` (selector `app-page`) renders two `<app-counter>` elements (import `Counter`; it is declared after `Page`, so wrap it in `forwardRef(() => Counter)`).
