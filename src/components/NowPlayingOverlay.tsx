import {
  ChevronDown,
  Clock,
  Disc3,
  Heart,
  ListMusic,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  AppSettingsState,
  LyricLine,
  LyricsProvider,
  LyricsResponse,
  ThemePreset,
  Track,
} from '../types/bitchord.ts';
import { ArtworkImage } from './ArtworkImage.tsx';

interface NowPlayingOverlayProps {
  open: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  volume: number;
  audioLevel: number;
  isCrossfading: boolean;
  isLiked: boolean;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Track[];
  preset: ThemePreset;
  settings: AppSettingsState;
  lyricOffsetMs: number;
  sleepMode: 'off' | 'end_of_track' | number;
  sleepSecondsLeft: number | null;
  onTogglePlay: () => void;
  onSeek: (sec: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleLike: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onVolumeChange: (v: number) => void;
  onPlayQueueTrack: (t: Track) => void;
  onUpdateOffsetMs: (trackId: string, offsetMs: number) => void;
  onUpdateSettings: (patch: Partial<AppSettingsState>) => void;
  onSetSleepMode: (mode: 'off' | 'end_of_track' | number) => void;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function NowPlayingOverlay({
  open,
  onClose,
  track,
  isPlaying,
  currentTimeSec,
  durationSec,
  volume,
  audioLevel,
  isCrossfading,
  isLiked,
  shuffle,
  repeatMode,
  queue,
  preset,
  settings,
  lyricOffsetMs,
  sleepMode,
  sleepSecondsLeft,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onToggleLike,
  onToggleShuffle,
  onCycleRepeat,
  onVolumeChange,
  onPlayQueueTrack,
  onUpdateOffsetMs,
  onUpdateSettings,
  onSetSleepMode,
}: NowPlayingOverlayProps) {
  const [rightTab, setRightTab] = useState<'lyrics' | 'queue'>('lyrics');
  const [provider, setProvider] = useState<LyricsProvider>('LRCLIB');
  const [showRomanized, setShowRomanized] = useState(true);
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  useEffect(() => {
    if (!open || !track) return;
    let active = true;
    setLoadingLyrics(true);
    const params = new URLSearchParams({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: String(track.durationSec),
      provider,
    });
    fetch(`/api/lyrics?${params.toString()}`)
      .then((r) => r.json())
      .then((data: LyricsResponse) => {
        if (active) setLyricsData(data);
      })
      .catch(() => {
        if (active) setLyricsData(null);
      })
      .finally(() => {
        if (active) setLoadingLyrics(false);
      });
    return () => {
      active = false;
    };
  }, [open, track, provider]);

  if (!open || !track) return null;

  const lines: LyricLine[] = lyricsData?.lines || [];
  const effectiveMs = currentTimeSec * 1000 + lyricOffsetMs;
  let activeLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timeMs <= effectiveMs) {
      activeLineIndex = i;
    } else {
      break;
    }
  }

