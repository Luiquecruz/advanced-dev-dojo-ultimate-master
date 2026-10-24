export function FormField({ label, hint, type = 'text' }) {
  // TODO: generate a unique id with useId() and derive the hint id from it
  return (
    <div>
      <label htmlFor="field">{label}</label>
      <input id="field" type={type} aria-describedby="field-hint" />
      <p id="field-hint">{hint}</p>
    </div>
  );
}

export default function SignupForm() {
  return (
    <form>
      <FormField label="Email" hint="We never share it." type="email" />
      <FormField label="Backup email" hint="Used to recover your account." type="email" />
    </form>
  );
}
