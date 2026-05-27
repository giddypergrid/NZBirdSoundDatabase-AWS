import React from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import SearchBar from "components/SearchBar";
import DefaultHeader from "staticComponents/DefaultHeader";
import Footer from "staticComponents/Footer";
import { Bird } from "types/bird";
import BirdCard from "components/BirdCard";
import { DEFAULT_BIRD_BATCH_SIZE } from "settings";
import InfiniteScrollArea from "components/InfiniteScrollArea";
import { useBirdSearch } from "helpers/useBirdSearch";
import HeroSection from "components/HeroSection";
import loadingBirdAnimation from "assets/LoadingBird.json";
import { useBirdList } from "hooks/useQueries";

const HomePage: React.FC = () => {
  const { data: allBirds = [] } = useBirdList();
  const {
    filteredBirds,
    handleSearch,
    activeMode,
    isSearching,
    searchError,
    validationError,
    searchQuery,
  } = useBirdSearch(allBirds);
  const navigate = useNavigate();

  const handleBirdClick = (bird: Bird) => {
    navigate(`/bird/${encodeURIComponent(bird.eBird)}`);
  };

  return (
    <div className="min-h-screen bg-forest-800 flex flex-col">
      <DefaultHeader />

      {/* Hero Section */}
      <HeroSection birds={allBirds} />

      {/* Search Section */}
      <section id="search-section" className="bg-forest-900/50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Find bird sounds in our database
          </h2>
        </div>
        <div className="max-w-4xl mx-auto px-6">
          <SearchBar onSearch={handleSearch} allBirds={allBirds} />
          {validationError && (
            <div className="mt-4 w-full h-3 max-w-2xl mx-auto bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 text-center flex items-center justify-center">
              <p className="text-yellow-200 text-sm">{validationError}</p>
            </div>
          )}
          {searchError && (
            <div className="mt-4 w-full h-3 max-w-2xl mx-auto bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-center flex items-center justify-center">
              <p className="text-red-200 text-sm">{searchError}</p>
            </div>
          )}
        </div>
      </section>

      {/* Bird Cards Grid */}
      <section id="database-section" className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">
                {activeMode === 'description' ? 'Closest matches' : 'Browse'}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {isSearching
                  ? 'Searching...'
                  : filteredBirds.length === allBirds.length
                    ? 'All birds in the database'
                    : activeMode === 'description'
                      ? `Top ${filteredBirds.length} matches`
                      : `${filteredBirds.length} birds found`}
              </h2>
              <p className="text-sm text-white/40 mt-1">
                {activeMode === 'description' && !isSearching && filteredBirds.length > 0
                  ? 'Ranked by how well each bird fits your description.'
                  : 'Click a card to explore photos, details, and recordings.'}
              </p>
            </div>
            {filteredBirds.length !== allBirds.length && (
              <button
                onClick={() => handleSearch('', 'name')}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                View all
              </button>
            )}
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Lottie animationData={loadingBirdAnimation} className="w-32 h-32" />
              <p className="text-white/60 mt-4">Searching...</p>
            </div>
          ) : (
            <InfiniteScrollArea<Bird, 'eBird'>
              ItemComponent={BirdCard}
              BatchSize={DEFAULT_BIRD_BATCH_SIZE}
              ItemIndexType="eBird"
              items={filteredBirds}
              className="w-full"
              onItemClick={handleBirdClick}
            />
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
