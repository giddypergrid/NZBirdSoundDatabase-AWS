import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBird, useBirdImages } from 'hooks/useQueries';
import BirdAudio from 'components/BirdAudioSection';
import DefaultHeader from 'staticComponents/DefaultHeader';
import Footer from 'staticComponents/Footer';
import ImageNotFound from 'components/ImageNotFound';

const BirdDetailPage: React.FC = () => {
  const { eBird } = useParams<{ eBird: string }>();
  const { data: bird, isLoading } = useBird(eBird ?? '');
  const images = useBirdImages(bird ?? null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forest-800">
        <DefaultHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!bird) {
    return (
      <div className="min-h-screen bg-forest-800">
        <DefaultHeader />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Bird not found</h2>
          <Link to="/" className="text-white/60 hover:text-white transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forest-800 flex flex-col">
      <DefaultHeader />

      <main className="flex-1">
        {/* Back link */}
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all birds
          </Link>
        </div>

        {/* Bird info section */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Description */}
            <div>
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-2">
                Know this bird well
              </p>
              <h1 className="text-4xl font-bold text-white mb-2">
                {bird.common_name}
              </h1>
              <p className="text-lg text-white/50 italic mb-6">
                {bird.scientific_name}
              </p>
              {bird.naughty_description && (
                <p className="text-sm text-amber-200/80 italic mb-5 leading-relaxed">
                  &ldquo;{bird.naughty_description}&rdquo;
                </p>
              )}

              <div className="space-y-4 text-sm text-white/70 leading-relaxed">
                {bird.description ? (
                  <p>{bird.description}</p>
                ) : (
                  <p className="text-white/40 italic">
                    No description available yet for this bird.
                  </p>
                )}
              </div>

              <div className="mt-6 p-4 bg-forest-700/100 border border-white/10 rounded-xl">
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-2">
                  What it sounds like
                </p>
                <p className="text-sm text-white/70 leading-relaxed">
                  {bird.sound_description || 'No sound description available yet.'}
                </p>
              </div>
            </div>

            {/* Right: Image gallery */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[4/3] bg-forest-700/50 rounded-2xl overflow-hidden border border-white/10">
                {images.length === 0 ? (
                  <ImageNotFound message="No photos yet" />
                ) : (
                  <img
                    src={images[activeImageIndex]}
                    alt={`${bird.common_name} ${activeImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex(i => i > 0 ? i - 1 : images.length - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex(i => i < images.length - 1 ? i + 1 : 0)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  </>
                )}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-full text-xs text-white/80">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                  {images.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        idx === activeImageIndex
                          ? 'border-white/60 opacity-100'
                          : 'border-transparent opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio section */}
        <div className="max-w-6xl mx-auto px-6 pb-12">
          <BirdAudio bird={bird} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BirdDetailPage;
