import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const tasksAtom = atom([]);

export const filterAtom = atomWithStorage('task-filter', 'all');

export const visibleTasksAtom = atom((get) => {
  const filter = get(filterAtom);
  const tasks = get(tasksAtom);
  if (filter === 'all') return tasks;
  return tasks.filter((task) => (filter === 'done' ? task.done : !task.done));
});

export const remainingCountAtom = atom((get) => get(tasksAtom).filter((task) => !task.done).length);

export const toggleTaskAtom = atom(null, (get, set, id) => {
  set(
    tasksAtom,
    get(tasksAtom).map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
  );
});

export const clearDoneAtom = atom(null, (get, set) => {
  set(
    tasksAtom,
    get(tasksAtom).filter((task) => !task.done),
  );
});
