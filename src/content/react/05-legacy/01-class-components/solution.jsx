import { Component } from 'react';

export default class Counter extends Component {
  static defaultProps = { label: 'Count', step: 1 };

  state = { count: 0 };

  increment = () => {
    this.setState((prev) => ({ count: prev.count + this.props.step }));
  };

  incrementTwice = () => {
    this.increment();
    this.increment();
  };

  reset = () => {
    this.setState({ count: 0 });
  };

  render() {
    return (
      <div>
        <p>
          {this.props.label}: {this.state.count}
        </p>
        <button onClick={this.increment}>Increment</button>
        <button onClick={this.incrementTwice}>Increment twice</button>
        <button onClick={this.reset}>Reset</button>
      </div>
    );
  }
}
