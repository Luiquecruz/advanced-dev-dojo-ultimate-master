import { z } from 'zod';
import type { ToolDefinition } from '@dojo/ai';
import { ORDERS } from './orders';

export class ToolError extends Error {
  readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'ToolError';
    this.hint = hint;
  }
}

export interface ToolSpec<Schema extends z.ZodType> {
  name: string;
  description: string;
  input: Schema;
  run(args: z.output<Schema>): unknown | Promise<unknown>;
}

export interface DefinedTool {
  definition: ToolDefinition;
  call(rawArguments: string): Promise<string>;
}

function parametersOf(input: z.ZodType): Record<string, unknown> {
  const { $schema, ...parameters } = z.toJSONSchema(input, { io: 'input' }) as Record<string, unknown>;
  return parameters;
}

function describeIssues(issues: Array<{ path: PropertyKey[]; message: string }>): string {
  return issues.map((issue) => `- ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n');
}

export function defineTool<Schema extends z.ZodType>({ name, description, input, run }: ToolSpec<Schema>): DefinedTool {
  return {
    definition: { name, description, parameters: parametersOf(input) },
    async call(rawArguments: string): Promise<string> {
      let raw: unknown;
      try {
        raw = JSON.parse(rawArguments);
      } catch {
        return `Error: arguments for ${name} must be a JSON object, and this text is not valid JSON.`;
      }
      const parsed = input.safeParse(raw);
      if (!parsed.success) {
        return `Error: invalid arguments for ${name}.\n${describeIssues(parsed.error.issues)}`;
      }
      try {
        const result = await run(parsed.data);
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (error) {
        if (error instanceof ToolError) {
          return error.hint ? `Error: ${error.message}\nHint: ${error.hint}` : `Error: ${error.message}`;
        }
        return `Error: ${name} failed unexpectedly. Try again later, or tell the user the lookup is unavailable.`;
      }
    },
  };
}

export const searchOrdersInput = z
  .object({
    customerEmail: z.email().describe('Email address the customer used at checkout.'),
    status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).optional().describe('Only return orders in this status. Omit to include every status.'),
    limit: z.number().int().min(1).max(20).default(5).describe('Maximum number of orders to return, most recent first (1 to 20, default 5).'),
  })
  .strict();

export const searchOrders = defineTool({
  name: 'search_orders',
  description:
    "Find a customer's orders by the email used at checkout, most recent first. Returns each order's id, status, total and date, plus how many orders matched. Use it before answering any question about a customer's orders.",
  input: searchOrdersInput,
  run({ customerEmail, status, limit }) {
    const email = customerEmail.toLowerCase();
    const customerOrders = ORDERS.filter((order) => order.customerEmail === email);
    if (customerOrders.length === 0) {
      throw new ToolError(`No customer with the email ${customerEmail}.`, 'Ask the customer to confirm the email address they used at checkout.');
    }
    const matching = customerOrders.filter((order) => status === undefined || order.status === status).sort((left, right) => right.placedAt.localeCompare(left.placedAt));
    const orders = matching.slice(0, limit).map(({ id, status: orderStatus, total, placedAt }) => ({ id, status: orderStatus, total, placedAt }));
    const truncated = matching.length > limit;
    return truncated
      ? { orders, total: matching.length, truncated, hint: `Showing the ${limit} most recent of ${matching.length} orders. Filter by status or raise limit (up to 20) to see more.` }
      : { orders, total: matching.length, truncated };
  },
});
