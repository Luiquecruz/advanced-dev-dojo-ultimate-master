export class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    // TODO: return the front item in O(1) without Array.prototype.shift (keep a head index)
    return this.items.shift();
  }

  peek(): T | undefined {
    // TODO: return the front item without removing it
    return undefined;
  }

  get size(): number {
    return this.items.length;
  }
}

export interface Step {
  name: string;
  up: () => void | Promise<void>;
  down: () => void | Promise<void>;
}

export async function runSteps(steps: Step[]): Promise<string[]> {
  // TODO: run each up in order; on failure undo the completed steps newest first, then rethrow
  for (const step of steps) {
    await step.up();
  }
  return steps.map((step) => step.name);
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
