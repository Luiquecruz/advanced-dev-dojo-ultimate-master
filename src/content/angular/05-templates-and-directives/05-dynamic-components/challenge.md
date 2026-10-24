Create toasts imperatively and switch widgets declaratively.

**`Toast`** (selector `app-toast`): required input `message`, output `closed`, template `<div role="alert">{{ message() }} <button>Close</button></div>` where the button emits `closed`.

**`Toaster`** (selector `app-toaster`)

1. Template: `<button>Show toast</button>`, `<button>Clear all</button>` and an `<ng-container #outlet />`.
2. A `viewChild` of `outlet` read as `ViewContainerRef`.
3. `show(message: string): ComponentRef<Toast>` creates a `Toast` in the container with `inputBinding('message', ...)` and `outputBinding('closed', ...)` that destroys **that** toast.
4. `Show toast` calls `show('Saved!')`; `Clear all` clears the container.

**`Dashboard`** (selector `app-dashboard`)

1. `UsersWidget` and `StatsWidget` are provided; each has a required `title` input.
2. Buttons `Users` and `Stats` select the widget; render it with `NgComponentOutlet`, passing the input `title: 'Panel'`. `UsersWidget` is selected initially.
