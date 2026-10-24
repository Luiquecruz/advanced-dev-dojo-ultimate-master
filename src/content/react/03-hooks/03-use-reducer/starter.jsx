import { useReducer, useState } from 'react';

const INITIAL_TASKS = [
  { id: 1, title: 'Learn JSX', done: true },
  { id: 2, title: 'Master hooks', done: false },
  { id: 3, title: 'Ship a React app', done: false },
];

export function tasksReducer(tasks, action) {
  switch (action.type) {
    // TODO: 'added'   -> append { id: highest id + 1, title: action.title, done: false }
    // TODO: 'toggled' -> flip `done` of the task whose id is action.id
    // TODO: 'deleted' -> remove the task whose id is action.id
    // TODO: default   -> throw an Error for unknown action types
    default:
      return tasks;
  }
}

export default function TaskBoard() {
  const [tasks, dispatch] = useReducer(tasksReducer, INITIAL_TASKS);
  const [title, setTitle] = useState('');
  const remaining = tasks.filter((task) => !task.done).length;

  function handleAdd() {
    if (!title.trim()) return;
    // TODO: dispatch an 'added' action with the trimmed title and clear the input
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
              {/* TODO: dispatch a 'toggled' action on change */}
              <input type="checkbox" checked={task.done} onChange={() => {}} />
              {task.title}
            </label>
            {/* TODO: dispatch a 'deleted' action on click */}
            <button aria-label={`Delete ${task.title}`}>✕</button>
          </li>
        ))}
      </ul>
      <p>{remaining} left</p>
    </section>
  );
}
