import { z } from 'zod';

export const signupSchema = z
  .object({
    username: z.string().trim().min(3, 'Username must be at least 3 characters'),
    email: z.email('Enter a valid email'),
    age: z.coerce.number().int().min(18, 'You must be at least 18'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  });
