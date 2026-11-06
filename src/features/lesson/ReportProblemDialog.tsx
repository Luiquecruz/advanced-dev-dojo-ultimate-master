import { useEffect, useRef, useState, type FormEvent } from 'react';
import { sendFeedback } from '@/shared/monitoring/monitoring';
import { buttonClass, iconButtonClass } from '@/shared/ui/classNames';
import { CrossIcon } from '@/shared/ui/icons';

const FIELD_CLASS =
  'w-full rounded-md border border-line-strong bg-code px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/40';

/**
 * Form that sends a learner's problem report on the open waypoint to Sentry, with the waypoint tags and the buffered session replay.
 * Closing it with Escape, the close button or the backdrop returns focus to the element that opened it; `onClose` must be stable.
 */
export function ReportProblemDialog({ onClose }: { onClose(): void }) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [opener] = useState(() => document.activeElement);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (sent ? closeRef : fieldRef).current?.focus();
  }, [sent]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [onClose, opener]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    sendFeedback(message.trim(), email.trim());
    setSent(true);
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 grid place-items-center bg-scrim p-6 backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex w-[min(520px,100%)] flex-col rounded-[14px] border border-line-strong bg-panel shadow-float" role="dialog" aria-modal="true" aria-labelledby="report-problem-title">
        <header className="flex items-center justify-between gap-2.5 px-4.5 py-3.5">
          <h2 id="report-problem-title" className="m-0 text-lg font-semibold">
            Report a problem
          </h2>
          <button className={iconButtonClass()} onClick={onClose} title="Close">
            <CrossIcon />
          </button>
        </header>
        {sent ? (
          <>
            <p className="m-0 px-4.5 pb-4 text-sm text-ink-muted" role="status">
              Thanks, the report was sent.
            </p>
            <footer className="flex justify-end border-t border-line px-4.5 py-3.5">
              <button ref={closeRef} className={buttonClass('primary')} onClick={onClose}>
                Close
              </button>
            </footer>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="flex flex-col gap-3 px-4.5 pb-4">
              <p className="m-0 text-sm text-ink-muted">
                A test that fails a correct answer, a misleading hint, something that does not load. The waypoint, your browser and a replay of the last minute, with text and code masked, are sent with it.
              </p>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                What happened?
                <textarea className={FIELD_CLASS} rows={5} required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} ref={fieldRef} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                <span>
                  Email <span className="font-normal text-ink-faint">(optional, only to answer you)</span>
                </span>
                <input className={FIELD_CLASS} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            </div>
            <footer className="flex items-center justify-end gap-2.5 border-t border-line px-4.5 py-3.5">
              <button type="button" className={buttonClass('ghost')} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={buttonClass('primary')} disabled={message.trim() === ''}>
                Send report
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
