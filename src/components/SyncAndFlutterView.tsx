import {
  Activity,
  Check,
  Code2,
  Copy,
  Download,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ModuleSource, SyncDiffPlan, SyncedUserState } from '../types/bitchord.ts';

interface SyncAndFlutterViewProps {
  userState: SyncedUserState;
  diffPlan: SyncDiffPlan | null;
  onPushSync: () => Promise<void>;
  onPullSync: (simulateAndroid: boolean) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onRestoreBackup: (payload: SyncedUserState) => Promise<void>;
  onUpdateModules: (modules: ModuleSource[]) => Promise<void>;
  onHealthCheckModules: () => Promise<void>;
}

interface FlutterFile {
  path: string;
  content: string;
}

export function SyncAndFlutterView({
  userState,
  diffPlan,
  onPushSync,
  onPullSync,
  onExportBackup,
  onRestoreBackup,
  onUpdateModules,
  onHealthCheckModules,
}: SyncAndFlutterViewProps) {
  const [busy, setBusy] = useState<'push' | 'pull' | 'health' | null>(null);
  const [explorerMode, setExplorerMode] = useState<'flutter' | 'v110'>('flutter');
  const [flutterFiles, setFlutterFiles] = useState<FlutterFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('lib/main.dart');
  const [v110Prefix, setV110Prefix] = useState<string>('shared/');
  const [v110Index, setV110Index] = useState<{ totalCount: number; files: string[] }>({
    totalCount: 0,
    files: [],
  });
  const [selectedV110File, setSelectedV110File] = useState<string>('');
  const [v110Content, setV110Content] = useState<string>('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [newModName, setNewModName] = useState('');
  const [newModEndpoint, setNewModEndpoint] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/flutter/files')
      .then((r) => r.json())
      .then((data: { files?: FlutterFile[] }) => {
        if (data.files && data.files.length > 0) {
          setFlutterFiles(data.files);
          if (!data.files.some((f) => f.path === selectedFile)) {
            setSelectedFile(data.files[0].path);
          }
        }
      })
      .catch(() => {});
  }, [selectedFile]);

  useEffect(() => {
    if (explorerMode !== 'v110') return;
    fetch(`/api/v110/index?prefix=${encodeURIComponent(v110Prefix)}`)
      .then((r) => r.json())
      .then((data: { totalCount: number; files: string[] }) => {
        setV110Index(data);
        if (data.files.length > 0 && !data.files.includes(selectedV110File)) {
          setSelectedV110File(data.files[0]);
        }
      })
      .catch(() => {});
  }, [explorerMode, v110Prefix, selectedV110File]);

  useEffect(() => {
    if (explorerMode !== 'v110' || !selectedV110File) return;
    fetch(`/api/v110/file?path=${encodeURIComponent(selectedV110File)}`)
      .then((r) => r.json())
      .then((data: { content?: string }) => {
        setV110Content(data.content || '');
      })
      .catch(() => setV110Content(''));
  }, [explorerMode, selectedV110File]);

  const activeFile = flutterFiles.find((f) => f.path === selectedFile);
  const activeExplorerPath = explorerMode === 'flutter' ? activeFile?.path : selectedV110File;
  const activeExplorerContent =
    explorerMode === 'flutter' ? activeFile?.content || '' : v110Content;

  const handleCopy = async (path: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { payload?: SyncedUserState } & SyncedUserState;
      const payload = parsed.payload ? parsed.payload : parsed;
      await onRestoreBackup(payload);
    } catch {
      setRestoreError('Could not parse BitChord backup JSON file.');
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModName.trim() || !newModEndpoint.trim()) return;
    const mod: ModuleSource = {
      id: `mod-${Date.now()}`,
      name: newModName.trim(),
      endpoint: newModEndpoint.trim(),
      tier: 'Hi-Res FLAC',
      enabled: true,
      latencyMs: null,
      status: 'untested',
      lastCheckedAt: null,
    };
    await onUpdateModules([...userState.modules, mod]);
    setNewModName('');
    setNewModEndpoint('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Account: {userState.accountEmail} · Revision #{userState.syncRevision}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
            Cross-Platform Sync & Flutter Unified Hub
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
            Synchronizes Liked Songs, Playlists, Replay listening partitions, Theme presets,
            Lyric offsets, and Hi-Res module sources between Android APK and Windows Flutter PC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/windows/download"
            download="BitChord-Windows-PC.zip"
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#141722] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Download Windows PC (.zip)
          </a>

          <button
            onClick={async () => {
              setBusy('pull');
              try {
                await onPullSync(true);
              } finally {
                setBusy(null);
              }
            }}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#141722] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy === 'pull' ? 'animate-spin' : ''}`} />
            Simulate Android Sync Pull
          </button>

          <button
            onClick={async () => {
              setBusy('push');
              try {
                await onPushSync();
              } finally {
                setBusy(null);
              }
            }}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            Push Desktop State
          </button>
        </div>
      </div>

      {/* Synced Devices & SHA-256 Partition Manifests */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <h2 className="font-display text-base font-semibold text-white">
              Registered Device Partitions
            </h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              Last synced {new Date(userState.lastSyncedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="mt-4 divide-y divide-white/[0.06]">
            {userState.devices.map((dev) => (
              <div key={dev.deviceId} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-slate-200">
                      {dev.platform === 'Android APK' ? (
                        <Smartphone className="h-5 w-5" />
                      ) : (
                        <Monitor className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{dev.deviceName}</p>
                      <p className="text-xs text-slate-400">
                        {dev.platform} · v{dev.appVersion} · {dev.ownerInstall}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-300 tabular-nums">
                    <p>{dev.totalPlays} plays</p>
                    <p className="text-slate-400">{dev.totalMinutes} min</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
                  {Object.entries(dev.months).map(([month, hash]) => (
                    <span key={month} className="font-mono">
                      {month}: {hash}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Backup & Diff Plan */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6">
            <h2 className="font-display text-base font-semibold text-white">
              JSON Backup & Restore (Android Schema v1)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Export or restore the full `bitchord-backup-YYYY-MM-DD.json` file compatible with
              BitChord Android DriveBackup & Desktop.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={onExportBackup}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export Backup JSON
              </button>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 transition-colors whitespace-nowrap shrink-0">
                <Upload className="h-3.5 w-3.5" />
                Restore JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            {restoreError && (
              <p className="mt-2 text-xs text-rose-400">{restoreError}</p>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6">
            <h2 className="font-display text-base font-semibold text-white">
              SyncPlanner Diff Status
            </h2>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Liked Songs Synced</span>
                <span className="font-mono tabular-nums">{userState.likedTrackIds.length} tracks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Playlists Synced</span>
                <span className="font-mono tabular-nums">{userState.playlists.length} lists</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lyric Timing Offsets</span>
                <span className="font-mono tabular-nums">
                  {Object.keys(userState.lyricOffsetsMs).length} tracks
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pending Uploads</span>
                <span className="font-mono tabular-nums">
                  {diffPlan?.toUpload.length || 0} chunks
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pluggable Hi-Res Module Sources (Android Parity) */}
      <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Pluggable Hi-Res & Atmos Module Sources
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Synced module addons for lossless FLAC, ALAC, and Dolby Atmos E-AC-3 JOC streams.
            </p>
          </div>
          <button
            onClick={async () => {
              setBusy('health');
              try {
                await onHealthCheckModules();
              } finally {
                setBusy(null);
              }
            }}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <Activity className="h-3.5 w-3.5" />
            {busy === 'health' ? 'Checking Nodes...' : 'Run Health Check'}
          </button>
        </div>

        <div className="mt-4 divide-y divide-white/[0.06]">
          {userState.modules.map((mod) => (
            <div
              key={mod.id}
              className="flex flex-wrap items-center justify-between gap-4 py-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-medium text-white">{mod.name}</p>
                  <span className="text-xs text-slate-400">· {mod.tier}</span>
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                  {mod.endpoint}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`font-mono text-xs tabular-nums ${
                    mod.status === 'healthy'
                      ? 'text-emerald-400'
                      : mod.status === 'offline'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                  }`}
                >
                  {mod.status.toUpperCase()}
                  {mod.latencyMs !== null ? ` · ${mod.latencyMs}ms` : ''}
                </span>
                <button
                  onClick={() =>
                    onUpdateModules(
                      userState.modules.map((m) =>
                        m.id === mod.id ? { ...m, enabled: !m.enabled } : m
                      )
                    )
                  }
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    mod.enabled
                      ? 'bg-white text-slate-950'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {mod.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddModule} className="mt-4 flex flex-wrap gap-3 border-t border-white/[0.08] pt-4">
          <input
            type="text"
            placeholder="Module name (e.g. Custom FLAC Mirror)"
            value={newModName}
            onChange={(e) => setNewModName(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-[#090A0F] px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-white/30"
          />
          <input
            type="url"
            placeholder="https://node.example.com/stream"
            value={newModEndpoint}
            onChange={(e) => setNewModEndpoint(e.target.value)}
            className="flex-1 min-w-[240px] rounded-lg border border-white/10 bg-[#090A0F] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Source
          </button>
        </form>
      </div>

      {/* Unified Flutter & BitChord v1.10 Source Explorer */}
      <div className="rounded-xl border border-white/[0.08] bg-[#11131B] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Code2 className="h-4 w-4 text-slate-400" />
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Repository Source Explorer
              </h2>
              <p className="text-xs text-slate-400">
                Browse the unified Flutter codebase (`/flutter_app`) and imported BitChord v1.10
                source (`/bitchord_v1_10_source`).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-[#090A0F] p-1 border border-white/[0.08]">
              <button
                onClick={() => setExplorerMode('flutter')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  explorerMode === 'flutter'
                    ? 'bg-white text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Flutter Unified
              </button>
              <button
                onClick={() => setExplorerMode('v110')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  explorerMode === 'v110'
                    ? 'bg-white text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                BitChord v1.10 Source
              </button>
            </div>

            {activeExplorerPath && (
              <button
                onClick={() => handleCopy(activeExplorerPath, activeExplorerContent)}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedPath === activeExplorerPath ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy File
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {explorerMode === 'v110' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0D0F15] px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {['shared/', 'sharedUi/', 'app/', 'backend/', 'native/', 'web/', 'tv/', 'wearos/'].map(
                (prefix) => (
                  <button
                    key={prefix}
                    onClick={() => setV110Prefix(prefix)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors whitespace-nowrap shrink-0 ${
                      v110Prefix === prefix
                        ? 'bg-white text-slate-950 font-semibold'
                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {prefix}
                  </button>
                )
              )}
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {v110Index.totalCount} files in {v110Prefix}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="max-h-[380px] overflow-y-auto border-b border-white/[0.08] bg-[#0D0F15] p-3 lg:col-span-4 lg:border-b-0 lg:border-r">
            <div className="space-y-1">
              {explorerMode === 'flutter'
                ? flutterFiles.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => setSelectedFile(f.path)}
                      className={`block w-full truncate rounded-lg px-3 py-2 text-left font-mono text-xs transition-colors ${
                        selectedFile === f.path
                          ? 'bg-white text-slate-950 font-semibold'
                          : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      {f.path}
                    </button>
                  ))
                : v110Index.files.map((filePath) => (
                    <button
                      key={filePath}
                      onClick={() => setSelectedV110File(filePath)}
                      className={`block w-full truncate rounded-lg px-3 py-2 text-left font-mono text-xs transition-colors ${
                        selectedV110File === filePath
                          ? 'bg-white text-slate-950 font-semibold'
                          : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      {filePath}
                    </button>
                  ))}
            </div>
          </div>
          <div className="max-h-[380px] overflow-auto bg-[#090A0F] p-5 lg:col-span-8">
            <pre className="font-mono text-xs leading-relaxed text-slate-300">
              <code>
                {activeExplorerContent || 'Select a file to inspect its source code...'}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
