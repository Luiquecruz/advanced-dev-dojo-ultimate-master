import { useState } from 'react';

export const sampleNotifications = [
  { id: 1, title: 'Invoice #42 paid', read: false },
  { id: 2, title: 'New comment on your report', read: true },
  { id: 3, title: 'Deploy finished', read: false },
  { id: 4, title: 'Weekly summary ready', read: false },
];

export function NotificationsPanel({ notifications }) {
  const [filter, setFilter] = useState('all');
  const [readIds, setReadIds] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);

  const isRead = (notification) => notification.read || readIds.has(notification.id);
  const unreadCount = notifications.filter((notification) => !isRead(notification)).length;
  const visible = filter === 'unread' ? notifications.filter((notification) => !isRead(notification)) : notifications;
  const selected = notifications.find((notification) => notification.id === selectedId) ?? null;

  function markRead(id) {
    setReadIds((previous) => new Set(previous).add(id));
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((notification) => notification.id)));
  }

  return (
    <section>
      <h2>
        Notifications <span data-testid="unread-count">{unreadCount} unread</span>
      </h2>
      <div role="group" aria-label="Filter">
        <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </button>
        <button aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
          Unread
        </button>
      </div>
      <ul>
        {visible.map((notification) => (
          <li key={notification.id} className={isRead(notification) ? 'read' : 'unread'}>
            <button onClick={() => setSelectedId(notification.id)}>{notification.title}</button>
            {!isRead(notification) && (
              <button aria-label={`Mark ${notification.title} as read`} onClick={() => markRead(notification.id)}>
                Mark as read
              </button>
            )}
          </li>
        ))}
      </ul>
      <button onClick={markAllRead}>Mark all as read</button>
      <p data-testid="details">
        {selected ? `${selected.title} (${isRead(selected) ? 'read' : 'unread'})` : 'Nothing selected'}
      </p>
    </section>
  );
}

export default function App() {
  return <NotificationsPanel notifications={sampleNotifications} />;
}
