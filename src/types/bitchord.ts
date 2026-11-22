export type AudioQualityTier =
  | 'Hi-Res Lossless'
  | 'Dolby Atmos'
  | 'Lossless FLAC'
  | 'AAC 256kbps';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  durationSec: number;
  artworkUrl: string;
  previewUrl?: string;
  quality: AudioQualityTier;
  sampleRate?: string;
  genre?: string;
  releaseYear?: number;
  bpm?: number;
  isExplicit?: boolean;
  paletteColor?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  artworkUrl: string;
  trackIds: string[];
  updatedAt: number;
  source: 'BitChord' | 'Spotify Transfer' | 'YouTube Music';
}

export interface LyricLine {
  timeMs: number;
  text: string;
  romanized?: string;
  translation?: string;
}

export type LyricsProvider =
  | 'LRCLIB'
  | 'BetterLyrics'
  | 'BiniLyrics'
  | 'SimpMusic'
  | 'BitChord Local';

export interface LyricsResponse {
  provider: LyricsProvider;
  synced: boolean;
  lines: LyricLine[];
  plainText: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  creators: string[];
  blurb: string;
  accent: string;
  background: {
    saturation: number;
    scale: number;
    npDim: number;
    pageDim: number;
    reactive: number;
    solid: string;
    mode: 'kawarp' | 'cover_static' | 'cover_fullbleed';
  };
  lyrics: {
    size: number;
    inactiveAlpha: number;
    pastAlpha: number;
    blurPx: number;
    liftPx: number;
    blurScope: 'all' | 'upcoming' | 'past';
  };
  cover: {
    radius: number;
    spinningVinyl?: boolean;
  };
}

export interface ModuleSource {
  id: string;
  name: string;
  endpoint: string;
  tier: 'Hi-Res FLAC' | 'Dolby Atmos' | 'Lossless ALAC';
  enabled: boolean;
  latencyMs: number | null;
  status: 'healthy' | 'degraded' | 'offline' | 'untested';
  lastCheckedAt: number | null;
}

export interface DeviceSyncManifest {
  deviceId: string;
  deviceName: string;
  platform: 'Android APK' | 'Windows PC (Flutter)' | 'Web Desktop';
  appVersion: string;
  ownerInstall: string;
  updatedAt: number;
  months: Record<string, string>;
  totalPlays: number;
  totalMinutes: number;
}

export interface MonthlyListeningChunk {
  deviceId: string;
  month: string;
  sha256: string;
  playsByTrack: Record<string, number>;
  minutesByTrack: Record<string, number>;
  trackMeta: Record<
    string,
    {
      title: string;
      artist: string;
      album: string;
      genre: string;
      artworkUrl: string;
    }
  >;
}

export interface HistoryEntry {
  trackId: string;
  playedAt: number;
  deviceId: string;
}

export interface AppSettingsState {
  themePresetId: string;
  crossfadeSeconds: number;
  automixEnabled: boolean;
  playbackSpeed: number;
  skipSilence: boolean;
  normalizeVolume: boolean;
  preferAtmos: boolean;
  qualityWifi: AudioQualityTier;
  qualityCellular: AudioQualityTier;
  scrobbleLastFm: boolean;
  scrobbleListenBrainz: boolean;
  discordRpc: boolean;
  showListenTogetherButton: boolean;
  eqPreset: 'Flat' | 'Warm Studio' | 'Bass Boost' | 'Vocal Clarity' | 'Late Night';
}

export interface SyncedUserState {
  accountEmail: string;
  displayName: string;
  syncRevision: number;
  lastSyncedAt: number;
  likedTrackIds: string[];
  tracksById: Record<string, Track>;
  playlists: Playlist[];
  history: HistoryEntry[];
  lyricOffsetsMs: Record<string, number>;
  settings: AppSettingsState;
  modules: ModuleSource[];
  devices: DeviceSyncManifest[];
  monthlyChunks: MonthlyListeningChunk[];
}

export interface SyncDiffPlan {
  deviceId: string;
  remoteMonths: string[];
  localMonths: string[];
  toUpload: string[];
  toDownloadFromPeers: { deviceId: string; deviceName: string; months: string[] }[];
  settingsSyncPending: boolean;
}

export interface JamMember {
  id: string;
  name: string;
  platform: string;
  joinedAt: number;
  isHost: boolean;
}

export interface JamRoom {
  code: string;
  hostId: string;
  hostName: string;
  hostControlsOnly: boolean;
  allowGuestQueue: boolean;
  members: JamMember[];
  currentTrack: Track | null;
  isPlaying: boolean;
  positionSec: number;
  updatedAt: number;
  queue: Track[];
}

export type NavSection =
  | 'home'
  | 'explore'
  | 'search'
  | 'library'
  | 'replay'
  | 'sync'
  | 'jam'
  | 'transfer'
  | 'settings';

export type LibraryTab = 'playlists' | 'songs' | 'albums' | 'history' | 'downloads';
