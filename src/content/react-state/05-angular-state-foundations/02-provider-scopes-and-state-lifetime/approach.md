1. Write the shared service as a root-provided class with a private signal and a read-only `count`.
2. Write the local service the same way but with a bare `@Injectable()` so it needs an explicit provider.
3. List `LocalCounter` in the `providers` of `Counter` so each component instance gets its own.
4. Inject both services in `Counter` and bind the template to their `count()` and `increment()`.
5. Render two `Counter` elements in `Page` and observe that Local counts independently while Shared moves together.
