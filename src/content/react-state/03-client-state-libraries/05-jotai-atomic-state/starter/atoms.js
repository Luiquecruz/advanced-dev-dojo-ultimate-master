import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const tasksAtom = atom([]);

// TODO: persist the filter ('all' | 'active' | 'done') in localStorage under the key 'task-filter' with atomWithStorage
export const filterAtom = atom('all');

// TODO: derive the tasks that match filterAtom ('all' returns every task, 'active' the not done ones, 'done' the done ones)
export const visibleTasksAtom = atom((get) => get(tasksAtom));

// TODO: derive how many tasks are not done
export const remainingCountAtom = atom(0);

// TODO: write-only atom that receives an id and flips `done` of that task immutably
export const toggleTaskAtom = atom(null, (get, set, id) => {});

// TODO: write-only atom that removes every done task
export const clearDoneAtom = atom(null, (get, set) => {});
