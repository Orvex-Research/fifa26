'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { decryptStreamUrl } from '@/lib/crypto';
import { RefreshCw } from 'lucide-react';

interface VideoPlayerProps {
  obfuscatedUrl: string;
  channelName: string;
  onError?: () => void;
}

export default function VideoPlayer({ obfuscatedUrl, channelName, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerRef = useRef<Plyr | null>(null);
  
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const initPlayer = () => {
    const video = videoRef.current;
    const url = obfuscatedUrl ? decryptStreamUrl(obfuscatedUrl) : '';
    if (!video || !url) return;

    setHasError(false);
    setErrorMessage('');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const defaultOptions: Plyr.Options = {
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
      ],
      settings: ['quality', 'speed'],
      autoplay: true,
      ratio: '16:9',
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // Expose qualities to Plyr
        const availableQualities = hls.levels.map((l) => l.height);
        availableQualities.unshift(0); // 0 corresponds to Auto

        defaultOptions.quality = {
          default: availableQualities[0],
          options: availableQualities,
          forced: true,
          onChange: (newQuality: number) => {
            if (newQuality === 0) {
              hls.currentLevel = -1; // Auto
            } else {
              hls.levels.forEach((level, levelIndex) => {
                if (level.height === newQuality) {
                  hls.currentLevel = levelIndex;
                }
              });
            }
          },
        };

        playerRef.current = new Plyr(video, defaultOptions);
        
        // Ensure auto play policy
        const promise = video.play();
        if (promise !== undefined) {
          promise.catch(() => {
            // Autoplay blocked, wait for user
          });
        }
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setHasError(true);
              setErrorMessage('Network error: The stream is offline or blocked.');
              onError?.();
              hls.destroy();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setHasError(true);
              setErrorMessage('Failed to decode stream.');
              onError?.();
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native support (Safari)
      video.src = url;
      playerRef.current = new Plyr(video, defaultOptions);
      
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(() => {});
      }
      
      video.addEventListener('error', () => {
        setHasError(true);
        setErrorMessage('Failed to load stream natively.');
        onError?.();
      });
    } else {
      setHasError(true);
      setErrorMessage('Your browser does not support HLS streaming.');
    }
  };

  useEffect(() => {
    initPlayer();
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [obfuscatedUrl]);

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden border border-white/5">
      {/* Error overlay removed as requested */}


      {/* Override Plyr CSS styling slightly to match dark UI perfectly */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --plyr-color-main: #3b82f6;
          --plyr-video-background: #000;
          --plyr-menu-background: rgba(0, 0, 0, 0.9);
          --plyr-menu-color: #fff;
        }
        .plyr--video {
          border-radius: 0.75rem;
          overflow: hidden;
        }
      `}} />

      {/* Top Banner indicating channel name */}
      <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10 flex items-center gap-3">
        <span className="text-white font-bold text-sm md:text-base drop-shadow-md">
          {channelName || 'Live Stream'}
        </span>
      </div>

      <video ref={videoRef} className="w-full h-full" playsInline crossOrigin="anonymous" />
    </div>
  );
}
