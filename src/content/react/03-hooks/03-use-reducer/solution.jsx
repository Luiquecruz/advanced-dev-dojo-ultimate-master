import { useReducer, useState } from 'react';

const INITIAL_TASKS = [
  { id: 1, title: 'Learn JSX', done: true },
  { id: 2, title: 'Master hooks', done: false },
  { id: 3, title: 'Ship a React app', done: false },
];

export function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'added': {
      const id = Math.max(0, ...tasks.map((task) => task.id)) + 1;
      return [...tasks, { id, title: action.title, done: false }];
    }
    case 'toggled':
      return tasks.map((task) => (task.id === action.id ? { ...task, done: !task.done } : task));
    case 'deleted':
      return tasks.filter((task) => task.id !== action.id);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export default function TaskBoard() {
  const [tasks, dispatch] = useReducer(tasksReducer, INITIAL_TASKS);
  const [title, setTitle] = useState('');
  const remaining = tasks.filter((task) => !task.done).length;

  function handleAdd() {
    if (!title.trim()) return;
    dispatch({ type: 'added', title: title.trim() });
    setTitle('');
  }

  return (
    <section>
      <label>
        New task
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button onClick={handleAdd}>Add</button>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <label>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => dispatch({ type: 'toggled', id: task.id })}
              />
              {task.title}
            </label>
            <button aria-label={`Delete ${task.title}`} onClick={() => dispatch({ type: 'deleted', id: task.id })}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p>{remaining} left</p>
    </section>
  );
}
