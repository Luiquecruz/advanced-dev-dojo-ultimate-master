Before starting, complete the NgRx SignalStore lessons of this path and [Subjects and State](/angular/subjects-and-state) in the Angular track.

NgRx has several tools. **Store** is the global, action-driven one; **SignalStore** is the signal-based feature store; **ComponentStore** (`@ngrx/component-store`) is an RxJS-based store scoped to one component or feature. You meet ComponentStore mostly in existing code, so it is worth reading fluently even if new code tends towards SignalStore.

## ComponentStore in one example

```ts
interface MoviesState { movies: Movie[] }

@Injectable()
export class MoviesStore extends ComponentStore<MoviesState> {
  constructor(private readonly api: MoviesApi) {
    super({ movies: [] });
  }

  readonly movies$ = this.select((state) => state.movies);          // selector: Observable

  readonly addMovie = this.updater((state, movie: Movie) => ({      // updater: pure state change
    movies: [...state.movies, movie],
  }));

  readonly load = this.effect<string>((genre$) =>                    // effect: side effects
    genre$.pipe(
      switchMap((genre) => this.api.byGenre(genre).pipe(
        tap((movies) => this.setState({ movies })),
        catchError(() => EMPTY),
      )),
    ),
  );
}
```

Three building blocks:

- **`select`** derives an observable from state; it is memoized and shared.
- **`updater`** produces new state from the old one and a value, as a pure function.
- **`effect`** receives a stream of inputs and runs side effects, with the flattening operator you choose.

It is provided with `providers: [provideComponentStore(MoviesStore)]` (or a plain `providers` entry) on a component, so each instance lives and dies with that component. Provided on a route instead, it becomes one instance per feature that lives for the session. That scoping is the main reason to use it over a global store.

## Mapping to the signal world

| ComponentStore | SignalStore |
| --- | --- |
| `select` returns an Observable | state and computed are signals |
| `updater` | `patchState` inside methods |
| `effect` | `rxMethod` |
| `provideComponentStore` | `providers: [Store]` or `providedIn` |
| Observables everywhere in templates (`async`) | signals in templates |

ComponentStore also has `selectSignal` for reading state as a signal, which helps migrate templates gradually.

## Other stores you will meet

- **RxAngular State** (`@rx-angular/state`): `rxState`, `rxActions` and `rxEffects` for reactive component and service state, with signal integration.
- **Elf** (`@ngneat/elf`): a modular RxJS store with composable features and entity helpers.
- **Akita** (`@datorama/akita`): an older entity-store library common in legacy code. Treat it as a reference and check its maintenance status and Angular compatibility before choosing it for a new project.
- **StateAdapt**: a library built on adapters; useful for comparing approaches.
- **Your own store**: a signal or RxJS service. Fine for small features if you write down the conventions and tests.

The pattern across all of them is the same: private state, a way to select, a way to update, and a place for effects. Once you know that vocabulary, a new library is mostly new names.

## Choosing among them

New Angular code with signals usually starts with a signal service or SignalStore. Existing ComponentStore code does not need to be rewritten for its own sake; migrate when you touch it, and bridge with `selectSignal` and `toObservable`. For a library with a small community, check release activity, open issues and Angular version support, and consider how hard it would be to leave.

## Common mistakes

- Providing a ComponentStore in root, losing the scoping that justifies it.
- Mutating state inside an updater.
- Using `mergeMap` in an effect where `switchMap` is needed, creating races.
- Mixing a library store and a second store for the same feature.
- Choosing a niche library without an exit plan.

## When to choose it

Keep ComponentStore where it exists and works. For new feature state, prefer a signal service or SignalStore unless the team has strong RxJS conventions and tooling already.