  const reactiveScale =
    preset.background.mode === 'kawarp' && isPlaying
      ? preset.background.scale + audioLevel * 0.08 * preset.background.reactive
      : preset.background.scale;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#090a0f] text-slate-100"
      role="dialog"
      aria-label="Now Playing"
    >
      {/* Dynamic Artwork Backdrop (shader.rs / ArtworkMeshBackdrop parity) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={track.artworkUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 ease-out"
          style={{
            transform: `scale(${reactiveScale.toFixed(3)})`,
            filter: `blur(64px) saturate(${preset.background.saturation})`,
            opacity: Math.max(0.18, 1 - preset.background.npDim),
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 25% 35%, ${preset.accent}22, transparent 55%), linear-gradient(180deg, rgba(9,10,15,0.45) 0%, rgba(9,10,15,0.88) 100%)`,
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-6 border-b border-white/10 px-8 py-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <ChevronDown className="h-4 w-4" />
          Back to Library
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span>{preset.name} Theme</span>
          <span aria-hidden="true">·</span>
          <span>{track.sampleRate || track.quality}</span>
          {isCrossfading && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-emerald-400">
                Automix Transition ({settings.crossfadeSeconds}s)
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
          <button
            onClick={() => setRightTab('lyrics')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              rightTab === 'lyrics'
                ? 'bg-white text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Synced Lyrics
          </button>
          <button
            onClick={() => setRightTab('queue')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              rightTab === 'queue'
                ? 'bg-white text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Up Next ({queue.length})
          </button>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-12 overflow-y-auto px-8 py-8 lg:grid-cols-12">
        {/* Left: Artwork + Transport + Audio Controls */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <div className="mx-auto w-full max-w-[360px]">
            <div className="relative aspect-square w-full overflow-hidden shadow-2xl">
              {preset.cover.spinningVinyl ? (
                <div
                  className={`relative h-full w-full rounded-full border-4 border-white/15 bg-black p-6 shadow-2xl ${
                    isPlaying ? 'animate-vinyl-spin' : ''
                  }`}
                >
                  <ArtworkImage
                    src={track.artworkUrl}
                    alt={track.title}
                    className="h-full w-full rounded-full"
                  />
                  <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-[#090a0f]" />
                </div>
              ) : (
                <ArtworkImage
                  src={track.artworkUrl}
                  alt={track.title}
                  className="h-full w-full"
                  radiusPx={preset.cover.radius}
                />
              )}
            </div>

            <div className="mt-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl font-bold text-white">
                  {track.title}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-300">
                  {track.artist} · {track.album}
                </p>
              </div>
              <button
                onClick={onToggleLike}
                aria-label={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                className="mt-1 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0"
              >
                <Heart
                  className={`h-5 w-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`}
                />
              </button>
            </div>

            {/* Seek Bar */}
            <div className="mt-6">
              <input
                type="range"
                min={0}
                max={Math.max(1, durationSec)}
                step={0.5}
                value={Math.min(currentTimeSec, durationSec)}
                onChange={(e) => onSeek(Number(e.target.value))}
                aria-label="Seek position"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
              />
              <div className="mt-2 flex items-center justify-between font-mono text-xs text-slate-400 tabular-nums">
                <span>{formatClock(currentTimeSec)}</span>
                <span>-{formatClock(Math.max(0, durationSec - currentTimeSec))}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={onToggleShuffle}
                aria-label="Toggle shuffle"
                className={`rounded-lg p-2 transition-colors ${
                  shuffle ? 'text-white bg-white/15' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shuffle className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={onPrev}
                  aria-label="Previous track"
                  className="rounded-lg p-2 text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <SkipBack className="h-6 w-6" />
                </button>
                <button
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-950 hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-6 w-6 fill-current" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  aria-label="Next track"
                  className="rounded-lg p-2 text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <SkipForward className="h-6 w-6" />
                </button>
              </div>

              <button
                onClick={onCycleRepeat}
                aria-label="Cycle repeat mode"
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  repeatMode !== 'off'
                    ? 'text-white bg-white/15'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Repeat className="h-4 w-4" />
                  {repeatMode === 'one' ? '1' : ''}
                </span>
              </button>
            </div>

            {/* Volume + Speed + Sleep Timer */}
            <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  aria-label="Volume"
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                />
                <span className="w-10 text-right font-mono text-xs text-slate-400 tabular-nums">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                  <span>Speed</span>
                  <select
                    value={settings.playbackSpeed}
                    onChange={(e) =>
                      onUpdateSettings({ playbackSpeed: Number(e.target.value) })
                    }
                    className="rounded bg-white/10 px-2 py-1 font-mono text-xs text-white outline-none"
                  >
                    {[0.75, 1.0, 1.25, 1.5, 2.0].map((sp) => (
                      <option key={sp} value={sp} className="bg-slate-900">
                        {sp.toFixed(2).replace(/\.00$/, '.0')}x
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Sleep</span>
                  <select
                    value={String(sleepMode)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'off' || val === 'end_of_track') {
                        onSetSleepMode(val);
                      } else {
                        onSetSleepMode(Number(val));
                      }
                    }}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="off" className="bg-slate-900">
                      Off
                    </option>
                    <option value="end_of_track" className="bg-slate-900">
                      End of track
                    </option>
                    <option value="15" className="bg-slate-900">
                      15 min
                    </option>
                    <option value="30" className="bg-slate-900">
                      30 min
                    </option>
                    <option value="60" className="bg-slate-900">
                      60 min
                    </option>
                  </select>
                  {sleepSecondsLeft !== null && (
                    <span className="font-mono text-amber-300 tabular-nums">
                      {formatClock(sleepSecondsLeft)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Synced Lyrics or Queue */}
        <div className="flex flex-col lg:col-span-7">
          {rightTab === 'lyrics' ? (
            <div className="flex h-full flex-col rounded-xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sparkles className="h-4 w-4 text-slate-400" />
                  <span>Provider</span>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as LyricsProvider)}
                    className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white outline-none"
                  >
                    <option value="LRCLIB" className="bg-slate-900">
                      LRCLIB (Synced)
                    </option>
                    <option value="BetterLyrics" className="bg-slate-900">
                      BetterLyrics
                    </option>
                    <option value="BiniLyrics" className="bg-slate-900">
                      BiniLyrics
                    </option>
                    <option value="SimpMusic" className="bg-slate-900">
                      SimpMusic
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRomanized((v) => !v)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      showRomanized
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Romanization {showRomanized ? 'On' : 'Off'}
                  </button>

                  <div className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs">
                    <span className="text-slate-400">Offset</span>
                    <button
                      onClick={() => onUpdateOffsetMs(track.id, lyricOffsetMs - 100)}
                      aria-label="Decrease lyric offset by 100ms"
                      className="rounded p-0.5 text-slate-300 hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-16 text-center font-mono tabular-nums text-white">
                      {lyricOffsetMs >= 0 ? `+${lyricOffsetMs}` : lyricOffsetMs}ms
                    </span>
                    <button
                      onClick={() => onUpdateOffsetMs(track.id, lyricOffsetMs + 100)}
                      aria-label="Increase lyric offset by 100ms"
                      className="rounded p-0.5 text-slate-300 hover:bg-white/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-2">
                {loadingLyrics ? (
                  <div className="space-y-4 py-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-7 w-3/4 animate-pulse rounded bg-white/10" />
                    ))}
                  </div>
                ) : lines.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No synced lyrics available for this track.
                  </p>
                ) : (
                  lines.map((line, idx) => {
                    const isActive = idx === activeLineIndex;
                    const isPast = idx < activeLineIndex;
                    const shouldBlur =
                      !isActive &&
                      preset.lyrics.blurPx > 0 &&
                      (preset.lyrics.blurScope === 'all' ||
                        (preset.lyrics.blurScope === 'upcoming' && !isPast) ||
                        (preset.lyrics.blurScope === 'past' && isPast));

                    return (
                      <button
                        key={`${line.timeMs}-${idx}`}
                        onClick={() => onSeek(line.timeMs / 1000)}
                        className="block w-full text-left transition-all duration-200"
                        style={{
                          opacity: isActive
                            ? 1
                            : isPast
                              ? Math.max(0.25, preset.lyrics.pastAlpha + 0.25)
                              : Math.max(0.35, preset.lyrics.inactiveAlpha + 0.15),
                          filter: shouldBlur ? `blur(${preset.lyrics.blurPx}px)` : 'none',
                          transform: isActive
                            ? `translateY(-${preset.lyrics.liftPx}px)`
                            : 'none',
                        }}
                      >
                        <p
                          className={`font-display font-bold leading-snug ${
                            isActive ? 'text-white' : 'text-slate-200 hover:text-white'
                          }`}
                          style={{
                            fontSize: `${(isActive ? 1.55 : 1.32) * (preset.lyrics.size / 1.25)}rem`,
                          }}
                        >
                          {line.text}
                        </p>
                        {showRomanized && line.romanized && (
                          <p className="mt-1 text-sm text-slate-300/80">{line.romanized}</p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col rounded-xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-white">
                  <ListMusic className="h-4 w-4 text-slate-400" />
                  Up Next Queue
                </h3>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {queue.length} tracks
                </span>
              </div>
              <div className="mt-4 flex-1 divide-y divide-white/5 overflow-y-auto">
                {queue.map((qTrack, idx) => (
                  <button
                    key={`${qTrack.id}-${idx}`}
                    onClick={() => onPlayQueueTrack(qTrack)}
                    className="flex w-full items-center gap-3 py-3 px-2 text-left hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span className="w-6 font-mono text-xs text-slate-500 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <ArtworkImage
                      src={qTrack.artworkUrl}
                      alt={qTrack.title}
                      className="h-10 w-10 rounded-md shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {qTrack.title}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {qTrack.artist} · {qTrack.quality}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      {formatClock(qTrack.durationSec)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
