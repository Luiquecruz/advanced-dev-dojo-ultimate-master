`private readonly state = new BehaviorSubject<Todo[]>([]);` and `readonly todos$ = this.state.asObservable();`. A `BehaviorSubject` hands its current value to every new subscriber.
---
Read the current list with `this.state.value` and always `next()` a new array: `[...this.state.value, newTodo]` for add, `.map(...)` with `{ ...todo, completed: !todo.completed }` for toggle.
---
`remaining$ = this.todos$.pipe(map((todos) => todos.filter((todo) => !todo.completed).length))`.
---
Template: `<button (click)="store.add(title.value); title.value = ''">Add</button>` and `@for (todo of todos(); track todo.id) { <li (click)="store.toggle(todo.id)">{{ todo.title }}</li> }`.
