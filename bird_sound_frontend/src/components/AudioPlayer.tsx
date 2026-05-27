import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import './AudioPlayerOverrides.css';

type Props = {
  src: string;
  title?: string;
};

export default function SimpleAudioPlayer({ src, title }: Props) {
  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {title && (
        <p className="text-sm font-medium text-white/80 truncate px-4 pt-3 pb-1">{title}</p>
      )}
      <AudioPlayer
        src={src}
        showJumpControls={false}
        showDownloadProgress
        showFilledProgress
        customAdditionalControls={[]}
        customVolumeControls={[]}
        layout="horizontal-reverse"
        className="rhap-dark-theme"
      />
    </div>
  );
}