export default function SearchForm({ onSearch, onClear }) {
  function handleSubmit(event) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('query')).trim();
    if (query) {
      onSearch(query);
    }
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <input name="query" aria-label="Search" />
      <button type="submit">Search</button>
      <button type="button" onClick={onClear}>
        Clear
      </button>
    </form>
  );
}
