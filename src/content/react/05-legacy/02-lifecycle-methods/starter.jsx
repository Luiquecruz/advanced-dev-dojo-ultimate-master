import { Component } from 'react';

export default class UserProfile extends Component {
  state = { user: null };

  componentDidMount() {
    this.loadUser();
  }

  // TODO: add componentDidUpdate(prevProps) and reload when the userId prop changes

  // TODO: add componentWillUnmount and abort the in-flight request

  loadUser() {
    // TODO: abort the previous request and keep an AbortController on the instance
    this.setState({ user: null });
    fetch(`/api/users/${this.props.userId}`)
      .then((response) => response.json())
      .then((user) => this.setState({ user }));
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
