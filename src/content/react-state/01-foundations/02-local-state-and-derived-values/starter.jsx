import { useEffect, useState } from 'react';

export const sampleNotifications = [
  { id: 1, title: 'Invoice #42 paid', read: false },
  { id: 2, title: 'New comment on your report', read: true },
  { id: 3, title: 'Deploy finished', read: false },
  { id: 4, title: 'Weekly summary ready', read: false },
];

export function NotificationsPanel({ notifications }) {
  // TODO: do not copy the prop into state; keep a Set of ids marked as read instead
  const [items, setItems] = useState(notifications);
  const [filter, setFilter] = useState('all');
  // TODO: derive these two values during render and delete both Effects
  const [visible, setVisible] = useState(notifications);
  const [unreadCount, setUnreadCount] = useState(notifications.filter((notification) => !notification.read).length);
  // TODO: store the selected id, not a copy of the object
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setVisible(filter === 'unread' ? items.filter((notification) => !notification.read) : items);
  }, [items, filter]);

  useEffect(() => {
    setUnreadCount(items.filter((notification) => !notification.read).length);
  }, [items]);

  function markRead(id) {
    setItems(items.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
  }

  function markAllRead() {
    setItems(items.map((notification) => ({ ...notification, read: true })));
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
          <li key={notification.id} className={notification.read ? 'read' : 'unread'}>
            <button onClick={() => setSelected(notification)}>{notification.title}</button>
            {!notification.read && (
              <button aria-label={`Mark ${notification.title} as read`} onClick={() => markRead(notification.id)}>
                Mark as read
              </button>
            )}
          </li>
        ))}
      </ul>
      <button onClick={markAllRead}>Mark all as read</button>
      <p data-testid="details">
        {selected ? `${selected.title} (${selected.read ? 'read' : 'unread'})` : 'Nothing selected'}
      </p>
    </section>
  );
}

export default function App() {
  return <NotificationsPanel notifications={sampleNotifications} />;
}
