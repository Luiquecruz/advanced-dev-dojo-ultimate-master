export default function SearchForm({ onSearch, onClear }) {
  function handleSubmit(event) {
    // TODO: prevent the page reload
    // TODO: read the "query" field with FormData, trim it, and call onSearch when it is not empty
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <input name="query" aria-label="Search" />
      <button type="submit">Search</button>
      {/* TODO: this calls onClear while rendering; it should only run on click */}
      <button type="button" onClick={onClear()}>
        Clear
      </button>
    </form>
  );
}
