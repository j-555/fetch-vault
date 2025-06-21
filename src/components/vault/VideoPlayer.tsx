import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface VideoPlayerProps {
  videoUrl: string;
  fileName: string;
}

export function VideoPlayer({ videoUrl, fileName }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // format time for display (mm:ss)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // handle scrub bar
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  // handle mute toggle
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // handle video click to toggle play/pause
  const handleVideoClick = () => {
    togglePlay();
  };

  // handle mouse movement to show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    // hide controls after 3 seconds of no movement
    setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // update current time and handle events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // theme colors
  const getBackgroundColor = () => {
    return theme === 'dark' ? 'bg-gray-900' : 'bg-gray-200';
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

  return (
    <div 
      ref={containerRef}
      className={`relative ${getBackgroundColor()} ${getBorderColor()} rounded-lg overflow-hidden`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto cursor-pointer"
        onClick={handleVideoClick}
        preload="metadata"
      />

      {/* overlay controls */}
      <div className={`absolute inset-0 transition-opacity duration-300 video-player-controls ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* file name overlay */}
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/50 text-white text-sm font-medium`}>
          {fileName}
        </div>

        {/* center play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="p-4 rounded-full transition-all bg-indigo-500/80 hover:bg-indigo-600/80 text-white backdrop-blur-sm"
          >
            {isPlaying ? (
              <PauseIcon className="w-8 h-8" />
            ) : (
              <PlayIcon className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* scrub bar */}
          <div className="w-full mb-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleScrub}
              className="video-scrub-bar w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.3) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.3) 100%)`
              }}
            />
          </div>

          {/* control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* play/pause button */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-full transition-colors bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
              </button>

              {/* time display */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* volume controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="p-1 rounded transition-colors hover:bg-white/20 text-white"
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
                  className="video-volume-slider w-16 h-1 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) 100%)`
                  }}
                />
              </div>
            </div>

            {/* fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded transition-colors hover:bg-white/20 text-white"
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 