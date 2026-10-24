import { createContext, useContext, useReducer, useState } from 'react';

const INITIAL_TASKS = [
  { id: 1, title: 'Visit the Philosopher’s Path' },
  { id: 2, title: 'Drink matcha' },
];

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'added':
      return [...tasks, { id: Math.max(0, ...tasks.map((task) => task.id)) + 1, title: action.title }];
    case 'deleted':
      return tasks.filter((task) => task.id !== action.id);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

const TasksContext = createContext(null);
const TasksDispatchContext = createContext(null);

export function TasksProvider({ children }) {
  const [tasks, dispatch] = useReducer(tasksReducer, INITIAL_TASKS);

  return (
    <TasksContext value={tasks}>
      <TasksDispatchContext value={dispatch}>{children}</TasksDispatchContext>
    </TasksContext>
  );
}

export function useTasks() {
  const tasks = useContext(TasksContext);
  if (tasks === null) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return tasks;
}

export function useTasksDispatch() {
  const dispatch = useContext(TasksDispatchContext);
  if (dispatch === null) {
    throw new Error('useTasksDispatch must be used within a TasksProvider');
  }
  return dispatch;
}

export function AddTask() {
  const dispatch = useTasksDispatch();
  const [title, setTitle] = useState('');

  function handleAdd() {
    dispatch({ type: 'added', title });
    setTitle('');
  }

  return (
    <div>
      <label>
        New task
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button onClick={handleAdd}>Add</button>
    </div>
  );
}

export function TaskList() {
  const tasks = useTasks();
  const dispatch = useTasksDispatch();

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          {task.title}
          <button aria-label={`Delete ${task.title}`} onClick={() => dispatch({ type: 'deleted', id: task.id })}>
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  return (
    <TasksProvider>
      <h1>Day off in Kyoto</h1>
      <AddTask />
      <TaskList />
    </TasksProvider>
  );
}
