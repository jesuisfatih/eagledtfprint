'use client';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  return (
    <input
      type="text"
      className="form-control"
      placeholder="Search companies..."
      onChange={(e) => onSearch(e.target.value)}
      style={{ maxWidth: '300px' }}
    />
  );
}

