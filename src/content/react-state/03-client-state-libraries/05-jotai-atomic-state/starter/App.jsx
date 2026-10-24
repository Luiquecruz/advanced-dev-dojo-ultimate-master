import { Provider, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { clearDoneAtom, filterAtom, remainingCountAtom, tasksAtom, toggleTaskAtom, visibleTasksAtom } from './atoms';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
];

export function FilterBar() {
  const [filter, setFilter] = useAtom(filterAtom);
  return (
    <div role="group" aria-label="Filter">
      {FILTERS.map((option) => (
        <button key={option.value} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TaskList() {
  const tasks = useAtomValue(visibleTasksAtom);
  const toggleTask = useSetAtom(toggleTaskAtom);
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <label>
            <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
            {task.title}
          </label>
        </li>
      ))}
    </ul>
  );
}

export function Footer() {
  const remaining = useAtomValue(remainingCountAtom);
  const clearDone = useSetAtom(clearDoneAtom);
  return (
    <footer>
      <p data-testid="remaining">{remaining} remaining</p>
      <button onClick={clearDone}>Clear done</button>
    </footer>
  );
}

function HydrateTasks({ tasks, children }) {
  // TODO: seed tasksAtom with `tasks` using useHydrateAtoms
  return children;
}

export function TaskBoard({ initialTasks }) {
  // TODO: give every board its own store with <Provider> and hydrate it with <HydrateTasks tasks={initialTasks}>
  return (
    <section>
      <FilterBar />
      <TaskList />
      <Footer />
    </section>
  );
}

const sampleTasks = [
  { id: 1, title: 'Design atoms', done: true },
  { id: 2, title: 'Persist the filter', done: false },
  { id: 3, title: 'Scope each board', done: false },
];

export default function App() {
  return <TaskBoard initialTasks={sampleTasks} />;
}
