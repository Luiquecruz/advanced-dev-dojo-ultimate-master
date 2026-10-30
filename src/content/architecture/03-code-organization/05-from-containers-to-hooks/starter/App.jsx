import { Component } from 'react';

// TODO: replace this class container with a function App that calls useUserDirectory() and renders <UserDirectory />
export default class App extends Component {
  state = { status: 'loading', users: [], query: '' };

  componentDidMount() {
    fetch('/api/users')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((users) => {
        if (!this.unmounted) this.setState({ status: 'success', users });
      })
      .catch(() => {
        if (!this.unmounted) this.setState({ status: 'error' });
      });
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  render() {
    const { status, users, query } = this.state;
    const normalizedQuery = query.trim().toLowerCase();
    const visibleUsers = users.filter((user) => user.name.toLowerCase().includes(normalizedQuery));
    return (
      <section aria-label="User directory">
        <h1>Team</h1>
        <label>
          Filter users
          <input value={query} onChange={(event) => this.setState({ query: event.target.value })} />
        </label>
        {status === 'loading' && <p>Loading users...</p>}
        {status === 'error' && <p role="alert">Could not load users</p>}
        {status === 'success' && (
          <ul aria-label="Users">
            {visibleUsers.map((user) => (
              <li key={user.id}>
                {user.name} ({user.role})
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
}
