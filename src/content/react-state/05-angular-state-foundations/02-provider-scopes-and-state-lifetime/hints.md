In `counters.ts` both services follow the same shape: `private readonly state = signal(0); readonly count = this.state.asReadonly(); increment() { this.state.update((value) => value + 1); }`. Only the decorator differs.
---
`@Injectable()` without `providedIn` leaves the class unprovided; `TestBed.inject(LocalCounter)` must throw because only `Counter` provides it.
---
In `Counter`, add `providers: [LocalCounter]` to the `@Component` decorator and `protected readonly local = inject(LocalCounter);`. Then `Page` imports `Counter` and renders it twice.
