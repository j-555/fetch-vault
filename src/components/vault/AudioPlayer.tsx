import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
}

export function AudioPlayer({ audioUrl, fileName }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { theme } = useTheme();

  // format time for display (mm:ss)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // handle play/pause
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // handle scrub bar
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // handle mute toggle
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // theme colors
  const getBackgroundColor = () => {
    return theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200';
  };

  const getTextColor = () => {
    return theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  };

  const getBorderColor = () => {
    return theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  };

  const getSliderTrackColor = () => {
    return theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300';
  };

  const getSliderThumbColor = () => {
    return theme === 'dark' ? 'bg-pink-400' : 'bg-pink-500';
  };

  return (
    <div className={`p-4 rounded-lg border ${getBackgroundColor()} ${getBorderColor()}`}>
      {/* file name */}
      <div className={`text-sm font-medium mb-3 ${getTextColor()}`}>
        {fileName}
      </div>

      {/* audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* controls */}
      <div className="flex items-center space-x-4 mb-3">
        {/* play/pause button */}
        <button
          onClick={togglePlay}
          className={`p-2 rounded-full transition-colors ${
            theme === 'dark' 
              ? 'bg-pink-500 hover:bg-pink-600 text-white' 
              : 'bg-pink-500 hover:bg-pink-600 text-white'
          }`}
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </button>

        {/* time display */}
        <div className={`text-sm ${getTextColor()}`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* volume controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className={`p-1 rounded transition-colors ${
              theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="w-4 h-4" />
            ) : (
              <SpeakerWaveIcon className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className={`w-16 h-1 rounded-lg appearance-none cursor-pointer ${
              getSliderTrackColor()
            }`}
            style={{
              background: `linear-gradient(to right, ${theme === 'dark' ? '#ec4899' : '#ec4899'} 0%, ${theme === 'dark' ? '#ec4899' : '#ec4899'} ${(isMuted ? 0 : volume) * 100}%, ${theme === 'dark' ? '#4b5563' : '#d1d5db'} ${(isMuted ? 0 : volume) * 100}%, ${theme === 'dark' ? '#4b5563' : '#d1d5db'} 100%)`
            }}
          />
        </div>
      </div>

      {/* scrub bar */}
      <div className="w-full">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleScrub}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
            getSliderTrackColor()
          }`}
          style={{
            background: `linear-gradient(to right, ${theme === 'dark' ? '#ec4899' : '#ec4899'} 0%, ${theme === 'dark' ? '#ec4899' : '#ec4899'} ${duration ? (currentTime / duration) * 100 : 0}%, ${theme === 'dark' ? '#4b5563' : '#d1d5db'} ${duration ? (currentTime / duration) * 100 : 0}%, ${theme === 'dark' ? '#4b5563' : '#d1d5db'} 100%)`
          }}
        />
      </div>
    </div>
  );
} 