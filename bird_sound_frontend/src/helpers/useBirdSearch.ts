import { useCallback, useMemo, useRef, useState } from 'react';
import { Bird, SearchByDescriptionHit } from 'types/bird';
import { searchApi } from 'services/api';

export type SearchMode = 'name' | 'description';

/**
 * Unified bird search that supports both name (substring) and description
 * (semantic) modes.
 *
 *  - `filteredBirds`: the Bird[] to display, in the right order.
 *  - `handleSearch(query, mode)`: run a search. Mode defaults to 'name'.
 *  - `semanticHits`: raw hit metadata (score, best_field, strong_match) for
 *    the most recent description search, indexed by eBird. Empty for name
 *    searches.
 *  - `isSearching`: true while a semantic request is in flight.
 *  - `searchError`: error message if the description endpoint failed.
 *  - `activeMode`: which mode produced the current `filteredBirds` list.
 */
export const useBirdSearch = (allBirds: Bird[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMode, setActiveMode] = useState<SearchMode>('name');
  const [semanticEBirdIds, setSemanticEBirdIds] = useState<string[]>([]);
  const [semanticHitMap, setSemanticHitMap] = useState<Record<string, SearchByDescriptionHit>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Prevent out-of-order responses from clobbering a newer query.
  const latestRequestId = useRef(0);

  const filteredBirds: Bird[] = useMemo(() => {
    if (!searchQuery) return allBirds;

    if (activeMode === 'name') {
      const q = searchQuery.toLowerCase();
      return allBirds.filter(b => b.common_name.toLowerCase().includes(q));
    }
    // description mode: order by semanticEBi {rdIds, keep only birds we have data for
    if (semanticEBirdIds.length === 0 && activeMode === "description") return [];
    const eBirdToBird = new Map(allBirds.map(b => [b.eBird, b]));
    return semanticEBirdIds
      .map(ebird => eBirdToBird.get(ebird))
      .filter((b) => Boolean(b)) as Bird[];
  }, [searchQuery, activeMode, semanticEBirdIds, allBirds]);

  const handleSearch = useCallback(async (query: string, mode: SearchMode = 'name') => {
    const trimmed = query.trim();
    setSearchQuery(trimmed);
    setActiveMode(mode);
    setSearchError(null);
    setValidationError(null);

    if (!trimmed) {
      setSemanticEBirdIds([]);
      setSemanticHitMap({});
      return;
    }

    if (mode === 'name') {
      // synchronous substring filter handled by useMemo
      setSemanticEBirdIds([]);
      setSemanticHitMap({});
      return;
    }

    // mode === 'description': validate word count
    const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 3) {
      setValidationError('Description search requires at least 3 words');
      setSemanticEBirdIds([]);
      setSemanticHitMap({});
      return;
    }
    if (wordCount > 200) {
      setValidationError(`Description is too long (${wordCount} words). Please keep it under 200 words.`);
      setSemanticEBirdIds([]);
      setSemanticHitMap({});
      return;
    }

    // call the semantic-search endpoint
    const requestId = ++latestRequestId.current;
    setIsSearching(true);
    try {
      const { data } = await searchApi.byDescription(trimmed, 4);
      if (requestId !== latestRequestId.current) return; // stale response
      const semanticEBirdIds = data.results.map(r => r.eBird);
      const map: Record<string, SearchByDescriptionHit> = {};
      data.results.forEach(r => { map[r.eBird] = r; });
      setSemanticEBirdIds(semanticEBirdIds);
      setSemanticHitMap(map);
    } catch (err: any) {
      if (requestId !== latestRequestId.current) return;
      console.error('Semantic search failed:', err);
      setSemanticEBirdIds([]);
      setSemanticHitMap({});
      setSearchError(err?.response?.data?.error || 'Search failed. Try again.');
    } finally {
      if (requestId === latestRequestId.current) {
        setIsSearching(false);
      }
    }
  }, []);

  return {
    filteredBirds,
    handleSearch,
    activeMode,
    semanticHitMap,
    isSearching,
    searchError,
    validationError,
    searchQuery,
  };
};
