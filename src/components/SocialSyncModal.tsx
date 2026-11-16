import { useEffect, useState } from 'react';
import {
  X,
  RefreshCw,
  Music2,
  Video,
  CupSoda,
  CheckCircle2,
  Cloud,
  Instagram,
  Radio,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { type SocialSyncConfig } from '../firebase';

interface SocialSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSignedIn: boolean;
  config: SocialSyncConfig;
  handles: {
    instagramHandle: string;
    tiktokHandle: string;
    facebookPage: string;
    whatsappNumber: string;
  };
  saving: boolean;
  onSave: (
    nextConfig: SocialSyncConfig,
    nextHandles: {
      instagramHandle: string;
      tiktokHandle: string;
      facebookPage: string;
      whatsappNumber: string;
    }
  ) => Promise<void>;
  onOpenAuth: () => void;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
        checked ? 'bg-amber-500' : 'bg-[#232833]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0D10] shadow-md transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function SocialSyncModal({
  isOpen,
  onClose,
  isSignedIn,
  config,
  handles,
  saving,
  onSave,
  onOpenAuth,
}: SocialSyncModalProps) {
  const [draftConfig, setDraftConfig] = useState<SocialSyncConfig>(config);
  const [draftHandles, setDraftHandles] = useState(handles);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftConfig(config);
      setDraftHandles(handles);
      setSavedToast(false);
    }
  }, [isOpen, config, handles]);

  if (!isOpen) return null;

  const activePlatformCount = [
    draftConfig.instagramEnabled,
    draftConfig.tiktokEnabled,
    draftConfig.soundcloudEnabled,
    draftConfig.facebookEnabled,
    draftConfig.whatsappEnabled,
  ].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(draftConfig, draftHandles);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Social Sync Auto-Publishing Configuration"
    >
      <div className="w-full max-w-2xl rounded-xl bg-[#13161B] border border-[#232833] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232833]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-100">
                Social Sync Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Toggle auto-publishing for tracks &amp; reels across your connected social platforms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1B2028] transition-colors"
            aria-label="Close Social Sync modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Sync Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833]">
            <div className="flex items-center gap-2.5 text-xs">
              <Cloud className={`w-4 h-4 ${isSignedIn ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-slate-200 font-medium">
                {isSignedIn
                  ? 'Real-time Firestore Sync Active'
                  : 'Local Device Sync Active (Sign in to sync across devices)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-amber-400">
                {activePlatformCount}/5 platforms active
              </span>
              {!isSignedIn && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {savedToast && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Social Sync auto-publish settings saved and synced!</span>
            </div>
          )}

          {/* Master Auto-Publish Rules */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Auto-Publish Triggers
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833]">
                <div className="flex items-start gap-3">
                  <Music2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Auto-Publish New Tracks &amp; Stems
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automatically push track drops &amp; BPM metadata to enabled audio platforms when you publish.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={draftConfig.autoPublishTracks}
                  onChange={(val) => setDraftConfig((prev) => ({ ...prev, autoPublishTracks: val }))}
                  label="Toggle auto-publish new tracks"
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833]">
                <div className="flex items-start gap-3">
                  <Video className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Auto-Publish Reels &amp; Short Clips
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Cross-sync vertical Reels, TikTok sound hooks, and studio clips simultaneously across enabled channels.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={draftConfig.autoPublishReels}
                  onChange={(val) => setDraftConfig((prev) => ({ ...prev, autoPublishReels: val }))}
                  label="Toggle auto-publish reels"
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833]">
                <div className="flex items-start gap-3">
                  <CupSoda className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Attach BuymeSoda Support Tag
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automatically embed your BuymeSoda supporter call-to-action on synced posts.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={draftConfig.includeSodaCard}
                  onChange={(val) => setDraftConfig((prev) => ({ ...prev, includeSodaCard: val }))}
                  label="Toggle BuymeSoda support tag"
                />
              </div>
            </div>
          </div>

          {/* Per-Platform Auto-Sync Targets */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Connected Platform Targets
            </h3>
            <div className="space-y-2.5">
              {/* Instagram */}
              <div className="p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833] space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-100">Instagram</span>
                      <span className="text-[11px] text-slate-400 ml-2">Reels, Stories &amp; Carousel</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={draftConfig.instagramEnabled}
                    onChange={(val) => setDraftConfig((prev) => ({ ...prev, instagramEnabled: val }))}
                    label="Toggle Instagram auto-publish"
                  />
                </div>
                <input
                  type="text"
                  value={draftHandles.instagramHandle}
                  onChange={(e) =>
                    setDraftHandles((prev) => ({ ...prev, instagramHandle: e.target.value }))
                  }
                  placeholder="@your.ig.handle"
                  maxLength={80}
                  className="w-full px-3 py-1.5 rounded bg-[#13161B] border border-[#232833] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* TikTok */}
              <div className="p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833] space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Music2 className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-100">TikTok</span>
                      <span className="text-[11px] text-slate-400 ml-2">Short Reels &amp; Sound Clips</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={draftConfig.tiktokEnabled}
                    onChange={(val) => setDraftConfig((prev) => ({ ...prev, tiktokEnabled: val }))}
                    label="Toggle TikTok auto-publish"
                  />
                </div>
                <input
                  type="text"
                  value={draftHandles.tiktokHandle}
                  onChange={(e) =>
                    setDraftHandles((prev) => ({ ...prev, tiktokHandle: e.target.value }))
                  }
                  placeholder="@your.tiktok"
                  maxLength={80}
                  className="w-full px-3 py-1.5 rounded bg-[#13161B] border border-[#232833] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* SoundCloud */}
              <div className="p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833] space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-orange-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-100">SoundCloud</span>
                      <span className="text-[11px] text-slate-400 ml-2">Full Tracks, Demos &amp; Stems</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={draftConfig.soundcloudEnabled}
                    onChange={(val) => setDraftConfig((prev) => ({ ...prev, soundcloudEnabled: val }))}
                    label="Toggle SoundCloud auto-publish"
                  />
                </div>
                <input
                  type="text"
                  value={draftConfig.soundcloudHandle}
                  onChange={(e) =>
                    setDraftConfig((prev) => ({ ...prev, soundcloudHandle: e.target.value }))
                  }
                  placeholder="soundcloud.com/your-artist-profile"
                  maxLength={80}
                  className="w-full px-3 py-1.5 rounded bg-[#13161B] border border-[#232833] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Facebook */}
              <div className="p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833] space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Share2 className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-100">Facebook</span>
                      <span className="text-[11px] text-slate-400 ml-2">Creator Video &amp; Live Stage</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={draftConfig.facebookEnabled}
                    onChange={(val) => setDraftConfig((prev) => ({ ...prev, facebookEnabled: val }))}
                    label="Toggle Facebook auto-publish"
                  />
                </div>
                <input
                  type="text"
                  value={draftHandles.facebookPage}
                  onChange={(e) =>
                    setDraftHandles((prev) => ({ ...prev, facebookPage: e.target.value }))
                  }
                  placeholder="facebook.com/yourpage"
                  maxLength={120}
                  className="w-full px-3 py-1.5 rounded bg-[#13161B] border border-[#232833] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* WhatsApp */}
              <div className="p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833] space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-100">WhatsApp</span>
                      <span className="text-[11px] text-slate-400 ml-2">VIP Fan &amp; DJ Promo Broadcast</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={draftConfig.whatsappEnabled}
                    onChange={(val) => setDraftConfig((prev) => ({ ...prev, whatsappEnabled: val }))}
                    label="Toggle WhatsApp auto-publish"
                  />
                </div>
                <input
                  type="text"
                  value={draftHandles.whatsappNumber}
                  onChange={(e) =>
                    setDraftHandles((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                  }
                  placeholder="+15550109988"
                  maxLength={40}
                  className="w-full px-3 py-1.5 rounded bg-[#13161B] border border-[#232833] text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#232833]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#1B2028] hover:bg-[#252B36] text-slate-300 text-xs font-medium border border-[#2A313E] transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'Syncing...' : 'Save Social Sync Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
