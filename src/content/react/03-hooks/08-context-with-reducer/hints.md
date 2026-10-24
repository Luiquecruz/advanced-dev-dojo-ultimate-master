With one context holding `{ tasks, dispatch }`, the value is a new object every render, so every consumer re-renders when tasks change. Split the two values into two contexts.
---
`const TasksContext = createContext(null); const TasksDispatchContext = createContext(null);` and in the provider: `<TasksContext value={tasks}><TasksDispatchContext value={dispatch}>{children}</TasksDispatchContext></TasksContext>`.
---
In each Hook: read the context, `if (value === null) throw new Error('useTasks must be used within a TasksProvider');`, then return the value.
