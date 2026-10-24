type Status = 'todo' | 'in-progress' | 'done';

interface Task {
  title: string;
  status: Status;
}

// TODO: type as Record<Status, string> and add the missing label
const STATUS_LABELS: { [key: string]: string } = {
  todo: 'To do',
  'in-progress': 'In progress',
};

function countByStatus(tasks: readonly Task[]): Record<Status, number> {
  // TODO: start every status at 0 and count the tasks
  return { todo: 0, 'in-progress': 0, done: 0 };
}

// TODO: return Partial<Record<Status, Task[]>>
function groupByStatus(tasks: readonly Task[]): Record<string, Task[]> {
  return {};
}

function indexBy<T>(items: readonly T[], getKey: (item: T) => string): Record<string, T> {
  // TODO: build the dictionary
  return {};
}
