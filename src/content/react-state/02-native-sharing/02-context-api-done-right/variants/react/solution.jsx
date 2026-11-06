import { createContext, use, useCallback, useMemo, useState } from 'react';

const NotificationsContext = createContext(null);

let nextId = 1;

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = 'info') => {
    const id = nextId++;
    setNotifications((previous) => [...previous, { id, message, type }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((previous) => previous.filter((notification) => notification.id !== id));
  }, []);

  const value = useMemo(() => ({ notifications, notify, dismiss }), [notifications, notify, dismiss]);

  return <NotificationsContext value={value}>{children}</NotificationsContext>;
}

export function useNotifications() {
  const context = use(NotificationsContext);
  if (context === null) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

export function NotificationList() {
  const { notifications, dismiss } = useNotifications();
  return (
    <ul aria-label="Notifications">
      {notifications.map((notification) => (
        <li key={notification.id} className={`toast toast-${notification.type}`}>
          {notification.message}
          <button aria-label={`Dismiss ${notification.message}`} onClick={() => dismiss(notification.id)}>
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function SaveDraftButton() {
  const { notify } = useNotifications();
  return <button onClick={() => notify('Draft saved', 'success')}>Save draft</button>;
}

function UploadButton() {
  const { notify } = useNotifications();
  return <button onClick={() => notify('Upload failed', 'error')}>Upload</button>;
}

function Toolbar() {
  return (
    <div role="toolbar">
      <SaveDraftButton />
      <UploadButton />
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1>Editor</h1>
      <Toolbar />
    </header>
  );
}

export default function App() {
  return (
    <NotificationsProvider>
      <Header />
      <main>
        <NotificationList />
      </main>
    </NotificationsProvider>
  );
}
