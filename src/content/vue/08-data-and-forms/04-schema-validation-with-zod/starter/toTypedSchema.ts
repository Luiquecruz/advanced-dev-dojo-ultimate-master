import type { TypedSchema, TypedSchemaError } from 'vee-validate';
import type { z } from 'zod';

export function toTypedSchema<TSchema extends z.ZodType>(schema: TSchema): TypedSchema<z.input<TSchema>, z.output<TSchema>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      // TODO: run schema.safeParseAsync(values)
      // TODO: on success return { value: result.data, errors: [] }
      // TODO: on failure group issue messages by issue.path.join('.') and return { errors: [{ path, errors }] }
      const errors: TypedSchemaError[] = [];
      return { value: values as z.output<TSchema>, errors };
    },
  };
}
