Destructure everything from one call: `const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });`.
---
Spread the registration on each input: `<input id="email" type="email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />`.
---
Make `onSubmit` async with `try { await onLogin(data); } catch (error) { setError('root.serverError', { message: error.message }); }`. Because it returns a promise, `isSubmitting` stays `true` until it settles.
---
Render `{errors.root?.serverError && <p role="alert">{errors.root.serverError.message}</p>}` and `<button disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>`.
