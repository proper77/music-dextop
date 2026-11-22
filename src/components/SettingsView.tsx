import type { AppSettingsState, AudioQualityTier, ThemePreset } from '../types/bitchord.ts';

interface SettingsViewProps {
  settings: AppSettingsState;
  presets: ThemePreset[];
  onUpdateSettings: (patch: Partial<AppSettingsState>) => void;
}

const QUALITY_OPTIONS: AudioQualityTier[] = [
  'Hi-Res Lossless',
  'Dolby Atmos',
  'Lossless FLAC',
  'AAC 256kbps',
];

const EQ_PRESETS: AppSettingsState['eqPreset'][] = [
  'Flat',
  'Warm Studio',
  'Bass Boost',
  'Vocal Clarity',
  'Late Night',
];

export function SettingsView({
  settings,
  presets,
  onUpdateSettings,
}: SettingsViewProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-medium text-slate-400">
          Unified Preferences · Synced to Android APK & Windows Flutter PC
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
          Settings & Theme Presets
        </h1>
      </div>

      {/* Theme Presets from BitChord PC */}
      <div className="rounded-xl border border-white/[0.08] bg-[#11131B] p-6">
        <h2 className="font-display text-base font-semibold text-white">
          Now Playing & Player Theme Presets
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Ported from BitChord PC `presets.json`. Controls backdrop warp, lyric depth blur,
          vinyl disc cover, and accent tint.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => {
            const active = settings.themePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onUpdateSettings({ themePresetId: p.id })}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-white bg-white/[0.08]'
                    : 'border-white/[0.08] bg-[#090A0F] hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-white">
                      {p.name}
                    </span>
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: p.accent }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.blurb}</p>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  By {p.creators.join(', ')} {active ? '· Active' : ''}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Playback, Automix & Audio Quality */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-xl border border-white/[0.08] bg-[#11131B] p-6">
          <h2 className="font-display text-base font-semibold text-white">
            Automix, Crossfade & DSP
          </h2>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-200">Gapless Crossfade Duration</span>
              <span className="font-mono text-xs text-slate-300 tabular-nums">
                {settings.crossfadeSeconds}s
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={settings.crossfadeSeconds}
              onChange={(e) =>
                onUpdateSettings({ crossfadeSeconds: Number(e.target.value) })
              }
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
          </div>

          <label className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Automix Beat-Matching [Beta]</p>
              <p className="text-xs text-slate-400">
                DJ-style phrase & tempo transitions between compatible queue tracks.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.automixEnabled}
              onChange={(e) => onUpdateSettings({ automixEnabled: e.target.checked })}
              className="h-4 w-4 accent-white"
            />
          </label>

          <label className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Loudness Normalization</p>
              <p className="text-xs text-slate-400">
                Keep ReplayGain levels consistent across YouTube Music and Hi-Res FLAC.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.normalizeVolume}
              onChange={(e) => onUpdateSettings({ normalizeVolume: e.target.checked })}
              className="h-4 w-4 accent-white"
            />
          </label>

          <label className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Skip Silence</p>
              <p className="text-xs text-slate-400">
                Trim trailing silence gaps when crossfade is set to 0s.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.skipSilence}
              onChange={(e) => onUpdateSettings({ skipSilence: e.target.checked })}
              className="h-4 w-4 accent-white"
            />
          </label>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
            <span className="text-sm font-medium text-white">DSP Equalizer Profile</span>
            <select
              value={settings.eqPreset}
              onChange={(e) =>
                onUpdateSettings({
                  eqPreset: e.target.value as AppSettingsState['eqPreset'],
                })
              }
              className="rounded-lg border border-white/10 bg-[#090A0F] px-3 py-1.5 text-xs text-white outline-none"
            >
              {EQ_PRESETS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Network Quality & Scrobbling Integrations */}
        <div className="space-y-5 rounded-xl border border-white/[0.08] bg-[#11131B] p-6">
          <h2 className="font-display text-base font-semibold text-white">
            Network Ceilings & Scrobbling
          </h2>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-200">Desktop / Wi-Fi Audio Ceiling</span>
            <select
              value={settings.qualityWifi}
              onChange={(e) =>
                onUpdateSettings({ qualityWifi: e.target.value as AudioQualityTier })
              }
              className="rounded-lg border border-white/10 bg-[#090A0F] px-3 py-1.5 text-xs text-white outline-none"
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
            <span className="text-sm text-slate-200">Android Cellular Audio Ceiling</span>
            <select
              value={settings.qualityCellular}
              onChange={(e) =>
                onUpdateSettings({ qualityCellular: e.target.value as AudioQualityTier })
              }
              className="rounded-lg border border-white/10 bg-[#090A0F] px-3 py-1.5 text-xs text-white outline-none"
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Prefer Dolby Atmos (E-AC-3 JOC)</p>
              <p className="text-xs text-slate-400">
                Select spatial Atmos streams when available from configured modules.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.preferAtmos}
              onChange={(e) => onUpdateSettings({ preferAtmos: e.target.checked })}
              className="h-4 w-4 accent-white"
            />
          </label>

          <label className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 cursor-pointer">
            <span className="text-sm font-medium text-white">Last.fm Scrobbling</span>
            <input
              type="checkbox"
              checked={settings.scrobbleLastFm}
              onChange={(e) => onUpdateSettings({ scrobbleLastFm: e.target.checked })}
              className="h-4 w-4 accent-white"
            />
          </label>

          <label className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 cursor-pointer">
            <span className="text-sm font-medium text-white">
              ListenBrainz Scrobbling (Android Parity)
            </span>
            <input
              type="checkbox"
              checked={settings.scrobbleListenBrainz}
              onChange={(e) => onUpdateSettings({ scrobbleListenBrainz: e.target.checked })}
              className="h-4 w-4 accent-white"
            />
          </label>

          <label className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 cursor-pointer">
            <span className="text-sm font-medium text-white">Discord Rich Presence</span>
            <input
              type="checkbox"
              checked={settings.discordRpc}
              onChange={(e) => onUpdateSettings({ discordRpc: e.target.checked })}
              className="h-4 w-4 accent-white"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
