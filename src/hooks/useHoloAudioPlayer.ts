import { useCallback, useEffect, useRef, useState } from 'react';
import type { EqualizerState, RepeatMode, TrackRecord } from '../types/music';
import { EQ_BANDS } from '../utils/equalizerPresets';

interface UseHoloAudioPlayerOptions {
  equalizer: EqualizerState;
}

export function useHoloAudioPlayer({ equalizer }: UseHoloAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Web Audio API graph refs (initialized once on first user gesture)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bandFiltersRef = useRef<BiquadFilterNode[]>([]);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);

  const [queue, setQueue] = useState<TrackRecord[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const equalizerRef = useRef(equalizer);

  queueRef.current = queue;
  queueIndexRef.current = queueIndex;
  shuffleRef.current = shuffle;
  repeatRef.current = repeat;
  equalizerRef.current = equalizer;

  const applyEqualizerToGraph = useCallback((eq: EqualizerState) => {
    const ctx = audioCtxRef.current;
    const filters = bandFiltersRef.current;
    const bassFilter = bassFilterRef.current;
    if (!ctx || filters.length !== EQ_BANDS.length || !bassFilter) {
      return;
    }

    const now = ctx.currentTime;
    for (let i = 0; i < filters.length; i++) {
      const targetGain = eq.enabled ? eq.bands[i] : 0;
      filters[i].gain.setTargetAtTime(targetGain, now, 0.015);
    }

    const bassGainDb = eq.enabled ? (eq.bassBoost / 100) * 12 : 0;
    bassFilter.gain.setTargetAtTime(bassGainDb, now, 0.015);
  }, []);

  const ensureWebAudioGraph = useCallback(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audioEl);

      const bands: BiquadFilterNode[] = EQ_BANDS.map((band) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = band.frequency;
        filter.Q.value = band.q;
        filter.gain.value = 0;
        return filter;
      });

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 85;
      bass.gain.value = 0;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -2;
      limiter.knee.value = 6;
      limiter.ratio.value = 4;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.1;

      let prev: AudioNode = source;
      for (const band of bands) {
        prev.connect(band);
        prev = band;
      }
      prev.connect(bass);
      bass.connect(limiter);
      limiter.connect(ctx.destination);

      audioCtxRef.current = ctx;
      sourceNodeRef.current = source;
      bandFiltersRef.current = bands;
      bassFilterRef.current = bass;
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }

    applyEqualizerToGraph(equalizerRef.current);
  }, [applyEqualizerToGraph]);

  // Apply EQ changes live whenever the user adjusts sliders, presets, bass boost, or ON/OFF
  useEffect(() => {
    applyEqualizerToGraph(equalizer);
  }, [equalizer, applyEqualizerToGraph]);

  const loadAndPlayAtIndex = useCallback(
    (targetQueue: TrackRecord[], index: number) => {
      const audioEl = audioRef.current;
      if (!audioEl || index < 0 || index >= targetQueue.length) return;

      const track = targetQueue[index];
      setPlaybackError(null);
      ensureWebAudioGraph();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const nextUrl = URL.createObjectURL(track.blob);
      objectUrlRef.current = nextUrl;

      setQueue(targetQueue);
      setQueueIndex(index);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.durationSec || 0);

      audioEl.src = nextUrl;
      audioEl.load();

      audioEl
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
          setPlaybackError(`Could not decode audio file "${track.fileName}".`);
        });
    },
    [ensureWebAudioGraph]
  );

  const playTrackFromList = useCallback(
    (list: TrackRecord[], index: number) => {
      loadAndPlayAtIndex(list, index);
    },
    [loadAndPlayAtIndex]
  );

  const playNext = useCallback(() => {
    const activeQueue = queueRef.current;
    if (activeQueue.length === 0) return;

    if (repeatRef.current === 'one' && queueIndexRef.current >= 0) {
      const audioEl = audioRef.current;
      if (audioEl) {
        audioEl.currentTime = 0;
        void audioEl.play();
        setIsPlaying(true);
      }
      return;
    }

    let nextIndex: number;
    if (shuffleRef.current && activeQueue.length > 1) {
      nextIndex = queueIndexRef.current;
      while (nextIndex === queueIndexRef.current) {
        nextIndex = Math.floor(Math.random() * activeQueue.length);
      }
    } else {
      nextIndex = queueIndexRef.current + 1;
      if (nextIndex >= activeQueue.length) {
        if (repeatRef.current === 'all') {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    loadAndPlayAtIndex(activeQueue, nextIndex);
  }, [loadAndPlayAtIndex]);

  const playPrevious = useCallback(() => {
    const audioEl = audioRef.current;
    const activeQueue = queueRef.current;
    if (audioEl && audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (activeQueue.length === 0) return;

    let prevIndex = queueIndexRef.current - 1;
    if (prevIndex < 0) {
      prevIndex = activeQueue.length - 1;
    }
    loadAndPlayAtIndex(activeQueue, prevIndex);
  }, [loadAndPlayAtIndex]);

  const togglePlayPause = useCallback(
    (fallbackList?: TrackRecord[]) => {
      const audioEl = audioRef.current;
      if (!audioEl) return;

      if (!currentTrack) {
        if (fallbackList && fallbackList.length > 0) {
          loadAndPlayAtIndex(fallbackList, 0);
        }
        return;
      }

      ensureWebAudioGraph();
      if (audioEl.paused) {
        audioEl
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        audioEl.pause();
        setIsPlaying(false);
      }
    },
    [currentTrack, ensureWebAudioGraph, loadAndPlayAtIndex]
  );

  const seekTo = useCallback((seconds: number) => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const stopIfTrackRemoved = useCallback(
    (removedTrackId: string) => {
      setQueue((prev) => prev.filter((t) => t.id !== removedTrackId));
      if (currentTrack?.id === removedTrackId) {
        const audioEl = audioRef.current;
        if (audioEl) {
          audioEl.pause();
          audioEl.src = '';
        }
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setCurrentTrack(null);
        setQueueIndex(-1);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    },
    [currentTrack?.id]
  );

  const clearPlayback = useCallback(() => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setQueue([]);
    setQueueIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Create persistent single HTMLAudioElement once
  useEffect(() => {
    const audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioRef.current = audioEl;

    const handleTimeUpdate = () => {
      setCurrentTime(audioEl.currentTime || 0);
    };
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
        setDuration(audioEl.duration);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      if (repeatRef.current === 'one') {
        audioEl.currentTime = 0;
        void audioEl.play();
        return;
      }
      const activeQueue = queueRef.current;
      if (activeQueue.length === 0) {
        setIsPlaying(false);
        return;
      }
      if (shuffleRef.current && activeQueue.length > 1) {
        let nextIndex = queueIndexRef.current;
        while (nextIndex === queueIndexRef.current) {
          nextIndex = Math.floor(Math.random() * activeQueue.length);
        }
        loadAndPlayAtIndex(activeQueue, nextIndex);
        return;
      }
      const nextIdx = queueIndexRef.current + 1;
      if (nextIdx < activeQueue.length) {
        loadAndPlayAtIndex(activeQueue, nextIdx);
      } else if (repeatRef.current === 'all') {
        loadAndPlayAtIndex(activeQueue, 0);
      } else {
        setIsPlaying(false);
      }
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.pause();
      audioEl.src = '';
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
    };
  }, [loadAndPlayAtIndex]);

  // Browser MediaSession integration (for Android Chrome lockscreen / notification playback)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: currentTrack.artworkDataUrl
          ? [{ src: currentTrack.artworkDataUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    } catch {
      // ignore unsupported MediaSession handlers
    }
  }, [currentTrack, playNext, playPrevious, togglePlayPause]);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    shuffle,
    repeat,
    playbackError,
    playTrackFromList,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    cycleRepeat,
    toggleShuffle,
    stopIfTrackRemoved,
    clearPlayback,
    ensureWebAudioGraph,
  };
}
