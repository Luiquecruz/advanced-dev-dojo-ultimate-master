Add **default type parameters** so the common cases need fewer type arguments.

1. `type ApiResponse<TData = unknown, TError = ApiError>` — a union of
   `{ ok: true; data: TData }` and `{ ok: false; error: TError }`.
2. `interface Paginated<TItem, TCursor = number>` with `items: TItem[]` and `next: TCursor | null`.
3. `success<TData>(data: TData): ApiResponse<TData>` — returns `{ ok: true, data }`.
4. `failure<TData = never>(code: number, message: string): ApiResponse<TData>` — returns
   `{ ok: false, error: { code, message } }`. Without context it is an `ApiResponse<never>`.
5. `createCollection<T = string>(...items: T[]): T[]` — returns the items as a new array;
   `createCollection()` is typed `string[]`.

```ts
const empty = createCollection();          // string[]
const numbers = createCollection(1, 2);    // number[]
const response: ApiResponse = success(42); // ApiResponse<unknown, ApiError>
```
