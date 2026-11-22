import {
  Compass,
  Disc3,
  Download,
  Heart,
  Home,
  Library,
  ListPlus,
  Maximize2,
  Mic2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Repeat,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArtworkImage } from './components/ArtworkImage.tsx';
import { AudioFrequencyVisualizer } from './components/AudioFrequencyVisualizer.tsx';
import { JamView, TransferView } from './components/JamAndTransferViews.tsx';
import { NowPlayingOverlay } from './components/NowPlayingOverlay.tsx';
import { ReplayView } from './components/ReplayView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { SyncAndFlutterView } from './components/SyncAndFlutterView.tsx';
import { BITCHORD_THEME_PRESETS, CURATED_TRACKS } from './data/presetsAndCatalog.ts';
import { useAudioEngine } from './hooks/useAudioEngine.ts';
import type {
  AppSettingsState,
  LibraryTab,
  ModuleSource,
  NavSection,
  Playlist,
  SyncDiffPlan,
  SyncedUserState,
  Track,
} from './types/bitchord.ts';

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function App() {
  const [section, setSection] = useState<NavSection>('home');
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('playlists');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [userState, setUserState] = useState<SyncedUserState | null>(null);
  const [diffPlan, setDiffPlan] = useState<SyncDiffPlan | null>(null);
  const [browseData, setBrowseData] = useState<{
    quickPicks: Track[];
    trending: Track[];
    electronic: Track[];
  }>({
    quickPicks: CURATED_TRACKS,
    trending: CURATED_TRACKS.slice(0, 6),
    electronic: CURATED_TRACKS.slice(2, 8),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>(CURATED_TRACKS);
  const [searching, setSearching] = useState(false);

  const [queue, setQueue] = useState<Track[]>(CURATED_TRACKS);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [downloadedIds, setDownloadedIds] = useState<string[]>([
    'bc-midnight-01',
    'bc-velvet-04',
  ]);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Load initial synced state & browse catalog
  useEffect(() => {
    fetch('/api/sync/state')
      .then((r) => r.json())
      .then((data: { state: SyncedUserState; diffPlan: SyncDiffPlan }) => {
        setUserState(data.state);
        setDiffPlan(data.diffPlan);
      })
      .catch(() => {});

    fetch('/api/music/browse')
      .then((r) => r.json())
      .then(
        (data: { quickPicks: Track[]; trending: Track[]; electronic: Track[] }) => {
          setBrowseData(data);
        }
      )
      .catch(() => {});
  }, []);

  const settings: AppSettingsState = userState?.settings || {
    themePresetId: 'apple-music',
    crossfadeSeconds: 6,
    automixEnabled: true,
    playbackSpeed: 1.0,
    skipSilence: false,
    normalizeVolume: true,
    preferAtmos: true,
    qualityWifi: 'Hi-Res Lossless',
    qualityCellular: 'Lossless FLAC',
    scrobbleLastFm: true,
    scrobbleListenBrainz: true,
    discordRpc: true,
    showListenTogetherButton: true,
    eqPreset: 'Warm Studio',
  };

  const activePreset = useMemo(
    () =>
      BITCHORD_THEME_PRESETS.find((p) => p.id === settings.themePresetId) ||
      BITCHORD_THEME_PRESETS[0],
    [settings.themePresetId]
  );

  const recordPlayToSync = useCallback((track: Track) => {
    fetch('/api/sync/record-play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, deviceId: 'dev-win-flutter-01' }),
    })
      .then((r) => r.json())
      .then((data: { state?: SyncedUserState }) => {
        if (data.state) setUserState(data.state);
      })
      .catch(() => {});
  }, []);

  const handleTrackEndedRef = useCallback(() => {
    // Handled below once audio hook is mounted
  }, []);

  const audio = useAudioEngine({
    settings,
    onTrackEnded: () => nextTrack(),
    onTrackStarted: recordPlayToSync,
  });

  // Initialize default loaded track metadata without auto-playing audio
  const activeTrack = audio.currentTrack || browseData.quickPicks[0] || CURATED_TRACKS[0];

  const playWithQueue = useCallback(
    (track: Track, list?: Track[]) => {
      if (list && list.length > 0) {
        setQueue(list);
      } else if (!queue.some((q) => q.id === track.id)) {
        setQueue((prev) => [track, ...prev]);
      }
      audio.playTrack(track);
    },
    [audio, queue]
  );

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (repeatMode === 'one' && audio.currentTrack) {
      audio.playTrack(audio.currentTrack);
      return;
    }
    const idx = queue.findIndex((t) => t.id === activeTrack.id);
    if (shuffle) {
      const rand = queue[Math.floor(Math.random() * queue.length)];
      audio.playTrack(rand);
      return;
    }
    const nextIdx = idx >= 0 ? (idx + 1) % queue.length : 0;
    audio.playTrack(queue[nextIdx]);
  }, [queue, repeatMode, audio, activeTrack.id, shuffle]);

  const prevTrack = useCallback(() => {
    if (audio.currentTimeSec > 4) {
      audio.seek(0);
      return;
    }
    if (queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === activeTrack.id);
    const prevIdx = idx > 0 ? idx - 1 : queue.length - 1;
    audio.playTrack(queue[prevIdx]);
  }, [audio, queue, activeTrack.id]);

  // Keep reference fresh if needed
  void handleTrackEndedRef;

  const pushStatePatch = useCallback(
    async (patch: Partial<SyncedUserState>) => {
      if (!userState) return;
      const merged: SyncedUserState = {
        ...userState,
        ...patch,
        settings: patch.settings
          ? { ...userState.settings, ...patch.settings }
          : userState.settings,
      };
      setUserState(merged);
      try {
        const resp = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patch, deviceId: 'dev-win-flutter-01' }),
        });
        if (resp.ok) {
          const data = (await resp.json()) as {
            state: SyncedUserState;
            diffPlan: SyncDiffPlan;
          };
          setUserState(data.state);
          setDiffPlan(data.diffPlan);
        }
      } catch {
        // Optimistic update stays active
      }
    },
    [userState]
  );

  const handleToggleLike = useCallback(
    (track: Track) => {
      if (!userState) return;
      const exists = userState.likedTrackIds.includes(track.id);
      const nextLiked = exists
        ? userState.likedTrackIds.filter((id) => id !== track.id)
        : [track.id, ...userState.likedTrackIds];
      const nextTracksById = { ...userState.tracksById, [track.id]: track };
      void pushStatePatch({
        likedTrackIds: nextLiked,
        tracksById: nextTracksById,
      });
    },
    [userState, pushStatePatch]
  );

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSection('search');
    setSearching(true);
    try {
      const resp = await fetch(
        `/api/music/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      if (resp.ok) {
        const data = (await resp.json()) as { tracks: Track[] };
        setSearchResults(data.tracks);
      }
    } finally {
      setSearching(false);
    }
  };

  const handlePushSync = async () => {
    if (!userState) return;
    await pushStatePatch({
      likedTrackIds: userState.likedTrackIds,
      playlists: userState.playlists,
      settings: userState.settings,
      lyricOffsetsMs: userState.lyricOffsetsMs,
      modules: userState.modules,
    });
    setSyncNotice('Desktop state pushed to Cross-Platform Sync Relay.');
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handlePullSync = async (simulateAndroid: boolean) => {
    const resp = await fetch('/api/sync/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'dev-win-flutter-01',
        simulateAndroidActivity: simulateAndroid,
      }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as {
        state: SyncedUserState;
        diffPlan: SyncDiffPlan;
      };
      setUserState(data.state);
      setDiffPlan(data.diffPlan);
      setSyncNotice('Pulled latest Android partition into Replay & Library.');
      setTimeout(() => setSyncNotice(null), 3000);
    }
  };

  const handleExportBackup = async () => {
    const resp = await fetch('/api/sync/backup', { method: 'POST' });
    if (!resp.ok) return;
    const data = (await resp.json()) as {
      filename: string;
      payload: SyncedUserState;
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = async (payload: SyncedUserState) => {
    const resp = await fetch('/api/sync/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { state: SyncedUserState };
      setUserState(data.state);
      setSyncNotice('Restored BitChord backup across session.');
      setTimeout(() => setSyncNotice(null), 3000);
    }
  };

  const handleUpdateModules = async (modules: ModuleSource[]) => {
    await pushStatePatch({ modules });
  };

  const handleHealthCheckModules = async () => {
    if (!userState) return;
    const resp = await fetch('/api/sync/modules/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: userState.modules }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { modules: ModuleSource[] };
      setUserState({ ...userState, modules: data.modules });
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userState || !newPlaylistName.trim()) return;
    const pl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      description: 'Created on Desktop · Synced with Android',
      artworkUrl: activeTrack.artworkUrl,
      trackIds: [activeTrack.id],
      updatedAt: Date.now(),
      source: 'BitChord',
    };
    void pushStatePatch({ playlists: [pl, ...userState.playlists] });
    setNewPlaylistName('');
  };

  const isLiked = userState?.likedTrackIds.includes(activeTrack.id) ?? false;
  const likedTracksList = (userState?.likedTrackIds || [])
    .map((id) => userState?.tracksById[id])
    .filter((t): t is Track => Boolean(t));

  const selectedPlaylist = userState?.playlists.find((p) => p.id === selectedPlaylistId);

  const navItems: { id: NavSection; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'replay', label: 'Replay', icon: TrendingUp },
    { id: 'sync', label: 'Sync & Flutter', icon: RefreshCw },
    { id: 'jam', label: 'Listen Together', icon: Radio },
    { id: 'transfer', label: 'Transfer', icon: ListPlus },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sectionLabelMap: Record<NavSection, string> = {
    home: 'Home',
    explore: 'Explore',
    search: 'Search',
    library: 'Library',
    replay: 'BitChord Replay',
    sync: 'Cross-Platform Sync',
    jam: 'Listen Together',
    transfer: 'Spotify Transfer',
    settings: 'Settings',
  };

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-[#090A0F] text-[#F1F3F9]"
      style={{ '--bc-accent': activePreset.accent } as React.CSSProperties}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[0.08] bg-[#0D0F15] md:flex">
          <div className="flex h-[60px] items-center px-6 border-b border-white/[0.08]">
            <button
              onClick={() => {
                setSelectedPlaylistId(null);
                setSection('home');
              }}
              className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              <Disc3 className="h-5 w-5" style={{ color: activePreset.accent }} />
              BitChord
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id && !selectedPlaylistId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedPlaylistId(null);
                    setSection(item.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="mt-6 border-t border-white/[0.08] pt-4">
              <p className="px-3 text-xs font-medium text-slate-500">Synced Playlists</p>
              <div className="mt-2 space-y-0.5">
                {(userState?.playlists || []).map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setSelectedPlaylistId(pl.id);
                      setSection('library');
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      selectedPlaylistId === pl.id
                        ? 'bg-white/[0.1] text-white'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{pl.name}</span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                      {pl.trackIds.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          <div className="border-t border-white/[0.08] p-4 text-xs text-slate-400">
            <p className="truncate font-medium text-slate-200">
              {userState?.displayName || 'BitChord Listener'}
            </p>
            <p className="mt-0.5 truncate">
              Sync Rev #{userState?.syncRevision || 14} · Windows & Android
            </p>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar (Strict 3-Zone Contract) */}
          <header className="flex h-[60px] shrink-0 items-center justify-between gap-8 border-b border-white/[0.08] bg-[#090A0F]/90 px-6 backdrop-blur-md">
            <div className="flex items-center gap-4 min-w-0">
              <span className="font-display text-sm font-semibold text-white whitespace-nowrap shrink-0">
                {selectedPlaylist ? selectedPlaylist.name : sectionLabelMap[section]}
              </span>
              <span className="hidden text-xs text-slate-500 lg:inline whitespace-nowrap shrink-0">
                {settings.qualityWifi}
              </span>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-white/[0.1] bg-[#11131B] px-3 py-1.5 sm:flex"
            >
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search YouTube Music / iTunes catalog..."
                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
              />
            </form>

            <button
              onClick={() => setSection('sync')}
              className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              Sync Devices
            </button>
          </header>

          {/* Mobile Nav Strip */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.08] bg-[#0D0F15] px-4 py-2 md:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedPlaylistId(null);
                  setSection(item.id);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  section === item.id
                    ? 'bg-white text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {syncNotice && (
            <div className="border-b border-emerald-500/30 bg-emerald-950/40 px-6 py-2 text-xs text-emerald-300">
              {syncNotice}
            </div>
          )}

          {/* Main Scrollable Canvas */}
          <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
            <div className="mx-auto max-w-6xl space-y-10">
              {section === 'home' && (
                <>
                  {/* Hero Feature Spotlight */}
                  <section className="grid grid-cols-1 items-stretch gap-6 rounded-2xl border border-white/[0.08] bg-[#11131B] p-6 lg:grid-cols-12">
                    <div className="flex flex-col justify-between lg:col-span-7">
                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Unified Desktop · BitChord PC + Android Feature Parity
                        </p>
                        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white [text-wrap:balance] sm:text-4xl">
                          Hi-Res desktop playback synced seamlessly with your Android library.
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                          Stream lossless FLAC and Dolby Atmos modules with Automix transitions,
                          LRCLIB synced lyrics, Listen Together Jam rooms, and unified Replay
                          analytics across Windows and Android.
                        </p>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => playWithQueue(activeTrack, browseData.quickPicks)}
                          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          Play Reference Mix
                        </button>
                        <button
                          onClick={() => setSection('replay')}
                          className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                        >
                          Open Replay 2026
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center lg:col-span-5">
                      <button
                        onClick={() => setNowPlayingOpen(true)}
                        className="group relative aspect-square w-full max-w-[260px] overflow-hidden rounded-xl border border-white/10"
                      >
                        <ArtworkImage
                          src={activeTrack.artworkUrl}
                          alt={activeTrack.title}
                          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-left">
                          <p className="truncate text-sm font-semibold text-white">
                            {activeTrack.title}
                          </p>
                          <p className="truncate text-xs text-slate-300">
                            {activeTrack.artist} · {activeTrack.quality}
                          </p>
                        </div>
                      </button>
                    </div>
                  </section>

                  {/* Quick Picks Grid */}
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-display text-xl font-bold text-white">
                        Quick Picks
                      </h2>
                      <button
                        onClick={() => setSection('explore')}
                        className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                      >
                        View all
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {browseData.quickPicks.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => playWithQueue(track, browseData.quickPicks)}
                          className="group flex items-center gap-3.5 rounded-xl border border-white/[0.07] bg-[#11131B] p-3 text-left hover:border-white/20 hover:bg-[#171A24] transition-colors"
                        >
                          <ArtworkImage
                            src={track.artworkUrl}
                            alt={track.title}
                            className="h-14 w-14 rounded-lg shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {track.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {track.artist}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-slate-500">
                              {track.quality} · {formatTime(track.durationSec)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Trending Catalog Shelf */}
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-display text-xl font-bold text-white">
                        Trending & Live Catalog
                      </h2>
                      <span className="text-xs text-slate-400">
                        Playable previews · LRCLIB lyrics ready
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {browseData.trending.slice(0, 8).map((track) => (
                        <button
                          key={track.id}
                          onClick={() => playWithQueue(track, browseData.trending)}
                          className="group rounded-xl border border-white/[0.07] bg-[#11131B] p-3.5 text-left hover:border-white/20 hover:bg-[#171A24] transition-colors"
                        >
                          <div className="aspect-square w-full overflow-hidden rounded-lg">
                            <ArtworkImage
                              src={track.artworkUrl}
                              alt={track.title}
                              className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <p className="mt-3 truncate text-sm font-semibold text-white">
                            {track.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {track.artist} · {track.releaseYear || 2026}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {section === 'explore' && (
                <div className="space-y-8">
                  <div className="border-b border-white/[0.08] pb-6">
                    <p className="text-xs font-medium text-slate-400">
                      New Releases, Spatial Atmos & Electronic
                    </p>
                    <h1 className="mt-1 font-display text-3xl font-bold text-white">
                      Explore
                    </h1>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {[...browseData.electronic, ...browseData.trending].map((track, idx) => (
                      <button
                        key={`${track.id}-${idx}`}
                        onClick={() => playWithQueue(track, browseData.electronic)}
                        className="group rounded-xl border border-white/[0.07] bg-[#11131B] p-3.5 text-left hover:border-white/20 transition-colors"
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-lg">
                          <ArtworkImage
                            src={track.artworkUrl}
                            alt={track.title}
                            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <p className="mt-3 truncate text-sm font-semibold text-white">
                          {track.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {track.artist} · {track.genre || 'Electronic'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {section === 'search' && (
                <div className="space-y-6">
                  <form onSubmit={handleSearchSubmit} className="flex gap-3">
                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/15 bg-[#11131B] px-4 py-3">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search any song, artist, or album..."
                        className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-xl bg-white px-5 py-3 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </form>

                  <div className="rounded-xl border border-white/[0.08] bg-[#11131B] overflow-hidden">
                    <div className="divide-y divide-white/[0.05]">
                      {searchResults.map((track) => {
                        const liked = userState?.likedTrackIds.includes(track.id);
                        return (
                          <div
                            key={track.id}
                            className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors"
                          >
                            <button
                              onClick={() => playWithQueue(track, searchResults)}
                              className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                            >
                              <ArtworkImage
                                src={track.artworkUrl}
                                alt={track.title}
                                className="h-11 w-11 rounded-md shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">
                                  {track.title}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                  {track.artist} · {track.album}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="hidden text-xs text-slate-400 sm:inline">
                                {track.quality}
                              </span>
                              <span className="font-mono text-xs text-slate-400 tabular-nums">
                                {formatTime(track.durationSec)}
                              </span>
                              <button
                                onClick={() => handleToggleLike(track)}
                                aria-label="Toggle Like"
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
                              >
                                <Heart
                                  className={`h-4 w-4 ${
                                    liked ? 'fill-rose-500 text-rose-500' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {section === 'library' && (
                <div className="space-y-6">
                  {selectedPlaylist ? (
                    <div className="space-y-6">
                      <button
                        onClick={() => setSelectedPlaylistId(null)}
                        className="text-xs font-medium text-slate-400 hover:text-white"
                      >
                        ← Back to All Playlists
                      </button>
                      <div className="flex flex-wrap items-end gap-6 border-b border-white/[0.08] pb-6">
                        <ArtworkImage
                          src={selectedPlaylist.artworkUrl}
                          alt={selectedPlaylist.name}
                          className="h-32 w-32 rounded-xl shrink-0"
                        />
                        <div>
                          <p className="text-xs text-slate-400">
                            {selectedPlaylist.source} · Synced Playlist
                          </p>
                          <h1 className="mt-1 font-display text-3xl font-bold text-white">
                            {selectedPlaylist.name}
                          </h1>
                          <p className="mt-1 text-sm text-slate-400">
                            {selectedPlaylist.description}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-[#11131B] divide-y divide-white/[0.05]">
                        {selectedPlaylist.trackIds
                          .map((id) => userState?.tracksById[id])
                          .filter((t): t is Track => Boolean(t))
                          .map((track) => (
                            <button
                              key={track.id}
                              onClick={() => playWithQueue(track)}
                              className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-white/[0.04]"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <ArtworkImage
                                  src={track.artworkUrl}
                                  alt={track.title}
                                  className="h-10 w-10 rounded shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-white">
                                    {track.title}
                                  </p>
                                  <p className="truncate text-xs text-slate-400">
                                    {track.artist} · {track.album}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-xs text-slate-400 tabular-nums">
                                {formatTime(track.durationSec)}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                        <div className="flex items-center gap-1 rounded-lg bg-[#11131B] p-1 border border-white/[0.08]">
                          {(
                            [
                              ['playlists', 'Playlists'],
                              ['songs', 'Liked Songs'],
                              ['history', 'History'],
                              ['downloads', 'Offline Downloads'],
                            ] as [LibraryTab, string][]
                          ).map(([id, label]) => (
                            <button
                              key={id}
                              onClick={() => setLibraryTab(id)}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                                libraryTab === id
                                  ? 'bg-white text-slate-950'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <form onSubmit={handleCreatePlaylist} className="flex gap-2">
                          <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="New playlist name..."
                            className="rounded-lg border border-white/10 bg-[#11131B] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                          />
                          <button
                            type="submit"
                            className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 whitespace-nowrap shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create
                          </button>
                        </form>
                      </div>

                      {libraryTab === 'playlists' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {(userState?.playlists || []).map((pl) => (
                            <button
                              key={pl.id}
                              onClick={() => setSelectedPlaylistId(pl.id)}
                              className="rounded-xl border border-white/[0.08] bg-[#11131B] p-4 text-left hover:border-white/25 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <ArtworkImage
                                  src={pl.artworkUrl}
                                  alt={pl.name}
                                  className="h-16 w-16 rounded-lg shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-display text-base font-semibold text-white">
                                    {pl.name}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-slate-400">
                                    {pl.trackIds.length} tracks · {pl.source}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {libraryTab === 'songs' && (
                        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] divide-y divide-white/[0.05]">
                          {likedTracksList.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-white/[0.04]"
                            >
                              <button
                                onClick={() => playWithQueue(t, likedTracksList)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <ArtworkImage
                                  src={t.artworkUrl}
                                  alt={t.title}
                                  className="h-10 w-10 rounded shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-white">
                                    {t.title}
                                  </p>
                                  <p className="truncate text-xs text-slate-400">
                                    {t.artist} · {t.quality}
                                  </p>
                                </div>
                              </button>
                              <button
                                onClick={() =>
                                  setDownloadedIds((prev) =>
                                    prev.includes(t.id)
                                      ? prev.filter((x) => x !== t.id)
                                      : [...prev, t.id]
                                  )
                                }
                                className="text-xs text-slate-400 hover:text-white whitespace-nowrap shrink-0"
                              >
                                {downloadedIds.includes(t.id) ? 'Saved Offline' : 'Save Offline'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {libraryTab === 'history' && (
                        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] divide-y divide-white/[0.05]">
                          {(userState?.history || []).map((entry, idx) => {
                            const t = userState?.tracksById[entry.trackId];
                            if (!t) return null;
                            return (
                              <button
                                key={`${entry.trackId}-${idx}`}
                                onClick={() => playWithQueue(t)}
                                className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-white/[0.04]"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <ArtworkImage
                                    src={t.artworkUrl}
                                    alt={t.title}
                                    className="h-10 w-10 rounded shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">
                                      {t.title}
                                    </p>
                                    <p className="truncate text-xs text-slate-400">
                                      {t.artist} ·{' '}
                                      {entry.deviceId.includes('android')
                                        ? 'Android APK'
                                        : 'Windows PC'}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                                  {new Date(entry.playedAt).toLocaleTimeString()}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {libraryTab === 'downloads' && (
                        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] divide-y divide-white/[0.05]">
                          {downloadedIds
                            .map((id) => userState?.tracksById[id])
                            .filter((t): t is Track => Boolean(t))
                            .map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-4 px-5 py-3"
                              >
                                <button
                                  onClick={() => playWithQueue(t)}
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                  <ArtworkImage
                                    src={t.artworkUrl}
                                    alt={t.title}
                                    className="h-10 w-10 rounded shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">
                                      {t.title}
                                    </p>
                                    <p className="truncate text-xs text-slate-400">
                                      {t.artist} · {t.sampleRate || t.quality}
                                    </p>
                                  </div>
                                </button>
                                <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
                                  <Download className="h-3.5 w-3.5" />
                                  Cached FLAC
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {section === 'replay' && userState && (
                <ReplayView
                  userState={userState}
                  onPlayTrack={(t) => playWithQueue(t)}
                  onSyncPullAndroid={() => handlePullSync(true)}
                  onExportBackup={handleExportBackup}
                />
              )}

              {section === 'sync' && userState && (
                <SyncAndFlutterView
                  userState={userState}
                  diffPlan={diffPlan}
                  onPushSync={handlePushSync}
                  onPullSync={handlePullSync}
                  onExportBackup={handleExportBackup}
                  onRestoreBackup={handleRestoreBackup}
                  onUpdateModules={handleUpdateModules}
                  onHealthCheckModules={handleHealthCheckModules}
                />
              )}

              {section === 'jam' && (
                <JamView
                  currentTrack={activeTrack}
                  onPlayTrack={(t) => playWithQueue(t)}
                />
              )}

              {section === 'transfer' && (
                <TransferView
                  onPlaylistImported={(playlist, tracks) => {
                    if (!userState) return;
                    const nextMap = { ...userState.tracksById };
                    for (const t of tracks) nextMap[t.id] = t;
                    setUserState({
                      ...userState,
                      tracksById: nextMap,
                      playlists: [playlist, ...userState.playlists],
                    });
                    setSyncNotice(`Imported "${playlist.name}" and synced across devices.`);
                    setTimeout(() => setSyncNotice(null), 3000);
                  }}
                  onPlayTrack={(t) => playWithQueue(t)}
                />
              )}

              {section === 'settings' && (
                <SettingsView
                  settings={settings}
                  presets={BITCHORD_THEME_PRESETS}
                  onUpdateSettings={(patch) => void pushStatePatch({ settings: { ...settings, ...patch } })}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Persistent Bottom Player Bar */}
      <footer className="flex h-[84px] shrink-0 items-center justify-between gap-4 border-t border-white/[0.08] bg-[#0D0F15] px-4 sm:px-6">
        {/* Track Metadata */}
        <div className="flex min-w-0 items-center gap-3.5 sm:w-[30%]">
          <button
            onClick={() => setNowPlayingOpen(true)}
            className="shrink-0 overflow-hidden rounded-lg border border-white/10"
            aria-label="Open Now Playing"
          >
            <ArtworkImage
              src={activeTrack.artworkUrl}
              alt={activeTrack.title}
              className="h-[52px] w-[52px]"
            />
          </button>
          <div className="min-w-0">
            <button
              onClick={() => setNowPlayingOpen(true)}
              className="block w-full truncate text-left text-sm font-semibold text-white hover:underline"
            >
              {activeTrack.title}
            </button>
            <p className="truncate text-xs text-slate-400">
              {activeTrack.artist} · {activeTrack.quality}
            </p>
          </div>
          <button
            onClick={() => handleToggleLike(activeTrack)}
            aria-label="Toggle Like"
            className="hidden rounded-lg p-1.5 text-slate-400 hover:text-white sm:block shrink-0"
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`}
            />
          </button>
        </div>

        {/* Center Transport & Seek */}
        <div className="flex flex-1 max-w-xl flex-col items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShuffle((s) => !s)}
              aria-label="Shuffle"
              className={`hidden sm:block rounded p-1 transition-colors ${
                shuffle ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={prevTrack}
              aria-label="Previous"
              className="rounded p-1 text-slate-300 hover:text-white"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (!audio.currentTrack) {
                  playWithQueue(activeTrack);
                } else {
                  audio.togglePlay();
                }
              }}
              aria-label={audio.isPlaying ? 'Pause' : 'Play'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950 hover:scale-105 transition-transform"
            >
              {audio.isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>
            <button
              onClick={nextTrack}
              aria-label="Next"
              className="rounded p-1 text-slate-300 hover:text-white"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'))
              }
              aria-label="Repeat"
              className={`hidden sm:flex items-center gap-0.5 rounded p-1 text-[11px] transition-colors ${
                repeatMode !== 'off' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              {repeatMode === 'one' && <span>1</span>}
            </button>
          </div>

          <div className="mt-1.5 flex w-full items-center gap-2.5">
            <span className="w-9 text-right font-mono text-[11px] text-slate-400 tabular-nums">
              {formatTime(audio.currentTimeSec)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, audio.durationSec)}
              step={0.5}
              value={Math.min(audio.currentTimeSec, audio.durationSec)}
              onChange={(e) => audio.seek(Number(e.target.value))}
              aria-label="Seek"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
            <span className="w-9 font-mono text-[11px] text-slate-400 tabular-nums">
              {formatTime(audio.durationSec)}
            </span>
          </div>
        </div>

        {/* Right Controls + Real-Time D3 Audio Frequency Visualizer */}
        <div className="hidden items-center justify-end gap-3 sm:flex sm:w-[32%]">
          <div className="hidden lg:flex items-center pr-2 border-r border-white/[0.08]">
            <AudioFrequencyVisualizer
              audioLevel={audio.audioLevel}
              isPlaying={audio.isPlaying}
              accentColor={activePreset.accent}
              trackId={activeTrack.id}
              width={136}
              height={32}
            />
          </div>

          <button
            onClick={() => setNowPlayingOpen(true)}
            aria-label="Open Synced Lyrics"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            <Mic2 className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <Volume2 className="h-4 w-4 text-slate-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audio.volume}
              onChange={(e) => audio.setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
          </div>

          <button
            onClick={() => setNowPlayingOpen(true)}
            aria-label="Expand Now Playing"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* Fullscreen Now Playing + Synced Lyrics Overlay */}
      <NowPlayingOverlay
        open={nowPlayingOpen}
        onClose={() => setNowPlayingOpen(false)}
        track={activeTrack}
        isPlaying={audio.isPlaying}
        currentTimeSec={audio.currentTimeSec}
        durationSec={audio.durationSec}
        volume={audio.volume}
        audioLevel={audio.audioLevel}
        isCrossfading={audio.isCrossfading}
        isLiked={isLiked}
        shuffle={shuffle}
        repeatMode={repeatMode}
        queue={queue}
        preset={activePreset}
        settings={settings}
        lyricOffsetMs={userState?.lyricOffsetsMs[activeTrack.id] ?? 0}
        sleepMode={audio.sleepMode}
        sleepSecondsLeft={audio.sleepSecondsLeft}
        onTogglePlay={() => {
          if (!audio.currentTrack) playWithQueue(activeTrack);
          else audio.togglePlay();
        }}
        onSeek={audio.seek}
        onPrev={prevTrack}
        onNext={nextTrack}
        onToggleLike={() => handleToggleLike(activeTrack)}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onCycleRepeat={() =>
          setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'))
        }
        onVolumeChange={audio.setVolume}
        onPlayQueueTrack={(t) => playWithQueue(t)}
        onUpdateOffsetMs={(trackId, offsetMs) => {
          if (!userState) return;
          void pushStatePatch({
            lyricOffsetsMs: { ...userState.lyricOffsetsMs, [trackId]: offsetMs },
          });
        }}
        onUpdateSettings={(patch) =>
          void pushStatePatch({ settings: { ...settings, ...patch } })
        }
        onSetSleepMode={audio.setSleepMode}
      />
    </div>
  );
}
