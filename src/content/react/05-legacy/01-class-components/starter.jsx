import { Component } from 'react';

export default class Counter extends Component {
  // TODO: declare static defaultProps with label 'Count' and step 1

  // TODO: initialize state with count 0

  increment() {
    // TODO: add this.props.step to the count with the updater form of setState
  }

  incrementTwice() {
    // TODO: call setState twice so the count grows by 2 * step
  }

  reset() {
    // TODO: set the count back to 0
  }

  render() {
    return (
      <div>
        {/* TODO: render "<label>: <count>" in a <p> */}
        <p>Count: 0</p>
        <button onClick={this.increment}>Increment</button>
        <button onClick={this.incrementTwice}>Increment twice</button>
        <button onClick={this.reset}>Reset</button>
      </div>
    );
  }
}
