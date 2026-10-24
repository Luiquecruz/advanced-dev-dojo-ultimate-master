import { Component, PureComponent } from 'react';

export class PriceTag extends Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.price !== this.props.price || nextProps.currency !== this.props.currency;
  }

  render() {
    return (
      <span>
        {this.props.currency} {this.props.price.toFixed(2)}
      </span>
    );
  }
}

export class Row extends PureComponent {
  render() {
    return <li>{this.props.label}</li>;
  }
}

export class EmailEditor extends Component {
  state = { email: this.props.defaultEmail, prevUserId: this.props.userId };

  static getDerivedStateFromProps(props, state) {
    if (props.userId !== state.prevUserId) {
      return { email: props.defaultEmail, prevUserId: props.userId };
    }
    return null;
  }

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
