import { ConflictError, NotFoundError, ValidationError } from './errors';
import type { Task, TaskRepository } from './repository';

export class TaskService {
  constructor(private readonly tasks: TaskRepository) {}

  list(): Promise<Task[]> {
    return this.tasks.findAll();
  }

  async get(id: number): Promise<Task> {
    // TODO: return the task or throw NotFoundError('Task <id> not found')
    throw new Error('Not implemented');
  }

  async create(title: string): Promise<Task> {
    // TODO: trim the title, throw ValidationError('Title is required') when empty, ConflictError when an open task has the same title, then create it
    throw new Error('Not implemented');
  }

  async complete(id: number): Promise<Task> {
    // TODO: load the task, throw ConflictError('Task <id> is already done') when done, otherwise save it with done: true
    throw new Error('Not implemented');
  }
}
