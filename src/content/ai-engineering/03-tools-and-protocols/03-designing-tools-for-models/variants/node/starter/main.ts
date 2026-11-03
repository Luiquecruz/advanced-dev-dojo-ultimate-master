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

export function defineTool<Schema extends z.ZodType>({ name, description, input, run }: ToolSpec<Schema>): DefinedTool {
  return {
    // TODO: derive parameters from the Zod schema with z.toJSONSchema(input, { io: 'input' }), without the $schema key
    definition: { name, description, parameters: { type: 'object' } },
    async call(rawArguments: string): Promise<string> {
      // TODO: never throw: broken JSON, schema failures (one "- path: message" line per issue), ToolError and unexpected errors all become "Error: ..." strings
      const result = await run(JSON.parse(rawArguments));
      return JSON.stringify(result);
    },
  };
}

// TODO: describe every field, reject unknown keys, bound limit to 1..20 with a default of 5
export const searchOrdersInput = z.object({
  customerEmail: z.string(),
  status: z.string().optional(),
  limit: z.number().optional(),
});

export const searchOrders = defineTool({
  name: 'search_orders',
  // TODO: say what the tool returns and when to use it
  description: 'Searches orders.',
  input: searchOrdersInput,
  run({ customerEmail, status }) {
    // TODO: unknown customer -> ToolError with a hint; most recent first; only id, status, total, placedAt; total, truncated and a hint when truncated
    return ORDERS.filter((order) => order.customerEmail === customerEmail && (status === undefined || order.status === status));
  },
});
