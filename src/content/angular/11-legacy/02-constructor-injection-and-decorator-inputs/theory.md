## The decorator era

Most Angular code written before 2024 looks like this, and you will maintain plenty of it:

```ts
@Component({
  selector: 'app-user-badge',
  template: `<span (click)="select()">{{ name }}</span>`,
})
export class UserBadgeComponent implements OnChanges {
  @Input() name = '';
  @Input({ required: true }) id!: number;
  @Output() selected = new EventEmitter<number>();

  constructor(private readonly users: UserService, private readonly router: Router) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['name']) {
      console.log(changes['name'].previousValue, '->', changes['name'].currentValue);
    }
  }

  select() {
    this.selected.emit(this.id);
  }
}
```

## Constructor injection

Angular reads the **constructor parameter types** to know what to inject. `private readonly users: UserService` is a TypeScript *parameter property*: it declares the field and assigns the injected instance in one go.

How does Angular know the type at runtime, when TypeScript types are erased? The Angular compiler (AOT) reads them statically and generates a factory. In JIT mode, TypeScript's `emitDecoratorMetadata` writes the types into `design:paramtypes` metadata, read through `reflect-metadata`. This is also why constructor injection breaks with **interfaces** or type-only imports: they do not exist at runtime, so you need an `InjectionToken` plus `@Inject(TOKEN)`:

```ts
constructor(@Inject(API_URL) private readonly apiUrl: string, @Optional() private readonly logger?: Logger) {}
```

The modern `inject()` function replaces all of this: `private readonly users = inject(UserService);` works in field initializers, needs no metadata, plays well with inheritance (no `super(...)` chains forwarding dependencies) and with standard decorators.

## Decorator inputs and outputs

- `@Input() name = ''` marks a **plain class field** as bindable: `<app-user-badge [name]="user.name" />`.
- Options: `@Input({ required: true })`, `@Input({ alias: 'userName' })`, `@Input({ transform: booleanAttribute })` (Angular 16+). `numberAttribute` turns `value="4"` into the number `4`.
- `@Output() selected = new EventEmitter<number>()` declares an event; the parent listens with `(selected)="onSelect($event)"`.
- Inputs are not reactive by themselves. To react to changes you implement **`ngOnChanges(changes: SimpleChanges)`**, use a setter (`@Input() set name(value) {...}`), or duplicate the value into a `BehaviorSubject`.

## Legacy vs modern

| Decorator API | Signal API |
| --- | --- |
| `@Input() name = ''` | `name = input('')` |
| `@Input({ required: true }) id!: number` | `id = input.required<number>()` |
| `@Output() selected = new EventEmitter<number>()` | `selected = output<number>()` |
| `@Input() value` + `@Output() valueChange` | `value = model()` |
| `ngOnChanges` / setters | `computed()` / `effect()` on the input signal |
| `constructor(private s: Service)` | `private s = inject(Service)` |
| `@ViewChild('ref') ref!: ElementRef` | `ref = viewChild<ElementRef>('ref')` |

Both styles work in Angular 22 and can be mixed in the same app. The CLI ships migrations to move gradually:

```bash
ng g @angular/core:inject           # constructor injection -> inject()
ng g @angular/core:signal-input-migration
ng g @angular/core:output-migration
ng g @angular/core:signal-queries-migration
```

## Pitfalls in legacy code

- **Mutating an `@Input` object** inside the child changes the parent's data too, and with `OnPush` the change may not render.
- **Reading inputs in the constructor**: they are not set yet. Use `ngOnInit` or `ngOnChanges`.
- **`EventEmitter` is an RxJS `Subject`**: some code subscribes to it directly. With `output()` you get `OutputEmitterRef`, which is intentionally not an Observable (use `outputToObservable` when needed).
- **`!` definite assignment** on required inputs hides missing bindings at compile time; `input.required()` enforces them.
