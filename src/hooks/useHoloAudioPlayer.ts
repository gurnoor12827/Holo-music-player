import { useCallback, useEffect, useRef, useState } from 'react';
import type { EqualizerState, RepeatMode, ReverbPreset, TrackRecord } from '../types/music';
import { EQ_BANDS } from '../utils/equalizerPresets';

interface UseHoloAudioPlayerOptions {
  equalizer: EqualizerState;
  crossfadeSeconds: number;
  reverbPreset: ReverbPreset;
}

type DeckId = 0 | 1;

function createReverbImpulseResponse(
  ctx: AudioContext,
  preset: Exclude<ReverbPreset, 'none'>
): AudioBuffer {
  let duration = 1.0;
  let decay = 3.2;
  let damping = 0.35;
  let preDelaySec = 0.012;
  let earlyTapGain = 0.28;

  switch (preset) {
    case 'small_room':
      duration = 0.9;
      decay = 3.8;
      damping = 0.38;
      preDelaySec = 0.008;
      earlyTapGain = 0.34;
      break;
    case 'medium_hall':
      duration = 1.85;
      decay = 2.6;
      damping = 0.28;
      preDelaySec = 0.018;
      earlyTapGain = 0.28;
      break;
    case 'large_hall':
      duration = 3.1;
      decay = 1.95;
      damping = 0.22;
      preDelaySec = 0.028;
      earlyTapGain = 0.24;
      break;
    case 'plate':
      duration = 2.2;
      decay = 2.2;
      damping = 0.12;
      preDelaySec = 0.005;
      earlyTapGain = 0.32;
      break;
  }

  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * duration));
  const preDelaySamples = Math.min(length - 1, Math.floor(rate * preDelaySec));
  const buffer = ctx.createBuffer(2, length, rate);

  // Discrete early reflections (stereo decorrelated) for unmistakable room/hall presence
  const tapTimesSec = [0.006, 0.013, 0.021, 0.029, 0.038, 0.049, 0.061, 0.074];

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);

    for (let tIdx = 0; tIdx < tapTimesSec.length; tIdx++) {
      const chOffset = ch === 0 ? 0 : 0.0031;
      const samplePos = preDelaySamples + Math.floor((tapTimesSec[tIdx] + chOffset) * rate);
      if (samplePos > 0 && samplePos < length) {
        const tapSign = (tIdx + ch) % 2 === 0 ? 1 : -1;
        data[samplePos] += tapSign * earlyTapGain * Math.pow(0.82, tIdx);
      }
    }

    let lp = 0;
    const tailLen = Math.max(1, length - preDelaySamples);
    for (let i = preDelaySamples; i < length; i++) {
      const t = (i - preDelaySamples) / tailLen;
      const attack = Math.min(1, (i - preDelaySamples) / Math.max(1, rate * 0.025));
      const env = attack * Math.pow(1 - t, decay);
      const white = Math.random() * 2 - 1;
      lp = lp + (1 - damping) * (white - lp);
      data[i] += lp * env * 0.65;
    }
  }
  return buffer;
}

