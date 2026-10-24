import { Component } from 'react';

// TODO: migrate this class to a function component using useState and useEffect
export default class RoomStatus extends Component {
  state = { count: 0 };

  componentDidMount() {
    this.subscribe();
    this.updateTitle();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.roomId !== this.props.roomId) {
      this.unsubscribe();
      this.setState({ count: 0 });
      this.subscribe();
    }
    this.updateTitle();
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  subscribe() {
    this.unsubscribe = this.props.chat.subscribe(this.props.roomId, this.handleMessage);
  }

  updateTitle() {
    document.title = `(${this.state.count}) ${this.props.roomId}`;
  }

  handleMessage = () => {
    this.setState((prev) => ({ count: prev.count + 1 }));
  };

  clear = () => {
    this.setState({ count: 0 });
  };

  render() {
    return (
      <section>
        <h2>Room: {this.props.roomId}</h2>
        <p>Messages: {this.state.count}</p>
        <button onClick={this.clear}>Clear</button>
      </section>
    );
  }
}
