import { z } from 'zod';

// TODO: email must be a valid email ("Enter a valid email")
// TODO: password needs at least 8 characters ("Password must be at least 8 characters")
// TODO: confirm must equal password ("Passwords do not match", reported on the "confirm" path)
export const signupSchema = z.object({
  email: z.string(),
  password: z.string(),
  confirm: z.string(),
});

export type SignupValues = z.infer<typeof signupSchema>;
