import { Search } from 'lucide-react';
import { useSearch } from './SearchProvider.jsx';

/** Circular 44 px search trigger used in the site navigation and dashboard top bar. */
export default function SearchButton({ className = '' }) {
  const { open, isOpen } = useSearch();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open search"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title="Search (Ctrl K)"
      className={`icon-btn ${className}`}
    >
      <Search className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden="true" />
    </button>
  );
}