export function useHoloAudioPlayer({
  equalizer,
  crossfadeSeconds,
  reverbPreset,
}: UseHoloAudioPlayerOptions) {
  const decksRef = useRef<[HTMLAudioElement | null, HTMLAudioElement | null]>([null, null]);
  const deckUrlsRef = useRef<[string | null, string | null]>([null, null]);
  const activeDeckRef = useRef<DeckId>(0);
  const fadeTimerRef = useRef<number | null>(null);
  const autoCrossfadeLockRef = useRef<boolean>(false);
  const lastUiTimeRef = useRef<number>(-1);

  // Web Audio API graph refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const deckGainsRef = useRef<[GainNode | null, GainNode | null]>([null, null]);
  const bandFiltersRef = useRef<BiquadFilterNode[]>([]);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const postFxBusRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [sleepTimerMinutes, setSleepTimerTotalMinutes] = useState<number>(0);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);
  const sleepIntervalRef = useRef<number | null>(null);

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
  const crossfadeRef = useRef(crossfadeSeconds);
  const reverbRef = useRef(reverbPreset);
  const isPlayingRef = useRef(isPlaying);

  queueRef.current = queue;
  queueIndexRef.current = queueIndex;
  shuffleRef.current = shuffle;
  repeatRef.current = repeat;
  equalizerRef.current = equalizer;
  crossfadeRef.current = crossfadeSeconds;
  reverbRef.current = reverbPreset;
  isPlayingRef.current = isPlaying;

  const applyEqualizerToGraph = useCallback((eq: EqualizerState) => {
    const ctx = audioCtxRef.current;
    const filters = bandFiltersRef.current;
    const bassFilter = bassFilterRef.current;
    if (!ctx || filters.length !== EQ_BANDS.length || !bassFilter) return;

    const now = ctx.currentTime;
    for (let i = 0; i < filters.length; i++) {
      const targetGain = eq.enabled ? eq.bands[i] : 0;
      filters[i].gain.setTargetAtTime(targetGain, now, 0.015);
    }

    const bassGainDb = eq.enabled ? (eq.bassBoost / 100) * 12 : 0;
    bassFilter.gain.setTargetAtTime(bassGainDb, now, 0.015);
  }, []);

  const applyReverbToGraph = useCallback((preset: ReverbPreset) => {
    const ctx = audioCtxRef.current;
    const bass = bassFilterRef.current;
    const dry = dryGainRef.current;
    const wet = wetGainRef.current;
    if (!ctx || !bass || !dry || !wet) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    if (preset === 'none') {
      if (convolverRef.current) {
        try {
          bass.disconnect(convolverRef.current);
        } catch {
          // ignore if already disconnected
        }
        try {
          convolverRef.current.disconnect();
        } catch {
          // ignore
        }
        convolverRef.current = null;
      }
      dry.gain.setTargetAtTime(1.0, now, 0.02);
      wet.gain.setTargetAtTime(0.0, now, 0.02);
      return;
    }

    // Create a fresh ConvolverNode and assign normalize + buffer BEFORE connecting into live graph
    const nextConv = ctx.createConvolver();
    nextConv.normalize = true;
    nextConv.buffer = createReverbImpulseResponse(ctx, preset);

    if (convolverRef.current) {
      try {
        bass.disconnect(convolverRef.current);
      } catch {
        // ignore
      }
      try {
        convolverRef.current.disconnect();
      } catch {
        // ignore
      }
    }

    bass.connect(nextConv);
    nextConv.connect(wet);
    convolverRef.current = nextConv;

    const wetLevel =
      preset === 'small_room'
        ? 0.56
        : preset === 'medium_hall'
          ? 0.72
          : preset === 'large_hall'
            ? 0.88
            : 0.76;
    const dryLevel =
      preset === 'small_room'
        ? 0.88
        : preset === 'medium_hall'
          ? 0.82
          : preset === 'large_hall'
            ? 0.75
            : 0.80;

    dry.gain.setTargetAtTime(dryLevel, now, 0.02);
    wet.gain.setTargetAtTime(wetLevel, now, 0.02);
  }, []);

  const ensureWebAudioGraph = useCallback(() => {
    const deck0 = decksRef.current[0];
    const deck1 = decksRef.current[1];
    if (!deck0 || !deck1) return;

    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const source0 = ctx.createMediaElementSource(deck0);
      const source1 = ctx.createMediaElementSource(deck1);

      const gain0 = ctx.createGain();
      const gain1 = ctx.createGain();
      gain0.gain.value = activeDeckRef.current === 0 ? 1 : 0;
      gain1.gain.value = activeDeckRef.current === 1 ? 1 : 0;

      const mixer = ctx.createGain();
      mixer.gain.value = 1;

      source0.connect(gain0);
      source1.connect(gain1);
      gain0.connect(mixer);
      gain1.connect(mixer);

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

      let prev: AudioNode = mixer;
      for (const band of bands) {
        prev.connect(band);
        prev = band;
      }
      prev.connect(bass);

      // Parallel Dry / Wet Reverb bus (convolver attached dynamically when preset !== 'none')
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;

      const postFxBus = ctx.createGain();
      bass.connect(dryGain);
      dryGain.connect(postFxBus);
      wetGain.connect(postFxBus);

      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -2;
      limiter.knee.value = 6;
      limiter.ratio.value = 4;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.1;

      postFxBus.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(limiter);
      limiter.connect(ctx.destination);

      audioCtxRef.current = ctx;
      deckGainsRef.current = [gain0, gain1];
      bandFiltersRef.current = bands;
      bassFilterRef.current = bass;
      dryGainRef.current = dryGain;
      wetGainRef.current = wetGain;
      convolverRef.current = null;
      postFxBusRef.current = postFxBus;
      masterGainRef.current = masterGain;
      analyserRef.current = analyser;
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }

    applyEqualizerToGraph(equalizerRef.current);
    applyReverbToGraph(reverbRef.current);
  }, [applyEqualizerToGraph, applyReverbToGraph]);

  useEffect(() => {
    applyEqualizerToGraph(equalizer);
  }, [equalizer, applyEqualizerToGraph]);

  useEffect(() => {
    applyReverbToGraph(reverbPreset);
  }, [reverbPreset, applyReverbToGraph]);

  const stopDeckImmediate = useCallback((deckId: DeckId) => {
    const el = decksRef.current[deckId];
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    const url = deckUrlsRef.current[deckId];
    if (url) {
      URL.revokeObjectURL(url);
      deckUrlsRef.current[deckId] = null;
    }
  }, []);

  const loadAndPlayAtIndex = useCallback(
    (targetQueue: TrackRecord[], index: number, allowCrossfade = false) => {
      if (index < 0 || index >= targetQueue.length) return;

      ensureWebAudioGraph();
      const ctx = audioCtxRef.current;

      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }

      const outgoingDeckId = activeDeckRef.current;
      const outgoingEl = decksRef.current[outgoingDeckId];
      const useFade =
        allowCrossfade &&
        crossfadeRef.current > 0 &&
        Boolean(outgoingEl && !outgoingEl.paused && outgoingEl.src);

      const incomingDeckId: DeckId = useFade ? (outgoingDeckId === 0 ? 1 : 0) : outgoingDeckId;
      const incomingEl = decksRef.current[incomingDeckId];
      if (!incomingEl) return;

      if (!useFade) {
        // Stop opposite deck if one was mid-fade
        const otherId: DeckId = incomingDeckId === 0 ? 1 : 0;
        stopDeckImmediate(otherId);
        stopDeckImmediate(incomingDeckId);
      } else {
        stopDeckImmediate(incomingDeckId);
      }

      const track = targetQueue[index];
      const nextUrl = URL.createObjectURL(track.blob);
      deckUrlsRef.current[incomingDeckId] = nextUrl;

      activeDeckRef.current = incomingDeckId;
      autoCrossfadeLockRef.current = false;
      lastUiTimeRef.current = 0;

      setPlaybackError(null);
      setQueue(targetQueue);
      setQueueIndex(index);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.durationSec || 0);

      incomingEl.src = nextUrl;
      incomingEl.load();

      const outGain = deckGainsRef.current[outgoingDeckId];
      const inGain = deckGainsRef.current[incomingDeckId];
      const fadeSec = crossfadeRef.current;

      if (ctx && outGain && inGain) {
        const now = ctx.currentTime;
        if (useFade) {
          outGain.gain.cancelScheduledValues(now);
          outGain.gain.setValueAtTime(Math.max(outGain.gain.value, 0.001), now);
          outGain.gain.linearRampToValueAtTime(0, now + fadeSec);

          inGain.gain.cancelScheduledValues(now);
          inGain.gain.setValueAtTime(0, now);
          inGain.gain.linearRampToValueAtTime(1, now + fadeSec);

          fadeTimerRef.current = window.setTimeout(() => {
            stopDeckImmediate(outgoingDeckId);
            fadeTimerRef.current = null;
          }, fadeSec * 1000 + 80);
        } else {
          inGain.gain.cancelScheduledValues(now);
          inGain.gain.setValueAtTime(1, now);
        }
      }

      incomingEl
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
          setPlaybackError(`Could not decode audio file "${track.fileName}".`);
        });
    },
    [ensureWebAudioGraph, stopDeckImmediate]
  );

  const playTrackFromList = useCallback(
    (list: TrackRecord[], index: number) => {
      loadAndPlayAtIndex(list, index, isPlayingRef.current);
    },
    [loadAndPlayAtIndex]
  );

  const computeNextTrackIndex = useCallback((): number | null => {
    const activeQueue = queueRef.current;
    if (activeQueue.length === 0) return null;

    if (shuffleRef.current && activeQueue.length > 1) {
      let nextIndex = queueIndexRef.current;
      while (nextIndex === queueIndexRef.current) {
        nextIndex = Math.floor(Math.random() * activeQueue.length);
      }
      return nextIndex;
    }

    const nextIndex = queueIndexRef.current + 1;
    if (nextIndex >= activeQueue.length) {
      return repeatRef.current === 'all' ? 0 : null;
    }
    return nextIndex;
  }, []);

  const playNext = useCallback(() => {
    const activeQueue = queueRef.current;
    if (activeQueue.length === 0) return;

    if (repeatRef.current === 'one' && queueIndexRef.current >= 0) {
      const el = decksRef.current[activeDeckRef.current];
      if (el) {
        el.currentTime = 0;
        void el.play();
        setIsPlaying(true);
      }
      return;
    }

    const nextIndex = computeNextTrackIndex();
    if (nextIndex === null) {
      setIsPlaying(false);
      return;
    }

    loadAndPlayAtIndex(activeQueue, nextIndex, isPlayingRef.current);
  }, [computeNextTrackIndex, loadAndPlayAtIndex]);

  const playPrevious = useCallback(() => {
    const activeEl = decksRef.current[activeDeckRef.current];
    const activeQueue = queueRef.current;
    if (activeEl && activeEl.currentTime > 3) {
      activeEl.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (activeQueue.length === 0) return;

    let prevIndex = queueIndexRef.current - 1;
    if (prevIndex < 0) {
      prevIndex = activeQueue.length - 1;
    }
    loadAndPlayAtIndex(activeQueue, prevIndex, isPlayingRef.current);
  }, [loadAndPlayAtIndex]);

  const togglePlayPause = useCallback(
    (fallbackList?: TrackRecord[]) => {
      const activeEl = decksRef.current[activeDeckRef.current];
      if (!activeEl) return;

      if (!currentTrack) {
        if (fallbackList && fallbackList.length > 0) {
          loadAndPlayAtIndex(fallbackList, 0, false);
        }
        return;
      }

      ensureWebAudioGraph();
      if (activeEl.paused) {
        activeEl
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        activeEl.pause();
        const otherId: DeckId = activeDeckRef.current === 0 ? 1 : 0;
        decksRef.current[otherId]?.pause();
        setIsPlaying(false);
      }
    },
    [currentTrack, ensureWebAudioGraph, loadAndPlayAtIndex]
  );

  const seekTo = useCallback((seconds: number) => {
    const activeEl = decksRef.current[activeDeckRef.current];
    if (!activeEl) return;
    autoCrossfadeLockRef.current = false;
    activeEl.currentTime = seconds;
    lastUiTimeRef.current = seconds;
    setCurrentTime(seconds);
  }, []);

  const stopIfTrackRemoved = useCallback(
    (removedTrackId: string) => {
      setQueue((prev) => prev.filter((t) => t.id !== removedTrackId));
      if (currentTrack?.id === removedTrackId) {
        stopDeckImmediate(0);
        stopDeckImmediate(1);
        setCurrentTrack(null);
        setQueueIndex(-1);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    },
    [currentTrack?.id, stopDeckImmediate]
  );

  const clearPlayback = useCallback(() => {
    stopDeckImmediate(0);
    stopDeckImmediate(1);
    setQueue([]);
    setQueueIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [stopDeckImmediate]);

  useEffect(() => {
    const d0 = new Audio();
    const d1 = new Audio();
    d0.preload = 'metadata';
    d1.preload = 'metadata';
    decksRef.current = [d0, d1];

    const attachDeckListeners = (deckId: DeckId, el: HTMLAudioElement) => {
      const onTimeUpdate = () => {
        if (activeDeckRef.current !== deckId) return;
        const pos = el.currentTime || 0;
        const prev = lastUiTimeRef.current;
        if (
          prev < 0 ||
          Math.floor(pos) !== Math.floor(prev) ||
          Math.abs(pos - prev) >= 0.5
        ) {
          lastUiTimeRef.current = pos;
          setCurrentTime(pos);
        }

        const cf = crossfadeRef.current;
        if (
          cf > 0 &&
          !autoCrossfadeLockRef.current &&
          repeatRef.current !== 'one' &&
          Number.isFinite(el.duration) &&
          el.duration > cf + 1.2 &&
          el.duration - pos <= cf
        ) {
          const nextIdx = computeNextTrackIndex();
          if (nextIdx !== null) {
            autoCrossfadeLockRef.current = true;
            loadAndPlayAtIndex(queueRef.current, nextIdx, true);
          }
        }
      };

      const onLoadedMetadata = () => {
        if (activeDeckRef.current !== deckId) return;
        if (Number.isFinite(el.duration) && el.duration > 0) {
          setDuration(el.duration);
        }
      };

      const onPlay = () => {
        if (activeDeckRef.current === deckId) setIsPlaying(true);
      };

      const onPause = () => {
        if (activeDeckRef.current === deckId) setIsPlaying(false);
      };

      const onEnded = () => {
        if (activeDeckRef.current !== deckId) return;
        if (repeatRef.current === 'one') {
          el.currentTime = 0;
          void el.play();
          return;
        }
        const nextIdx = computeNextTrackIndex();
        if (nextIdx !== null) {
          loadAndPlayAtIndex(queueRef.current, nextIdx, false);
        } else {
          setIsPlaying(false);
        }
      };

      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('loadedmetadata', onLoadedMetadata);
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('ended', onEnded);

      return () => {
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('loadedmetadata', onLoadedMetadata);
        el.removeEventListener('play', onPlay);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('ended', onEnded);
      };
    };

    const cleanup0 = attachDeckListeners(0, d0);
    const cleanup1 = attachDeckListeners(1, d1);

    return () => {
      cleanup0();
      cleanup1();
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
      stopDeckImmediate(0);
      stopDeckImmediate(1);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
    };
  }, [computeNextTrackIndex, loadAndPlayAtIndex, stopDeckImmediate]);

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

  const updateTracksArtwork = useCallback(
    (targetTrackIds: Set<string>, artworkDataUrl: string | null) => {
      setQueue((prev) =>
        prev.map((t) => (targetTrackIds.has(t.id) ? { ...t, artworkDataUrl } : t))
      );
      setCurrentTrack((prev) =>
        prev && targetTrackIds.has(prev.id) ? { ...prev, artworkDataUrl } : prev
      );
    },
    []
  );

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const setSleepTimer = useCallback((minutes: number) => {
    if (sleepIntervalRef.current !== null) {
      window.clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }
    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (ctx && masterGain) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    }

    const cleanMinutes = minutes > 0 ? Math.round(minutes) : 0;
    setSleepTimerTotalMinutes(cleanMinutes);
    if (cleanMinutes === 0) {
      setSleepTimerRemainingSec(null);
      return;
    }

    let remaining = cleanMinutes * 60;
    setSleepTimerRemainingSec(remaining);

    sleepIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      const liveCtx = audioCtxRef.current;
      const liveMaster = masterGainRef.current;

      if (remaining > 0 && remaining <= 8 && liveCtx && liveMaster) {
        const nextLevel = Math.max(0.01, remaining / 8);
        liveMaster.gain.setTargetAtTime(nextLevel, liveCtx.currentTime, 0.2);
      }

      if (remaining <= 0) {
        if (sleepIntervalRef.current !== null) {
          window.clearInterval(sleepIntervalRef.current);
          sleepIntervalRef.current = null;
        }
        decksRef.current[0]?.pause();
        decksRef.current[1]?.pause();
        setIsPlaying(false);
        setSleepTimerTotalMinutes(0);
        setSleepTimerRemainingSec(null);
        if (liveCtx && liveMaster) {
          liveMaster.gain.cancelScheduledValues(liveCtx.currentTime);
          liveMaster.gain.setValueAtTime(1.0, liveCtx.currentTime);
        }
      } else {
        setSleepTimerRemainingSec(remaining);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (sleepIntervalRef.current !== null) {
        window.clearInterval(sleepIntervalRef.current);
      }
    };
  }, []);

  const getAnalyserNode = useCallback(() => {
    ensureWebAudioGraph();
    return analyserRef.current;
  }, [ensureWebAudioGraph]);

  const getAudioMotionTarget = useCallback(() => {
    ensureWebAudioGraph();
    return {
      audioCtx: audioCtxRef.current,
      sourceNode: postFxBusRef.current,
    };
  }, [ensureWebAudioGraph]);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    shuffle,
    repeat,
    playbackError,
    queueIndex,
    queueLength: queue.length,
    sleepTimerMinutes,
    sleepTimerRemainingSec,
    setSleepTimer,
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
    updateTracksArtwork,
    getAnalyserNode,
    getAudioMotionTarget,
  };
}
