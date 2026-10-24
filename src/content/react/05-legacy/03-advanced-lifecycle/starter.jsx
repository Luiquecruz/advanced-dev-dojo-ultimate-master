import { Component, PureComponent } from 'react';

export class PriceTag extends Component {
  // TODO: implement shouldComponentUpdate(nextProps): true only when price or currency change

  render() {
    // TODO: render "<currency> <price with 2 decimals>" inside a <span>
    return <span />;
  }
}

// TODO: make Row skip re-renders when its props are shallowly equal
export class Row extends Component {
  render() {
    return <li>{this.props.label}</li>;
  }
}

export class EmailEditor extends Component {
  state = { email: this.props.defaultEmail, prevUserId: this.props.userId };

  // TODO: add static getDerivedStateFromProps(props, state) that resets email when userId changes

  handleChange = (event) => {
    this.setState({ email: event.target.value });
  };

  render() {
    return <input aria-label="Email" value={this.state.email} onChange={this.handleChange} />;
  }
}

export default function App() {
  return (
    <div>
      <PriceTag price={10} currency="USD" lastChecked={Date.now()} />
      <ul>
        <Row label="First row" />
      </ul>
      <EmailEditor userId={1} defaultEmail="ada@example.com" />
    </div>
  );
}
