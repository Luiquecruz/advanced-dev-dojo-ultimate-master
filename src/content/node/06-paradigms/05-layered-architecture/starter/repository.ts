export interface Task {
  id: number;
  title: string;
  done: boolean;
}

export interface TaskRepository {
  findAll(): Promise<Task[]>;
  findById(id: number): Promise<Task | undefined>;
  findOpenByTitle(title: string): Promise<Task | undefined>;
  create(title: string): Promise<Task>;
  update(task: Task): Promise<Task>;
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<number, Task>();
  private nextId = 1;

  constructor(seed: Task[] = []) {
    seed.forEach((task) => this.tasks.set(task.id, { ...task }));
    this.nextId = Math.max(0, ...seed.map((task) => task.id)) + 1;
  }

  async findAll(): Promise<Task[]> {
    return [...this.tasks.values()].map((task) => ({ ...task }));
  }

  async findById(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    return task && { ...task };
  }

  async findOpenByTitle(title: string): Promise<Task | undefined> {
    const task = [...this.tasks.values()].find((current) => !current.done && current.title === title);
    return task && { ...task };
  }

  async create(title: string): Promise<Task> {
    const task = { id: this.nextId++, title, done: false };
    this.tasks.set(task.id, task);
    return { ...task };
  }

  async update(task: Task): Promise<Task> {
    this.tasks.set(task.id, { ...task });
    return { ...task };
  }
}
