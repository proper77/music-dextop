import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import {
  CURATED_TRACKS,
  DEFAULT_MODULES,
  DEFAULT_PLAYLISTS,
  FALLBACK_LYRICS_BY_TRACK,
} from './src/data/presetsAndCatalog.ts';
import type {
  AppSettingsState,
  DeviceSyncManifest,
  JamRoom,
  LyricLine,
  LyricsProvider,
  LyricsResponse,
  ModuleSource,
  MonthlyListeningChunk,
  Playlist,
  SyncDiffPlan,
  SyncedUserState,
  Track,
} from './src/types/bitchord.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const JAM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function sha256Hex(input: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildInitialState(): SyncedUserState {
  const tracksById: Record<string, Track> = {};
  for (const t of CURATED_TRACKS) {
    tracksById[t.id] = t;
  }

  const now = Date.now();
  const thisMonth = currentMonthKey();

  const androidChunk: MonthlyListeningChunk = {
    deviceId: 'dev-android-pixel9',
    month: thisMonth,
    sha256: '',
    playsByTrack: {
      'bc-midnight-01': 19,
      'bc-solar-02': 14,
      'bc-glass-03': 11,
      'bc-velvet-04': 8,
    },
    minutesByTrack: {
      'bc-midnight-01': 71,
      'bc-solar-02': 46,
      'bc-glass-03': 45,
      'bc-velvet-04': 28,
    },
    trackMeta: Object.fromEntries(
      CURATED_TRACKS.slice(0, 4).map((t) => [
        t.id,
        {
          title: t.title,
          artist: t.artist,
          album: t.album,
          genre: t.genre || 'Electronic',
          artworkUrl: t.artworkUrl,
        },
      ])
    ),
  };
  androidChunk.sha256 = sha256Hex(androidChunk.playsByTrack);

  const pcChunk: MonthlyListeningChunk = {
    deviceId: 'dev-win-flutter-01',
    month: thisMonth,
    sha256: '',
    playsByTrack: {
      'bc-midnight-01': 12,
      'bc-velvet-04': 15,
      'bc-midnight-05': 9,
      'bc-solar-06': 7,
    },
    minutesByTrack: {
      'bc-midnight-01': 45,
      'bc-velvet-04': 53,
      'bc-midnight-05': 28,
      'bc-solar-06': 27,
    },
    trackMeta: Object.fromEntries(
      CURATED_TRACKS.map((t) => [
        t.id,
        {
          title: t.title,
          artist: t.artist,
          album: t.album,
          genre: t.genre || 'Electronic',
          artworkUrl: t.artworkUrl,
        },
      ])
    ),
  };
  pcChunk.sha256 = sha256Hex(pcChunk.playsByTrack);

  const devices: DeviceSyncManifest[] = [
    {
      deviceId: 'dev-win-flutter-01',
      deviceName: 'Workstation-Win11 (Flutter Desktop)',
      platform: 'Windows PC (Flutter)',
      appVersion: '2.4.0-unified',
      ownerInstall: 'install-win-8821',
      updatedAt: now - 180_000,
      months: { [thisMonth]: pcChunk.sha256 },
      totalPlays: 43,
      totalMinutes: 153,
    },
    {
      deviceId: 'dev-android-pixel9',
      deviceName: 'Pixel 9 Pro (BitChord APK)',
      platform: 'Android APK',
      appVersion: '3.2.1',
      ownerInstall: 'install-apk-4410',
      updatedAt: now - 640_000,
      months: { [thisMonth]: androidChunk.sha256 },
      totalPlays: 52,
      totalMinutes: 190,
    },
  ];

  const defaultSettings: AppSettingsState = {
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

  return {
    accountEmail: 'samweldaniel828@gmail.com',
    displayName: 'Samwel Daniel',
    syncRevision: 14,
    lastSyncedAt: now - 180_000,
    likedTrackIds: ['bc-midnight-01', 'bc-solar-02', 'bc-velvet-04'],
    tracksById,
    playlists: DEFAULT_PLAYLISTS,
    history: [
      { trackId: 'bc-midnight-01', playedAt: now - 420_000, deviceId: 'dev-win-flutter-01' },
      { trackId: 'bc-velvet-04', playedAt: now - 1200_000, deviceId: 'dev-android-pixel9' },
      { trackId: 'bc-solar-02', playedAt: now - 2400_000, deviceId: 'dev-android-pixel9' },
    ],
    lyricOffsetsMs: {
      'bc-midnight-01': 0,
      'bc-solar-02': -150,
    },
    settings: defaultSettings,
    modules: DEFAULT_MODULES,
    devices,
    monthlyChunks: [pcChunk, androidChunk],
  };
}

