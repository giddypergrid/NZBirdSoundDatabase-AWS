import React, { useState, useEffect, useRef } from "react";
import { Search, FileText } from "lucide-react";
import { Bird } from "types/bird";
import AIBorder from "components/AIBorder";

type SearchMode = 'name' | 'description';

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode) => void;
  allBirds: Bird[];
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, allBirds, placeholder }) => {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [mode, setMode] = useState<SearchMode>('name');
  const containerRef = useRef<HTMLDivElement>(null);

  const placeholderText = placeholder || (mode === 'name' ? 'Search by bird name...' : 'Describe the bird you saw...');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, mode);
    setShowDropdown(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (mode === 'name') setShowDropdown(true);
  };

  const handleOptionClick = (birdName: string) => {
    setQuery(birdName);
    onSearch(birdName, 'name');
    setShowDropdown(false);
  };

  const hintBirds = mode === 'name'
    ? allBirds.filter((bird) => bird.common_name.toLowerCase().includes(query.toLowerCase()))
    : [];

  useEffect(() => {
    const handleDropDownClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleDropDownClickOutside);
    return () => document.removeEventListener("mousedown", handleDropDownClickOutside)
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto" ref={containerRef}>
      {/* Mode tabs */}
      <div className="flex items-center gap-1 mb-3">
        <button
          type="button"
          onClick={() => { setMode('name'); setQuery(''); setShowDropdown(false); onSearch('', 'name'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            mode === 'name'
              ? 'bg-white/10 text-white border border-white/30'
              : 'text-white/40 hover:text-white/60 border border-transparent'
          }`}
        >
          <Search className="w-3 h-3" />
          Search by name
        </button>
        <AIBorder showBadge={true} className="ml-1">
          <button
            type="button"
            onClick={() => { setMode('description'); setQuery(''); setShowDropdown(false); onSearch('', 'description'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              mode === 'description'
                ? 'bg-white/10 text-white border border-white/30'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            }`}
          >
            <FileText className="w-3 h-3" />
            Search by description
          </button>
        </AIBorder>
      </div>

      {/* Search input */}
      <form className="w-full" onSubmit={handleSubmit}>
        <div className="relative w-full flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              className="w-full bg-white/10 border border-white/15 pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/30"
              value={query}
              onChange={handleChange}
              onFocus={() => mode === 'name' && setShowDropdown(true)}
              placeholder={placeholderText}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-white hover:bg-white/90 text-forest-900 font-semibold rounded-xl transition-colors text-sm shrink-0"
          >
            Search
          </button>
        </div>

        {/* Dropdown for name search */}
        {showDropdown && query.length > 0 && mode === 'name' && hintBirds.length > 0 && (
          <ul className="mt-1 w-full bg-forest-700 border border-white/10 rounded-xl shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
            {hintBirds.slice(0, 10).map((bird) => (
              <li
                key={bird.eBird}
                onClick={() => handleOptionClick(bird.common_name)}
                className="px-4 py-2.5 cursor-pointer transition-colors hover:bg-white/10 text-sm text-white/80 border-b border-white/5 last:border-0"
              >
                <span className="font-medium text-white">{bird.common_name}</span>
                <span className="text-white/40 ml-2 text-xs italic">{bird.scientific_name}</span>
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
