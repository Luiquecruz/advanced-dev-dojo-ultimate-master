import { Component, createRef, forwardRef } from 'react';

export const LegacyInput = forwardRef(function LegacyInput({ label }, ref) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
});

export function ModernInput({ label, ref }) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}

export class SearchForm extends Component {
  inputRef = createRef();

  componentDidMount() {
    this.inputRef.current.focus();
  }

  clear = () => {
    this.inputRef.current.value = '';
    this.inputRef.current.focus();
  };

  render() {
    return (
      <form>
        <LegacyInput label="Search" ref={this.inputRef} />
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
