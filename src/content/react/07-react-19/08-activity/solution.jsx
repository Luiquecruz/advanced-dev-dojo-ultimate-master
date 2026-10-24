import { Activity, useEffect, useState } from 'react';

export const connectionLog = [];

function ComposePanel() {
  const [message, setMessage] = useState('');
  return (
    <label>
      Message
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
    </label>
  );
}

function HistoryPanel() {
  useEffect(() => {
    connectionLog.push('connect');
    return () => {
      connectionLog.push('disconnect');
    };
  }, []);
  return <h2>History</h2>;
}

export default function MailTabs() {
  const [tab, setTab] = useState('compose');

  return (
    <div>
      <button onClick={() => setTab('compose')}>Compose</button>
      <button onClick={() => setTab('history')}>History</button>
      <Activity mode={tab === 'compose' ? 'visible' : 'hidden'}>
        <ComposePanel />
      </Activity>
      <Activity mode={tab === 'history' ? 'visible' : 'hidden'}>
        <HistoryPanel />
      </Activity>
    </div>
  );
}
