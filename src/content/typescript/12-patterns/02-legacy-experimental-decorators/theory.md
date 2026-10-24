## A decade of experimental decorators

TypeScript shipped decorators in 2015 (TypeScript 1.5), based on an early TC39 draft, behind the `experimentalDecorators` flag. Angular adopted them immediately, followed by NestJS, TypeORM, MobX, InversifyJS and class-validator. The proposal then changed substantially before reaching Stage 3, so TypeScript 5.0 added the **standard** decorators while keeping the legacy ones for compatibility. Both still exist, and the flag decides which one you get:

```json
{ "compilerOptions": { "experimentalDecorators": true, "emitDecoratorMetadata": true } }
```

## Legacy signatures

Legacy decorators receive the **prototype** (or constructor for static members), the property key and, for methods and accessors, the **property descriptor**:

```ts
function log(target: object, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (this: unknown, ...args: unknown[]) {
    console.log(`${propertyKey}(${args.join(', ')})`);
    return original.apply(this, args);
  };
}

class Api {
  @log
  fetchUser(id: number) { /* ... */ }
}
```

| Element | Legacy signature | Standard signature |
| --- | --- | --- |
| class | `(constructor)` | `(value, ClassDecoratorContext)` |
| method | `(prototype, key, descriptor)` | `(method, ClassMethodDecoratorContext)` |
| property | `(prototype, key)` | `(undefined, ClassFieldDecoratorContext)` |
| parameter | `(prototype, key, index)` | not supported |

Legacy decorators mutate descriptors on the prototype; standard decorators return replacements and use `addInitializer` for per-instance work.

## Parameter decorators and metadata

The two features that kept frameworks on legacy decorators are **parameter decorators** and **`emitDecoratorMetadata`**. With metadata enabled, the compiler emits the design-time types of decorated members using the `reflect-metadata` polyfill:

```ts
import 'reflect-metadata';

@Injectable()
class OrdersService {
  constructor(private readonly repository: OrdersRepository, @Inject(CLOCK) private clock: Clock) {}
}
// emitted: __metadata("design:paramtypes", [OrdersRepository, Object])
```

A dependency injection container reads `design:paramtypes` at runtime to know which classes to construct. That is how NestJS resolves constructor dependencies by type alone. It only works for **classes**: interfaces and type aliases become `Object` because types are erased.

## Who uses which

- **NestJS, TypeORM, InversifyJS, class-validator, class-transformer**: legacy decorators plus metadata.
- **Angular**: `@Component`, `@Injectable` and `@Input` are compiled away by the Angular compiler, so Angular is not tied to either runtime semantics. Modern Angular favors functions (`inject()`, `input()`, `output()`) over decorators anyway.
- **MobX 6**: supports both flavors.
- **Lit 3**: supports both; with standard decorators, reactive properties use the `accessor` keyword.

## Why legacy decorators are a dead end

- They will never be standardised; browsers will implement the standard semantics.
- They generate helper code (`__decorate`, `__metadata`, `__param`), so they are **not erasable**. Node's type stripping and `erasableSyntaxOnly` setups cannot run them.
- `emitDecoratorMetadata` needs type information from the checker, which single-file transpilers (esbuild, Vite's default transform, oxc) cannot fully provide.
- Their semantics around class fields conflict with `useDefineForClassFields`, the default for modern targets.

## Migrating

1. Check that every decorator library you use supports standard decorators.
2. Remove `experimentalDecorators` (and `emitDecoratorMetadata`).
3. Rewrite custom decorators to the `(value, context)` signature; move per-instance logic into `context.addInitializer`.
4. Replace parameter decorators and reflected types with explicit tokens, e.g. `inject(CLOCK)` calls or a static dependency list.
5. Replace `reflect-metadata` with `context.metadata` and `Symbol.metadata` where you need class metadata.

## Pitfalls

- Mixing flavors in one project is impossible: the flag switches the whole compilation.
- With legacy decorators, property decorators cannot see the instance value, a frequent surprise when porting validation libraries.
- Decorator order: legacy and standard decorators both apply bottom to top, but parameter decorators run before the method decorator of the same method.
