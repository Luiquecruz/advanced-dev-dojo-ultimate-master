import { z } from 'zod';

export const signupSchema = z.object({
  // TODO: username: trimmed string, min 3 -> 'Username must be at least 3 characters'
  username: z.string(),
  // TODO: email: Zod 4 top-level email format -> 'Enter a valid email'
  email: z.string(),
  // TODO: age: coerce the input string to an integer, min 18 -> 'You must be at least 18'
  age: z.string(),
  // TODO: password: min 8 -> 'Password must be at least 8 characters'
  password: z.string(),
  confirmPassword: z.string(),
});
// TODO: add .refine(...) so confirmPassword must equal password -> 'Passwords do not match' on path ['confirmPassword']
