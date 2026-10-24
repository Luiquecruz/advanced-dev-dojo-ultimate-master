import { useState } from 'react';
import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  // TODO: read `pending` with useFormStatus()
  return <button type="submit">Subscribe</button>;
}

export function SendingHint() {
  // TODO: while pending, render <p role="status">Sending to {email}</p>
  return null;
}

export default function NewsletterForm({ onSubscribe = async () => {} }) {
  const [done, setDone] = useState(false);

  async function subscribe(formData) {
    // TODO: await onSubscribe with the "email" field, then mark as done
  }

  if (done) {
    return <p>Thanks for subscribing!</p>;
  }

  return (
    <form action={subscribe}>
      <label>
        Email
        <input name="email" type="email" />
      </label>
      {/* TODO: render <SendingHint /> and <SubmitButton /> inside the form */}
    </form>
  );
}
