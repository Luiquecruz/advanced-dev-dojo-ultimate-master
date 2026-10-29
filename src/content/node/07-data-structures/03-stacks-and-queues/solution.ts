export class Queue<T> {
  private items: Array<T | undefined> = [];
  private head = 0;

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head === this.items.length) {
      return undefined;
    }
    const item = this.items[this.head];
    this.items[this.head] = undefined;
    this.head++;
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  peek(): T | undefined {
    return this.head < this.items.length ? this.items[this.head] : undefined;
  }

  get size(): number {
    return this.items.length - this.head;
  }
}

export interface Step {
  name: string;
  up: () => void | Promise<void>;
  down: () => void | Promise<void>;
}

export async function runSteps(steps: Step[]): Promise<string[]> {
  const completed: Step[] = [];
  try {
    for (const step of steps) {
      await step.up();
      completed.push(step);
    }
  } catch (error) {
    while (completed.length > 0) {
      const step = completed.pop()!;
      try {
        await step.down();
      } catch (rollbackError) {
        console.error(`Rollback of ${step.name} failed:`, rollbackError);
      }
    }
    throw error;
  }
  return completed.map((step) => step.name);
}

const jobs = new Queue<string>();
jobs.enqueue('send-welcome-email');
jobs.enqueue('resize-avatar');
console.log(jobs.dequeue(), jobs.size);

runSteps([
  { name: 'create-user', up: () => console.log('user created'), down: () => console.log('user deleted') },
  { name: 'create-workspace', up: () => console.log('workspace created'), down: () => console.log('workspace deleted') },
  { name: 'charge-card', up: () => { throw new Error('Card declined'); }, down: () => console.log('refund') },
]).catch((error) => console.log(`Signup failed: ${error.message}`));
