import { Component, createRef, forwardRef } from 'react';

// TODO: wrap this component with forwardRef and attach the forwarded ref to the <input>
export function LegacyInput({ label }) {
  return (
    <label>
      {label}
      <input />
    </label>
  );
}

export function ModernInput({ label }) {
  // TODO: receive ref as a regular prop and attach it to the <input>
  return (
    <label>
      {label}
      <input />
    </label>
  );
}

export class SearchForm extends Component {
  // TODO: create this.inputRef with createRef()

  // TODO: focus the input in componentDidMount

  clear = () => {
    // TODO: empty the input value and focus it
  };

  render() {
    return (
      <form>
        <LegacyInput label="Search" />
        <button type="button" onClick={this.clear}>
          Clear
        </button>
      </form>
    );
  }
}

export default function App() {
  return <SearchForm />;
}
