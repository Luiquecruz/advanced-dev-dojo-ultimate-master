1. Build `Toast` as a normal component with a signal input and an output.
2. In `Toaster`, mark the insertion point with `<ng-container #outlet />` and query it with `read: ViewContainerRef`.
3. In `show()`, call `createComponent` with an `inputBinding` for the message and an `outputBinding` that destroys the returned ref.
4. Return the `ComponentRef` and implement `clear()` with `container.clear()`.
5. For the dashboard, keep the selected class in a signal and render it declaratively with `*ngComponentOutlet` and its `inputs` option.
