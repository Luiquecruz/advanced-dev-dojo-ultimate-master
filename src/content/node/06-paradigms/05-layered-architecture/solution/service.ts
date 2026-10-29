import { ConflictError, NotFoundError, ValidationError } from './errors';
import type { Task, TaskRepository } from './repository';

export class TaskService {
  constructor(private readonly tasks: TaskRepository) {}

  list(): Promise<Task[]> {
    return this.tasks.findAll();
  }

  async get(id: number): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new NotFoundError(`Task ${id} not found`);
    }
    return task;
  }

  async create(rawTitle: string): Promise<Task> {
    const title = rawTitle.trim();
    if (!title) {
      throw new ValidationError('Title is required');
    }
    if (await this.tasks.findOpenByTitle(title)) {
      throw new ConflictError(`A task named "${title}" is already open`);
    }
    return this.tasks.create(title);
  }

  async complete(id: number): Promise<Task> {
    const task = await this.get(id);
    if (task.done) {
      throw new ConflictError(`Task ${id} is already done`);
    }
    return this.tasks.update({ ...task, done: true });
  }
}
