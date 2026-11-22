import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettingsState, Track } from '../types/bitchord.ts';

interface UseAudioEngineOptions {
  settings: AppSettingsState;
  onTrackEnded: () => void;
  onTrackStarted?: (track: Track) => void;
}

export function useAudioEngine({
  settings,
  onTrackEnded,
  onTrackStarted,
}: UseAudioEngineOptions) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(180);
  const [volume, setVolume] = useState(0.78);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [sleepMode, setSleepMode] = useState<'off' | 'end_of_track' | number>('off');
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const onEndedRef = useRef(onTrackEnded);
  onEndedRef.current = onTrackEnded;

  const stopSynth = useCallback(() => {
    if (synthTimerRef.current !== null) {
      window.clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
    for (const osc of oscNodesRef.current) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore already stopped
      }
    }
    oscNodesRef.current = [];
  }, []);

  const startSynthChord = useCallback(
    (track: Track, vol: number) => {
      stopSynth();
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!ctxRef.current) {
          ctxRef.current = new AudioCtx();
        }
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const master = ctx.createGain();
        master.gain.value = vol * 0.08;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value =
          settings.eqPreset === 'Warm Studio'
            ? 900
            : settings.eqPreset === 'Bass Boost'
              ? 650
              : 1400;

        master.connect(filter);
        filter.connect(ctx.destination);
        gainRef.current = master;

        const seed = track.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const rootFreqs = [130.81, 146.83, 164.81, 174.61, 196.0, 220.0];
        const root = rootFreqs[seed % rootFreqs.length];
        const ratios = [1, 1.25, 1.5, 1.875];
        const nodes: OscillatorNode[] = [];

        for (let i = 0; i < ratios.length; i++) {
          const osc = ctx.createOscillator();
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.value = root * ratios[i];
          const subGain = ctx.createGain();
          subGain.gain.value = 0.25 / (i + 1);
          osc.connect(subGain);
          subGain.connect(master);
          osc.start();
          nodes.push(osc);
        }
        oscNodesRef.current = nodes;
      } catch {
        // AudioContext blocked or unavailable; timer still advances cleanly
      }
    },
    [settings.eqPreset, stopSynth]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSynth();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [stopSynth]);

  // Sync volume & playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
    if (gainRef.current) {
      gainRef.current.gain.value = volume * 0.08;
    }
  }, [volume, settings.playbackSpeed]);

  // Sleep timer countdown
  useEffect(() => {
    if (typeof sleepMode !== 'number') {
      setSleepSecondsLeft(null);
      return;
    }
    setSleepSecondsLeft(sleepMode * 60);
    const id = window.setInterval(() => {
      setSleepSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.pause();
          stopSynth();
          setSleepMode('off');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [sleepMode, stopSynth]);

  // Playback progress loop
  useEffect(() => {
    if (!isPlaying || !currentTrack) {
      setAudioLevel(0);
      return;
    }
    const interval = window.setInterval(() => {
      if (currentTrack.previewUrl && audioRef.current && !audioRef.current.paused) {
        const cur = audioRef.current.currentTime;
        const dur = Number.isFinite(audioRef.current.duration)
          ? audioRef.current.duration
          : currentTrack.durationSec;
        setCurrentTimeSec(cur);
        setDurationSec(dur);
        setAudioLevel(0.35 + Math.abs(Math.sin(cur * 3.1)) * 0.55);

        const remaining = dur - cur;
        if (settings.crossfadeSeconds > 0 && remaining > 0 && remaining <= settings.crossfadeSeconds) {
          setIsCrossfading(true);
        } else {
          setIsCrossfading(false);
        }
        return;
      }

      setCurrentTimeSec((prev) => {
        const next = prev + 0.25 * settings.playbackSpeed;
        const targetDur = currentTrack.durationSec || 180;
        const remaining = targetDur - next;
        if (settings.crossfadeSeconds > 0 && remaining > 0 && remaining <= settings.crossfadeSeconds) {
          setIsCrossfading(true);
        } else {
          setIsCrossfading(false);
        }
        setAudioLevel(0.28 + Math.abs(Math.sin(next * 2.4)) * 0.5);
        if (next >= targetDur) {
          if (sleepMode === 'end_of_track') {
            setIsPlaying(false);
            stopSynth();
            setSleepMode('off');
            return targetDur;
          }
          onEndedRef.current();
          return 0;
        }
        return next;
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [isPlaying, currentTrack, settings.playbackSpeed, settings.crossfadeSeconds, sleepMode, stopSynth]);

  const playTrack = useCallback(
    (track: Track) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopSynth();
      setCurrentTrack(track);
      setCurrentTimeSec(0);
      setDurationSec(track.durationSec || 180);
      setIsCrossfading(false);
      setIsPlaying(true);
      onTrackStarted?.(track);

      if (track.previewUrl) {
        const audio = new Audio(track.previewUrl);
        audio.volume = volume;
        audio.playbackRate = settings.playbackSpeed;
        audio.onloadedmetadata = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setDurationSec(audio.duration);
          }
        };
        audio.onended = () => {
          if (sleepMode === 'end_of_track') {
            setIsPlaying(false);
            setSleepMode('off');
            return;
          }
          onEndedRef.current();
        };
        audio.onerror = () => {
          startSynthChord(track, volume);
        };
        audioRef.current = audio;
        audio.play().catch(() => {
          startSynthChord(track, volume);
        });
      } else {
        startSynthChord(track, volume);
      }
    },
    [volume, settings.playbackSpeed, sleepMode, startSynthChord, stopSynth, onTrackStarted]
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      stopSynth();
      setIsPlaying(false);
    } else {
      if (currentTrack.previewUrl && audioRef.current) {
        audioRef.current.play().catch(() => startSynthChord(currentTrack, volume));
      } else {
        startSynthChord(currentTrack, volume);
      }
      setIsPlaying(true);
    }
  }, [currentTrack, isPlaying, volume, startSynthChord, stopSynth]);

  const seek = useCallback((sec: number) => {
    const clamped = Math.max(0, Math.min(sec, durationSec));
    setCurrentTimeSec(clamped);
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = Math.min(clamped, audioRef.current.duration);
    }
  }, [durationSec]);

  return {
    currentTrack,
    isPlaying,
    currentTimeSec,
    durationSec,
    volume,
    setVolume,
    audioLevel,
    isCrossfading,
    sleepMode,
    setSleepMode,
    sleepSecondsLeft,
    playTrack,
    togglePlay,
    seek,
  };
}
