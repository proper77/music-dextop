import {
  ArrowRight,
  Check,
  Copy,
  ListPlus,
  Pause,
  Play,
  Radio,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { JamRoom, Playlist, Track } from '../types/bitchord.ts';
import { ArtworkImage } from './ArtworkImage.tsx';

interface JamViewProps {
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
}

export function JamView({ currentTrack, onPlayTrack }: JamViewProps) {
  const [room, setRoom] = useState<JamRoom | null>(null);
  const [joinCode, setJoinCode] = useState('BCHD26');
  const [displayName, setDisplayName] = useState('Samwel · Windows PC');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Poll active Jam room for cross-platform playback updates
  useEffect(() => {
    if (!room) return;
    const id = window.setInterval(async () => {
      try {
        const resp = await fetch(`/api/jam/${room.code}`);
        if (resp.ok) {
          const data = (await resp.json()) as { room: JamRoom };
          setRoom(data.room);
        }
      } catch {
        // Keep current state on transient poll error
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [room]);

  const handleCreate = async () => {
    setError(null);
    const resp = await fetch('/api/jam/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: displayName,
        currentTrack,
      }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { room: JamRoom };
      setRoom(data.room);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const resp = await fetch('/api/jam/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: joinCode,
        memberName: displayName,
        platform: 'Windows PC (Flutter)',
      }),
    });
    if (!resp.ok) {
      const err = (await resp.json()) as { error?: string };
      setError(err.error || 'Could not join Jam room');
      return;
    }
    const data = (await resp.json()) as { room: JamRoom };
    setRoom(data.room);
    if (data.room.currentTrack) {
      onPlayTrack(data.room.currentTrack);
    }
  };

  const handleRoomAction = async (
    type: 'play' | 'pause' | 'settings',
    patch?: { hostControlsOnly?: boolean; allowGuestQueue?: boolean }
  ) => {
    if (!room) return;
    const resp = await fetch(`/api/jam/${room.code}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...patch }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { room: JamRoom };
      setRoom(data.room);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-medium text-slate-400">
          BitChord Jam Relay · Synchronized Android & Windows Listening
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
          Listen Together
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
          Host or join a 6-character Jam room across Android and Windows Desktop. Control
          messages sync queue and playback state in real time without proxying audio.
        </p>
      </div>

      {!room ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6">
            <h2 className="font-display text-lg font-semibold text-white">
              Start a Jam Room
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Generate a 6-character invite code for friends on Android or Windows PC.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Your Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#090A0F] px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <Radio className="h-4 w-4" />
                Create Jam Session
              </button>
            </div>
          </div>

          <form
            onSubmit={handleJoin}
            className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6"
          >
            <h2 className="font-display text-lg font-semibold text-white">
              Join Existing Room
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Try active demo room <span className="font-mono text-white">BCHD26</span> hosted
              by Pixel 9 Pro (Android).
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">6-Character Room Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-white/10 bg-[#090A0F] px-3.5 py-2.5 font-mono text-base uppercase tracking-widest text-white outline-none focus:border-white/30"
                />
              </div>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
              >
                Join Room
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live Room
                </span>
                <span className="font-mono text-xl font-bold tracking-widest text-white">
                  {room.code}
                </span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(room.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="rounded-md bg-white/5 p-1.5 text-slate-300 hover:bg-white/10"
                  aria-label="Copy room code"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <button
                onClick={() => setRoom(null)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
              >
                Leave Room
              </button>
            </div>

            {room.currentTrack && (
              <div className="mt-5 flex items-center justify-between gap-4 rounded-lg bg-[#090A0F] p-4 border border-white/[0.06]">
                <div className="flex items-center gap-4 min-w-0">
                  <ArtworkImage
                    src={room.currentTrack.artworkUrl}
                    alt={room.currentTrack.title}
                    className="h-14 w-14 rounded-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {room.currentTrack.title}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {room.currentTrack.artist} · {room.currentTrack.quality}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRoomAction(room.isPlaying ? 'pause' : 'play')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950 shrink-0"
                  aria-label={room.isPlaying ? 'Pause room' : 'Play room'}
                >
                  {room.isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  )}
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-4 border-t border-white/[0.08] pt-4 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={room.hostControlsOnly}
                  onChange={(e) =>
                    handleRoomAction('settings', { hostControlsOnly: e.target.checked })
                  }
                  className="accent-white"
                />
                Host controls only
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={room.allowGuestQueue}
                  onChange={(e) =>
                    handleRoomAction('settings', { allowGuestQueue: e.target.checked })
                  }
                  className="accent-white"
                />
                Allow guest queue additions
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6 lg:col-span-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-white">
              <Users className="h-4 w-4 text-slate-400" />
              Connected Listeners ({room.members.length})
            </h3>
            <div className="mt-4 divide-y divide-white/[0.06]">
              {room.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.platform}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {m.isHost ? 'Host' : 'Guest'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TransferViewProps {
  onPlaylistImported: (playlist: Playlist, tracks: Track[]) => void;
  onPlayTrack: (track: Track) => void;
}

export function TransferView({ onPlaylistImported, onPlayTrack }: TransferViewProps) {
  const [playlistName, setPlaylistName] = useState('Imported Late Night Cuts');
  const [rawText, setRawText] = useState(
    'Blinding Lights - The Weeknd\nGet Lucky - Daft Punk\nMidnight City - M83\nResonance - HOME'
  );
  const [importing, setImporting] = useState(false);
  const [importedResult, setImportedResult] = useState<{
    playlist: Playlist;
    tracks: Track[];
  } | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setImporting(true);
    try {
      const resp = await fetch('/api/transfer/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName, lines }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          playlist: Playlist;
          tracks: Track[];
        };
        setImportedResult({ playlist: data.playlist, tracks: data.tracks });
        onPlaylistImported(data.playlist, data.tracks);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-medium text-slate-400">
          BitChord Transfer · Cross-Platform Playlist Migration
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
          Spotify & Tracklist Transfer
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
          Paste track titles from a Spotify playlist or CSV export. BitChord resolves each track
          against the live catalog and syncs the resulting playlist to both Android and Windows PC.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleImport}
          className="space-y-4 rounded-xl border border-white/[0.08] bg-[#11131B] p-6 lg:col-span-6"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Destination Playlist Name</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#090A0F] px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Tracks (`Title - Artist`, one per line)
            </label>
            <textarea
              rows={7}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#090A0F] px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-white/30"
            />
          </div>
          <button
            type="submit"
            disabled={importing}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <ListPlus className="h-4 w-4" />
            {importing ? 'Matching Tracks...' : 'Match & Sync Playlist'}
          </button>
        </form>

        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6 lg:col-span-6">
          <h2 className="font-display text-base font-semibold text-white">
            Matched Tracks Preview
          </h2>
          {!importedResult ? (
            <p className="mt-8 text-center text-sm text-slate-400">
              Submit a tracklist on the left to match and sync into your library.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-white/[0.06]">
              {importedResult.tracks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onPlayTrack(t)}
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-white/[0.04] rounded-lg px-2 transition-colors"
                >
                  <ArtworkImage
                    src={t.artworkUrl}
                    alt={t.title}
                    className="h-10 w-10 rounded shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{t.title}</p>
                    <p className="truncate text-xs text-slate-400">
                      {t.artist} · {t.album}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-400 shrink-0">Matched</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
