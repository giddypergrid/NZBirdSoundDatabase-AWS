import React, { forwardRef } from 'react';
import { Clock } from 'lucide-react';
import { BirdSound } from 'types/bird';
import { useAudioUrl } from 'hooks/useQueries';
import AudioPlayer from './AudioPlayer';

type Props = {
  item: BirdSound;
};

const BirdAudioItem = forwardRef<HTMLDivElement, Props>(({ item }, ref) => {
  const { data: audioUrl } = useAudioUrl(item);

  const displayName = item.filename
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .slice(0, 40);

  return (
    <div ref={ref} className="border-b border-white/5 py-3 px-2">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {item.recording_mode && (
              <span className="text-xs text-white/60 font-medium">{item.recording_mode}</span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-white truncate">{displayName}</h4>
          <p className="text-xs text-white/40 mt-0.5 truncate">
            {item.station ? `Recorded at ${item.station}` : item.filename}
          </p>
        </div>
      </div>
      <AudioPlayer src={audioUrl || ''} />
    </div>
  );
});

BirdAudioItem.displayName = 'BirdAudioItem';

export default BirdAudioItem;
