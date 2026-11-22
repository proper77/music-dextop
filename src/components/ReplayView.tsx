import { Download, Play, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { useState } from 'react';
import type { SyncedUserState, Track } from '../types/bitchord.ts';
import { ArtworkImage } from './ArtworkImage.tsx';

interface ReplayViewProps {
  userState: SyncedUserState;
  onPlayTrack: (track: Track) => void;
  onSyncPullAndroid: () => Promise<void>;
  onExportBackup: () => Promise<void>;
}

export function ReplayView({
  userState,
  onPlayTrack,
  onSyncPullAndroid,
  onExportBackup,
}: ReplayViewProps) {
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'android' | 'desktop'>('all');
  const [syncing, setSyncing] = useState(false);

  // Merge partitioned monthly listening chunks without double counting (ReplaySync parity)
  const relevantChunks = userState.monthlyChunks.filter((chunk) => {
    if (deviceFilter === 'all') return true;
    const dev = userState.devices.find((d) => d.deviceId === chunk.deviceId);
    if (!dev) return true;
    return deviceFilter === 'android'
      ? dev.platform === 'Android APK'
      : dev.platform !== 'Android APK';
  });

  const trackTotals = new Map<
    string,
    {
      trackId: string;
      plays: number;
      minutes: number;
      title: string;
      artist: string;
      album: string;
      genre: string;
      artworkUrl: string;
    }
  >();

  let totalPlays = 0;
  let totalMinutes = 0;
  const genreMinutes = new Map<string, number>();

  for (const chunk of relevantChunks) {
    for (const [trackId, plays] of Object.entries(chunk.playsByTrack)) {
      const mins = chunk.minutesByTrack[trackId] || 0;
      totalPlays += plays;
      totalMinutes += mins;

      const meta = chunk.trackMeta[trackId] || userState.tracksById[trackId];
      const title = meta?.title || trackId;
      const artist = meta?.artist || 'Unknown Artist';
      const album = meta?.album || 'Single';
      const genre = meta?.genre || 'Music';
      const artworkUrl = meta?.artworkUrl || '';

      genreMinutes.set(genre, (genreMinutes.get(genre) || 0) + mins);

      const existing = trackTotals.get(trackId);
      if (existing) {
        existing.plays += plays;
        existing.minutes += mins;
      } else {
        trackTotals.set(trackId, {
          trackId,
          plays,
          minutes: mins,
          title,
          artist,
          album,
          genre,
          artworkUrl,
        });
      }
    }
  }

  const rankedTracks = Array.from(trackTotals.values()).sort((a, b) => b.plays - a.plays);
  const topTrack = rankedTracks[0];

  const artistMap = new Map<string, { artist: string; plays: number; minutes: number }>();
  for (const item of rankedTracks) {
    const prev = artistMap.get(item.artist);
    if (prev) {
      prev.plays += item.plays;
      prev.minutes += item.minutes;
    } else {
      artistMap.set(item.artist, {
        artist: item.artist,
        plays: item.plays,
        minutes: item.minutes,
      });
    }
  }
  const rankedArtists = Array.from(artistMap.values()).sort((a, b) => b.minutes - a.minutes);
  const rankedGenres = Array.from(genreMinutes.entries()).sort((a, b) => b[1] - a[1]);

  const handleSimulatePull = async () => {
    setSyncing(true);
    try {
      await onSyncPullAndroid();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Cross-Device Replay · Partitioned Monthly Merge
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
            BitChord Replay 2026
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
            Listening stats from your Android APK and Windows PC are stored in separate
            SHA-256 device partitions and merged live so plays are never double-counted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-[#141722] p-1 border border-white/[0.08]">
            <button
              onClick={() => setDeviceFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                deviceFilter === 'all'
                  ? 'bg-white text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Devices
            </button>
            <button
              onClick={() => setDeviceFilter('android')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                deviceFilter === 'android'
                  ? 'bg-white text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Android APK
            </button>
            <button
              onClick={() => setDeviceFilter('desktop')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                deviceFilter === 'desktop'
                  ? 'bg-white text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Windows PC
            </button>
          </div>

          <button
            onClick={handleSimulatePull}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#141722] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Pull Android Partition
          </button>

          <button
            onClick={onExportBackup}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export Replay JSON
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-5">
          <p className="text-xs text-slate-400">Merged Listening Time</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-white tabular-nums">
            {totalMinutes} <span className="text-sm font-normal text-slate-400">min</span>
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-5">
          <p className="text-xs text-slate-400">Total Verified Plays</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-white tabular-nums">
            {totalPlays}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-5">
          <p className="text-xs text-slate-400">Top Artist</p>
          <p className="mt-2 truncate font-display text-xl font-bold text-white">
            {rankedArtists[0]?.artist || '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
            {rankedArtists[0]?.minutes || 0} min · {rankedArtists[0]?.plays || 0} plays
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-5">
          <p className="text-xs text-slate-400">Synced Partitions</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-white tabular-nums">
            {userState.devices.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Android + Windows PC</p>
        </div>
      </div>

      {/* Top Track Poster + Device Contributions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {topTrack && (
          <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#11131B] p-6 lg:col-span-5">
            <div className="flex items-start gap-5">
              <ArtworkImage
                src={topTrack.artworkUrl}
                alt={topTrack.title}
                className="h-28 w-28 rounded-lg shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-rose-400">Most Played Track</p>
                <h2 className="mt-1 truncate font-display text-xl font-bold text-white">
                  {topTrack.title}
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-300">
                  {topTrack.artist} · {topTrack.album}
                </p>
                <p className="mt-3 font-mono text-xs text-slate-400 tabular-nums">
                  {topTrack.plays} plays · {topTrack.minutes} minutes across synced devices
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
              <span className="text-xs text-slate-400">
                Top Genre: <strong className="text-slate-200">{rankedGenres[0]?.[0] || 'Electronic'}</strong>
              </span>
              <button
                onClick={() => {
                  const found = userState.tracksById[topTrack.trackId];
                  if (found) onPlayTrack(found);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Play Track
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6 lg:col-span-7">
          <h3 className="font-display text-base font-semibold text-white">
            Device Partition Breakdown
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Each device owns its monthly partition key (`replay-&lt;deviceId&gt;-&lt;YYYY-MM&gt;`).
          </p>
          <div className="mt-4 divide-y divide-white/[0.06]">
            {userState.devices.map((dev) => {
              const pct =
                totalMinutes > 0
                  ? Math.min(100, Math.round((dev.totalMinutes / totalMinutes) * 100))
                  : 50;
              return (
                <div key={dev.deviceId} className="py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {dev.platform === 'Android APK' ? (
                        <Smartphone className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <Monitor className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {dev.deviceName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {dev.platform} · v{dev.appVersion}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-300 tabular-nums shrink-0">
                      <span>{dev.totalPlays} plays</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span>{dev.totalMinutes} min</span>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Tracks Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#11131B] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h3 className="font-display text-base font-semibold text-white">
            Top Tracks Across Platforms
          </h3>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {rankedTracks.length} tracks ranked
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-xs text-slate-400">
                <th className="px-6 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Track</th>
                <th className="px-4 py-3 font-medium">Album</th>
                <th className="px-4 py-3 font-medium">Genre</th>
                <th className="px-4 py-3 font-medium text-right">Plays</th>
                <th className="px-6 py-3 font-medium text-right">Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rankedTracks.map((row, idx) => (
                <tr
                  key={row.trackId}
                  onClick={() => {
                    const found = userState.tracksById[row.trackId];
                    if (found) onPlayTrack(found);
                  }}
                  className="cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <td className="px-6 py-3 font-mono text-xs text-slate-500 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ArtworkImage
                        src={row.artworkUrl}
                        alt={row.title}
                        className="h-9 w-9 rounded shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{row.title}</p>
                        <p className="truncate text-xs text-slate-400">{row.artist}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{row.album}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{row.genre}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-200 tabular-nums">
                    {row.plays}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-slate-200 tabular-nums">
                    {row.minutes}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
