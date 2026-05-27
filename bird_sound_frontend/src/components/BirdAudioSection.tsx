import React, { useState, useMemo } from 'react';
import { Bird, BirdSound, BirdSoundFilterParams } from 'types/bird'
import { useBirdSoundList } from 'hooks/useQueries'
import BirdAudioItem from './BirdAudioItem';
import AudioFilters from './AudioFilters';
import { DEFAULT_BIRD_BATCH_SIZE } from 'settings';
import InfiniteScrollArea from './InfiniteScrollArea';

type Props = {
  bird: Bird
}

const BirdAudio = ({bird}: Props) => {
  const [filters, setFilters] = useState<BirdSoundFilterParams>({});
  const { data: birdSounds = [], isLoading } = useBirdSoundList(bird, filters);
  const hasSounds = !isLoading && birdSounds.length > 0;
  const stations = useMemo(() => {
    const set = new Set(birdSounds.map((s) => s.station).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [birdSounds]);

  const recordingModes = useMemo(() => {
    const set = new Set(birdSounds.map((s) => s.recording_mode).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [birdSounds]);

  return (
    <div className="w-full bg-forest-700/30 rounded-2xl overflow-hidden flex flex-col border border-white/10">
      {/* Header */}

      {hasSounds ? (
        <>
          <div className="px-6 py-5 border-b border-white/10 shrink-0">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">Listen</p>
            <h3 className="text-2xl font-bold text-white">Sounds recorded</h3>
            <p className="text-sm text-white/40 mt-1">
              {isLoading ? 'Loading...' : `Sort by call type, season, or behavior to isolate the sound you're after. ${birdSounds.length} recordings available.`}
            </p>
          </div>
          {/* Filters */}
          <AudioFilters
            onFilterChange={setFilters}
            stations={stations}
            recordingModes={recordingModes}
          />

          {/* Sound list */}
          <div className="p-4 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-sm text-white/40">Loading audio files...</span>
                </div>
              </div>
            ) : (
              <InfiniteScrollArea<BirdSound, 'id'>
                ItemComponent={BirdAudioItem}
                BatchSize={DEFAULT_BIRD_BATCH_SIZE}
                ItemIndexType="id"
                items={birdSounds}
                listClassName="flex flex-col"
                className="w-full h-full overflow-y-auto scrollbar-thin pr-1"
              />
            )}
          </div>
        </>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-6 py-5 border-b border-white/10 shrink-0">
          <h3 className="text-2xl font-bold text-white">No Sound available</h3>
        </div>
      )}
    </div>
  )
}

export default BirdAudio;