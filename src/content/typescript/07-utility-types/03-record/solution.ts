type Status = 'todo' | 'in-progress' | 'done';

interface Task {
  title: string;
  status: Status;
}

const STATUS_LABELS: Record<Status, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
};

function countByStatus(tasks: readonly Task[]): Record<Status, number> {
  const counts: Record<Status, number> = { todo: 0, 'in-progress': 0, done: 0 };
  for (const task of tasks) {
    counts[task.status]++;
  }
  return counts;
}

function groupByStatus(tasks: readonly Task[]): Partial<Record<Status, Task[]>> {
  const groups: Partial<Record<Status, Task[]>> = {};
  for (const task of tasks) {
    (groups[task.status] ??= []).push(task);
  }
  return groups;
}

function indexBy<T>(items: readonly T[], getKey: (item: T) => string): Record<string, T> {
  const index: Record<string, T> = {};
  for (const item of items) {
    index[getKey(item)] = item;
  }
  return index;
}
