import { createContext, useContext, useState } from 'react';

// TODO: use null as the default so a missing provider can be detected
const NotificationsContext = createContext({ notifications: [], notify: () => {}, dismiss: () => {} });

let nextId = 1;

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // TODO: keep notify and dismiss stable across renders
  function notify(message, type = 'info') {
    const id = nextId++;
    setNotifications([...notifications, { id, message, type }]);
    return id;
  }

  function dismiss(id) {
    setNotifications(notifications.filter((notification) => notification.id !== id));
  }

  // TODO: memoize the value and render the context with the React 19 syntax
  return (
    <NotificationsContext.Provider value={{ notifications, notify, dismiss }}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  // TODO: throw an Error mentioning NotificationsProvider when there is no provider
  return useContext(NotificationsContext);
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
  // TODO: every component that calls useNotifications must render inside the provider
  return (
    <>
      <Header />
      <NotificationsProvider>
        <main>
          <NotificationList />
        </main>
      </NotificationsProvider>
    </>
  );
}