let userState: SyncedUserState = buildInitialState();
const jamRooms = new Map<string, JamRoom>();

// Seed one demo Jam Room so user can test joining or create their own
jamRooms.set('BCHD26', {
  code: 'BCHD26',
  hostId: 'peer-pixel9',
  hostName: 'Pixel 9 Pro (Android)',
  hostControlsOnly: false,
  allowGuestQueue: true,
  members: [
    {
      id: 'peer-pixel9',
      name: 'Samwel · Pixel 9 Pro',
      platform: 'Android APK',
      joinedAt: Date.now() - 600_000,
      isHost: true,
    },
  ],
  currentTrack: CURATED_TRACKS[0],
  isPlaying: false,
  positionSec: 24,
  updatedAt: Date.now(),
  queue: [CURATED_TRACKS[1], CURATED_TRACKS[3]],
});

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += JAM_ALPHABET[Math.floor(Math.random() * JAM_ALPHABET.length)];
  }
  return jamRooms.has(code) ? generateRoomCode() : code;
}

interface ItunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  artistId?: number;
  collectionName?: string;
  collectionId?: number;
  trackTimeMillis?: number;
  artworkUrl100?: string;
  previewUrl?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackExplicitness?: string;
}

async function searchItunes(query: string, limit = 18): Promise<Track[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { results?: ItunesSong[] };
    const results = data.results || [];
    return results
      .filter((r) => r.trackId && r.trackName && r.artistName)
      .map((r) => {
        const art = r.artworkUrl100
          ? r.artworkUrl100.replace('100x100bb', '600x600bb')
          : CURATED_TRACKS[0].artworkUrl;
        const year = r.releaseDate ? new Date(r.releaseDate).getFullYear() : 2025;
        return {
          id: `it-${r.trackId}`,
          title: r.trackName,
          artist: r.artistName,
          artistId: r.artistId ? `it-art-${r.artistId}` : undefined,
          album: r.collectionName || 'Single',
          albumId: r.collectionId ? `it-alb-${r.collectionId}` : undefined,
          durationSec: Math.max(30, Math.round((r.trackTimeMillis || 180_000) / 1000)),
          artworkUrl: art,
          previewUrl: r.previewUrl,
          quality: 'Hi-Res Lossless',
          sampleRate: '24-bit / 96 kHz (Hi-Res Mirror)',
          genre: r.primaryGenreName || 'Music',
          releaseYear: Number.isFinite(year) ? year : 2025,
          isExplicit: r.trackExplicitness === 'explicit',
        } satisfies Track;
      });
  } catch {
    return [];
  }
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/;
  for (const rawLine of lrc.split(/\r?\n/)) {
    const m = rawLine.match(regex);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const frac = m[3] ? Number(m[3].padEnd(3, '0').slice(0, 3)) : 0;
    const text = m[4].trim();
    if (!text) continue;
    lines.push({
      timeMs: min * 60_000 + sec * 1000 + frac,
      text,
    });
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

let browseCache: { expiresAt: number; trending: Track[]; electronic: Track[] } | null = null;

function computeDiffPlan(deviceId: string): SyncDiffPlan {
  const localDev = userState.devices.find((d) => d.deviceId === deviceId);
  const localChunks = userState.monthlyChunks.filter((c) => c.deviceId === deviceId);
  const localMonths = localChunks.map((c) => c.month);
  const remoteMonths = Object.keys(localDev?.months || {});
  const toUpload = localChunks
    .filter((c) => localDev?.months[c.month] !== c.sha256)
    .map((c) => c.month);

  const toDownloadFromPeers = userState.devices
    .filter((d) => d.deviceId !== deviceId)
    .map((peer) => ({
      deviceId: peer.deviceId,
      deviceName: peer.deviceName,
      months: Object.keys(peer.months),
    }));

  return {
    deviceId,
    remoteMonths,
    localMonths,
    toUpload,
    toDownloadFromPeers,
    settingsSyncPending: false,
  };
}

function readFlutterFiles(): { path: string; content: string }[] {
  const flutterDir = path.join(__dirname, 'flutter_app');
  if (!fs.existsSync(flutterDir)) return [];
  const files: { path: string; content: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith('.dart') ||
        entry.name.endsWith('.yaml') ||
        entry.name.endsWith('.md') ||
        entry.name.endsWith('.txt') ||
        entry.name.endsWith('.bat')
      ) {
        files.push({
          path: path.relative(flutterDir, full).replace(/\\/g, '/'),
          content: fs.readFileSync(full, 'utf8'),
        });
      }
    }
  };
  walk(flutterDir);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipBuffer(entries: { name: string; data: Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += 30 + nameBuf.length + size;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

function listV110SourceFiles(prefix = ''): { totalCount: number; files: string[] } {
  const rootDir = path.join(__dirname, 'bitchord_v1_10_source');
  if (!fs.existsSync(rootDir)) return { totalCount: 0, files: [] };
  const all: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const rel = path.relative(rootDir, full).replace(/\\/g, '/');
        if (!prefix || rel.startsWith(prefix)) {
          all.push(rel);
        }
      }
    }
  };
  walk(rootDir);
  all.sort((a, b) => a.localeCompare(b));
  return { totalCount: all.length, files: all.slice(0, 150) };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // --- Music Browse & Live Search ---
  app.get('/api/music/browse', async (_req, res) => {
    const now = Date.now();
    if (!browseCache || browseCache.expiresAt < now) {
      const [trending, electronic] = await Promise.all([
        searchItunes('The Weeknd Midnight', 8),
        searchItunes('Daft Punk Discovery', 8),
      ]);
      browseCache = {
        expiresAt: now + 10 * 60_000,
        trending: trending.length ? trending : CURATED_TRACKS.slice(0, 6),
        electronic: electronic.length ? electronic : CURATED_TRACKS.slice(2, 8),
      };
    }

    for (const t of [...browseCache.trending, ...browseCache.electronic]) {
      if (!userState.tracksById[t.id]) {
        userState.tracksById[t.id] = t;
      }
    }

    res.json({
      quickPicks: CURATED_TRACKS,
      trending: browseCache.trending,
      electronic: browseCache.electronic,
    });
  });

  app.get('/api/music/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ tracks: CURATED_TRACKS });
    }
    const lower = q.toLowerCase();
    const localMatches = Object.values(userState.tracksById).filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        t.album.toLowerCase().includes(lower)
    );
    const itunesMatches = await searchItunes(q, 20);
    for (const t of itunesMatches) {
      userState.tracksById[t.id] = t;
    }
    const seen = new Set<string>();
    const combined: Track[] = [];
    for (const t of [...itunesMatches, ...localMatches]) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    res.json({ tracks: combined });
  });

  // --- Synced Lyrics (LRCLIB + Fallback) ---
  app.get('/api/lyrics', async (req, res) => {
    const trackId = String(req.query.trackId || '');
    const title = String(req.query.title || '').trim();
    const artist = String(req.query.artist || '').trim();
    const album = String(req.query.album || '').trim();
    const duration = Number(req.query.duration || 0);
    const provider = (String(req.query.provider || 'LRCLIB') as LyricsProvider) || 'LRCLIB';

    if (FALLBACK_LYRICS_BY_TRACK[trackId]) {
      const lines = FALLBACK_LYRICS_BY_TRACK[trackId];
      const resp: LyricsResponse = {
        provider: 'BitChord Local',
        synced: true,
        lines,
        plainText: lines.map((l) => l.text).join('\n'),
      };
      return res.json(resp);
    }

    if (title && artist) {
      try {
        const params = new URLSearchParams({
          track_name: title,
          artist_name: artist,
        });
        if (album) params.set('album_name', album);
        if (duration > 0) params.set('duration', String(Math.round(duration)));

        const r = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
          headers: { 'User-Agent': 'BitChord-Unified-Desktop/2.4.0' },
          signal: AbortSignal.timeout(4500),
        });
        if (r.ok) {
          const data = (await r.json()) as {
            syncedLyrics?: string;
            plainLyrics?: string;
          };
          if (data.syncedLyrics) {
            const lines = parseLrc(data.syncedLyrics);
            if (lines.length > 0) {
              return res.json({
                provider,
                synced: true,
                lines,
                plainText: data.plainLyrics || lines.map((l) => l.text).join('\n'),
              } satisfies LyricsResponse);
            }
          }
          if (data.plainLyrics) {
            const rawLines = data.plainLyrics
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean);
            return res.json({
              provider,
              synced: false,
              lines: rawLines.map((text, idx) => ({ timeMs: idx * 3500, text })),
              plainText: data.plainLyrics,
            } satisfies LyricsResponse);
          }
        }
      } catch {
        // Fallback below
      }
    }

    const demoLines: LyricLine[] = [
      { timeMs: 0, text: `${title || 'Instrumental Track'}` },
      { timeMs: 3200, text: `Performed by ${artist || 'BitChord Artist'}` },
      { timeMs: 7000, text: 'Synced lyrics timing offset is stored across Android & Windows PC' },
      { timeMs: 12000, text: 'Adjust offset in milliseconds or switch lyric provider above' },
    ];
    res.json({
      provider: 'BitChord Local',
      synced: true,
      lines: demoLines,
      plainText: demoLines.map((l) => l.text).join('\n'),
    } satisfies LyricsResponse);
  });

  // --- Cross-Platform Sync Engine (Android <-> Windows PC / Flutter) ---
  app.get('/api/sync/state', (_req, res) => {
    res.json({
      state: userState,
      diffPlan: computeDiffPlan('dev-win-flutter-01'),
    });
  });

  app.post('/api/sync/push', (req, res) => {
    const body = req.body as Partial<SyncedUserState> & { deviceId?: string };
    const deviceId = body.deviceId || 'dev-win-flutter-01';
    const now = Date.now();

    if (Array.isArray(body.likedTrackIds)) userState.likedTrackIds = body.likedTrackIds;
    if (body.tracksById) userState.tracksById = { ...userState.tracksById, ...body.tracksById };
    if (Array.isArray(body.playlists)) userState.playlists = body.playlists;
    if (Array.isArray(body.history)) userState.history = body.history.slice(0, 100);
    if (body.lyricOffsetsMs) {
      userState.lyricOffsetsMs = { ...userState.lyricOffsetsMs, ...body.lyricOffsetsMs };
    }
    if (body.settings) userState.settings = { ...userState.settings, ...body.settings };
    if (Array.isArray(body.modules)) userState.modules = body.modules;

    userState.syncRevision += 1;
    userState.lastSyncedAt = now;

    const dev = userState.devices.find((d) => d.deviceId === deviceId);
    if (dev) {
      dev.updatedAt = now;
      for (const chunk of userState.monthlyChunks.filter((c) => c.deviceId === deviceId)) {
        chunk.sha256 = sha256Hex(chunk.playsByTrack);
        dev.months[chunk.month] = chunk.sha256;
      }
    }

    res.json({
      state: userState,
      diffPlan: computeDiffPlan(deviceId),
    });
  });

  app.post('/api/sync/pull', (req, res) => {
    const { deviceId = 'dev-win-flutter-01', simulateAndroidActivity = false } = req.body as {
      deviceId?: string;
      simulateAndroidActivity?: boolean;
    };
    const now = Date.now();

    if (simulateAndroidActivity) {
      const month = currentMonthKey();
      const peerChunk = userState.monthlyChunks.find(
        (c) => c.deviceId === 'dev-android-pixel9' && c.month === month
      );
      if (peerChunk) {
        const track = CURATED_TRACKS[Math.floor(Math.random() * CURATED_TRACKS.length)];
        peerChunk.playsByTrack[track.id] = (peerChunk.playsByTrack[track.id] || 0) + 1;
        peerChunk.minutesByTrack[track.id] = (peerChunk.minutesByTrack[track.id] || 0) + 4;
        peerChunk.sha256 = sha256Hex(peerChunk.playsByTrack);
        const peerDev = userState.devices.find((d) => d.deviceId === 'dev-android-pixel9');
        if (peerDev) {
          peerDev.totalPlays += 1;
          peerDev.totalMinutes += 4;
          peerDev.updatedAt = now;
          peerDev.months[month] = peerChunk.sha256;
        }
        userState.history.unshift({
          trackId: track.id,
          playedAt: now - 15_000,
          deviceId: 'dev-android-pixel9',
        });
      }
    }

    userState.lastSyncedAt = now;
    res.json({
      state: userState,
      diffPlan: computeDiffPlan(deviceId),
    });
  });

  app.post('/api/sync/record-play', (req, res) => {
    const { track, deviceId = 'dev-win-flutter-01' } = req.body as {
      track: Track;
      deviceId?: string;
    };
    if (!track?.id) return res.status(400).json({ error: 'Track required' });

    const now = Date.now();
    const month = currentMonthKey();
    userState.tracksById[track.id] = track;
    userState.history = [
      { trackId: track.id, playedAt: now, deviceId },
      ...userState.history,
    ].slice(0, 100);

    let chunk = userState.monthlyChunks.find(
      (c) => c.deviceId === deviceId && c.month === month
    );
    if (!chunk) {
      chunk = {
        deviceId,
        month,
        sha256: '',
        playsByTrack: {},
        minutesByTrack: {},
        trackMeta: {},
      };
      userState.monthlyChunks.push(chunk);
    }

    const addMinutes = Math.max(1, Math.round((track.durationSec || 180) / 60));
    chunk.playsByTrack[track.id] = (chunk.playsByTrack[track.id] || 0) + 1;
    chunk.minutesByTrack[track.id] = (chunk.minutesByTrack[track.id] || 0) + addMinutes;
    chunk.trackMeta[track.id] = {
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre || 'Music',
      artworkUrl: track.artworkUrl,
    };
    chunk.sha256 = sha256Hex(chunk.playsByTrack);

    const dev = userState.devices.find((d) => d.deviceId === deviceId);
    if (dev) {
      dev.totalPlays += 1;
      dev.totalMinutes += addMinutes;
      dev.updatedAt = now;
      dev.months[month] = chunk.sha256;
    }

    res.json({ state: userState });
  });

  app.post('/api/sync/backup', (_req, res) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    res.json({
      filename: `bitchord-backup-${dateStr}.json`,
      schemaVersion: 1,
      exportedAt: Date.now(),
      payload: userState,
    });
  });

  app.post('/api/sync/restore', (req, res) => {
    const { payload } = req.body as { payload?: SyncedUserState };
    if (!payload || !payload.settings || !Array.isArray(payload.playlists)) {
      return res.status(400).json({ error: 'Invalid BitChord backup JSON schema' });
    }
    userState = {
      ...payload,
      syncRevision: (payload.syncRevision || 1) + 1,
      lastSyncedAt: Date.now(),
    };
    res.json({ state: userState });
  });

  app.post('/api/sync/modules/health', async (req, res) => {
    const { modules } = req.body as { modules?: ModuleSource[] };
    const list = modules || userState.modules;
    const checked: ModuleSource[] = await Promise.all(
      list.map(async (m) => {
        const start = Date.now();
        if (m.endpoint.includes('.internal')) {
          return {
            ...m,
            latencyMs: 28 + Math.floor(Math.random() * 45),
            status: m.enabled ? 'healthy' : 'untested',
            lastCheckedAt: Date.now(),
          };
        }
        try {
          const resp = await fetch(m.endpoint, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000),
          });
          return {
            ...m,
            latencyMs: Date.now() - start,
            status: resp.ok || resp.status < 500 ? 'healthy' : 'degraded',
            lastCheckedAt: Date.now(),
          };
        } catch {
          return {
            ...m,
            latencyMs: null,
            status: 'offline',
            lastCheckedAt: Date.now(),
          };
        }
      })
    );
    userState.modules = checked;
    res.json({ modules: checked });
  });

  // --- Listen Together / Jam Relay ---
  app.post('/api/jam/create', (req, res) => {
    const { hostName = 'Windows Workstation', currentTrack = null } = req.body as {
      hostName?: string;
      currentTrack?: Track | null;
    };
    const code = generateRoomCode();
    const hostId = `host-${crypto.randomBytes(4).toString('hex')}`;
    const room: JamRoom = {
      code,
      hostId,
      hostName,
      hostControlsOnly: false,
      allowGuestQueue: true,
      members: [
        {
          id: hostId,
          name: hostName,
          platform: 'Windows PC (Flutter)',
          joinedAt: Date.now(),
          isHost: true,
        },
      ],
      currentTrack,
      isPlaying: Boolean(currentTrack),
      positionSec: 0,
      updatedAt: Date.now(),
      queue: [],
    };
    jamRooms.set(code, room);
    res.json({ room, memberId: hostId });
  });

  app.post('/api/jam/join', (req, res) => {
    const { code, memberName = 'Desktop Guest', platform = 'Windows PC' } = req.body as {
      code?: string;
      memberName?: string;
      platform?: string;
    };
    const normalized = String(code || '').trim().toUpperCase();
    const room = jamRooms.get(normalized);
    if (!room) {
      return res.status(404).json({ error: `Jam room ${normalized} not found` });
    }
    const memberId = `mem-${crypto.randomBytes(4).toString('hex')}`;
    room.members.push({
      id: memberId,
      name: memberName,
      platform,
      joinedAt: Date.now(),
      isHost: false,
    });
    room.updatedAt = Date.now();
    res.json({ room, memberId });
  });

  app.get('/api/jam/:code', (req, res) => {
    const room = jamRooms.get(req.params.code.toUpperCase());
    if (!room) return res.status(404).json({ error: 'Jam room not found' });
    res.json({ room });
  });

  app.post('/api/jam/:code/action', (req, res) => {
    const room = jamRooms.get(req.params.code.toUpperCase());
    if (!room) return res.status(404).json({ error: 'Jam room not found' });
    const { type, track, isPlaying, positionSec, hostControlsOnly, allowGuestQueue } = req.body as {
      type: 'play' | 'pause' | 'seek' | 'set_track' | 'enqueue' | 'settings';
      track?: Track;
      isPlaying?: boolean;
      positionSec?: number;
      hostControlsOnly?: boolean;
      allowGuestQueue?: boolean;
    };
    if (type === 'play') room.isPlaying = true;
    if (type === 'pause') room.isPlaying = false;
    if (type === 'seek' && typeof positionSec === 'number') room.positionSec = positionSec;
    if (type === 'set_track' && track) {
      room.currentTrack = track;
      room.positionSec = 0;
      room.isPlaying = isPlaying ?? true;
    }
    if (type === 'enqueue' && track) room.queue.push(track);
    if (type === 'settings') {
      if (typeof hostControlsOnly === 'boolean') room.hostControlsOnly = hostControlsOnly;
      if (typeof allowGuestQueue === 'boolean') room.allowGuestQueue = allowGuestQueue;
    }
    room.updatedAt = Date.now();
    res.json({ room });
  });

  app.post('/api/jam/:code/leave', (req, res) => {
    const room = jamRooms.get(req.params.code.toUpperCase());
    if (!room) return res.json({ ok: true });
    const { memberId } = req.body as { memberId?: string };
    if (memberId) {
      room.members = room.members.filter((m) => m.id !== memberId);
    }
    res.json({ ok: true });
  });

  // --- Spotify Playlist Transfer ---
  app.post('/api/transfer/parse', async (req, res) => {
    const { playlistName = 'Transferred Spotify Playlist', lines = [] } = req.body as {
      playlistName?: string;
      lines?: string[];
    };
    const queries = lines
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 12);

    const matched: Track[] = [];
    for (const q of queries) {
      const found = await searchItunes(q, 1);
      if (found[0]) {
        userState.tracksById[found[0].id] = found[0];
        matched.push(found[0]);
      } else {
        const fallback = CURATED_TRACKS[matched.length % CURATED_TRACKS.length];
        matched.push(fallback);
      }
    }

    const newPlaylist: Playlist = {
      id: `pl-transfer-${Date.now()}`,
      name: playlistName,
      description: `Transferred ${matched.length} tracks · Synced to Android & Windows PC`,
      artworkUrl: matched[0]?.artworkUrl || CURATED_TRACKS[0].artworkUrl,
      trackIds: matched.map((t) => t.id),
      updatedAt: Date.now(),
      source: 'Spotify Transfer',
    };
    userState.playlists = [newPlaylist, ...userState.playlists];
    userState.syncRevision += 1;
    userState.lastSyncedAt = Date.now();

    res.json({ playlist: newPlaylist, tracks: matched, state: userState });
  });

  // --- Flutter Unified Codebase & BitChord v1.10 Source Inspector ---
  app.get('/api/flutter/files', (_req, res) => {
    res.json({ files: readFlutterFiles() });
  });

  app.get('/api/windows/download', (req, res) => {
    const files = readFlutterFiles();
    const hostOrigin =
      process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const readmeWin = [
      'BitChord Unified Desktop for Windows PC',
      '========================================',
      '',
      'Option 1 — Instant Desktop Window (No SDK required):',
      `  Double-click BitChord-Desktop.bat (connects to ${hostOrigin})`,
      '',
      'Option 2 — Native Flutter Windows .exe Build:',
      '  1. Install Flutter for Windows (https://docs.flutter.dev/get-started/install/windows)',
      '  2. Double-click build_windows.bat',
      '  3. Runs flutter build windows --release and launches bitchord_unified.exe',
      '',
    ].join('\r\n');

    const entries = [
      {
        name: 'BitChord-Windows-PC/README-WINDOWS.txt',
        data: Buffer.from(readmeWin, 'utf8'),
      },
      ...files.map((f) => ({
        name: `BitChord-Windows-PC/${f.path}`,
        data: Buffer.from(
          f.path === 'BitChord-Desktop.bat' || f.path === 'build_windows.bat'
            ? f.content.replace(
                'https://ais-dev-svjilu3eecrunzjygvrdvp-379631084715.europe-west3.run.app',
                hostOrigin
              )
            : f.content,
          'utf8'
        ),
      })),
    ];

    const zipBuf = buildZipBuffer(entries);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="BitChord-Windows-PC.zip"');
    res.send(zipBuf);
  });

  app.get('/api/v110/index', (req, res) => {
    const prefix = String(req.query.prefix || '').trim();
    res.json(listV110SourceFiles(prefix));
  });

  app.get('/api/v110/file', (req, res) => {
    const rel = String(req.query.path || '').trim();
    if (!rel) return res.status(400).json({ error: 'path required' });
    const rootDir = path.resolve(__dirname, 'bitchord_v1_10_source');
    const resolved = path.resolve(rootDir, rel);
    if (!resolved.startsWith(rootDir + path.sep) || !fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const stat = fs.statSync(resolved);
    if (stat.size > 250_000) {
      return res.json({
        path: rel,
        content: `// File truncated (${stat.size} bytes). Open ${rel} directly in bitchord_v1_10_source/.`,
      });
    }
    res.json({
      path: rel,
      content: fs.readFileSync(resolved, 'utf8'),
    });
  });

  // --- Vite / Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BitChord Unified Desktop server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
