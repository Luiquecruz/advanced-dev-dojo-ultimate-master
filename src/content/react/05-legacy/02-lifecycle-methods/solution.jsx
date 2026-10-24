import { Component } from 'react';

export default class UserProfile extends Component {
  state = { user: null };

  controller = null;

  componentDidMount() {
    this.loadUser();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.loadUser();
    }
  }

  componentWillUnmount() {
    this.controller?.abort();
  }

  loadUser() {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.setState({ user: null });
    fetch(`/api/users/${this.props.userId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((user) => this.setState({ user }))
      .catch((error) => {
        if (error.name !== 'AbortError') throw error;
      });
  }

  render() {
    const { user } = this.state;
    if (!user) {
      return <p>Loading...</p>;
    }
    return (
      <article>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </article>
    );
  }
}
