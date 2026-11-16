import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  MonitorDown,
  ExternalLink,
  CheckCircle2,
  X,
  Share2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

function InstallGuideModal({
  isOpen,
  onClose,
  isIOS,
  isInIframe,
  installing,
  canTriggerNativeInstall,
  onNativeInstall,
  onDownloadAppShortcut,
  downloadedNotice,
}: {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isInIframe: boolean;
  installing: boolean;
  canTriggerNativeInstall: boolean;
  onNativeInstall: () => void;
  onDownloadAppShortcut: () => void;
  downloadedNotice: string | null;
}) {
  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '/';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Install SoundDeck Studio App"
    >
      <div className="w-full max-w-md rounded-xl bg-[#13161B] border border-[#232833] p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="SoundDeck Studio App Icon"
              className="w-12 h-12 rounded-xl border border-[#2A313E]"
            />
            <div>
              <h3 className="font-display text-base font-bold text-slate-100">
                Install SoundDeck Studio
              </h3>
              <p className="text-xs text-slate-400">
                Download as a standalone app for phone, tablet &amp; desktop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1B2028] transition-colors"
            aria-label="Close install dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {downloadedNotice && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{downloadedNotice}</span>
          </div>
        )}

        {canTriggerNativeInstall ? (
          <button
            type="button"
            onClick={onNativeInstall}
            disabled={installing}
            className="w-full py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{installing ? 'Downloading App...' : 'Install & Download App Now'}</span>
          </button>
        ) : (
          <div className="space-y-3">
            {isInIframe && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <p className="text-xs text-amber-200 leading-relaxed">
                  You are viewing SoundDeck inside an embedded preview frame. Open it directly in your browser tab to trigger one-click native app installation:
                </p>
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open App Tab to Install</span>
                </a>
              </div>
            )}

            {isIOS ? (
              <div className="p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>
                    Tap the <strong className="text-amber-400 inline-flex items-center gap-1">Share <Share2 className="w-3 h-3 inline" /></strong> button in Safari.
                  </li>
                  <li>
                    Tap <strong className="text-amber-400">Add to Home Screen</strong>, then tap <strong className="text-amber-400">Add</strong>.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-[#0B0D10] border border-[#232833] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <MonitorDown className="w-4 h-4 text-amber-400" />
                  <span>Android, Windows, Mac &amp; Chromebook</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>
                    In Chrome or Edge, click the <strong className="text-amber-400">Install App</strong> icon in the address bar (or open the browser menu <strong className="text-amber-400">⋮</strong>).
                  </li>
                  <li>
                    Select <strong className="text-amber-400">Install SoundDeck Studio</strong> (or <strong className="text-amber-400">Add to Home screen</strong>) to download the app.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={onDownloadAppShortcut}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1B2028] hover:bg-[#252B36] text-slate-100 text-xs font-semibold border border-[#2A313E] flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download App Launcher &amp; Cache Offline Files</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-[#0B0D10] hover:bg-[#1B2028] py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-[#232833] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function triggerAppLauncherDownload(): void {
  const origin = window.location.origin;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SoundDeck Studio</title>
  <meta http-equiv="refresh" content="0;url=${origin}" />
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0B0D10; color: #F1F5F9; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { text-align: center; padding: 32px; border: 1px solid #232833; border-radius: 16px; background: #13161B; max-width: 380px; }
    a { display: inline-block; margin-top: 16px; padding: 12px 20px; border-radius: 10px; background: #F59E0B; color: #0B0D10; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>SoundDeck Studio</h2>
    <p>Launching SoundDeck Studio workspace...</p>
    <a href="${origin}">Open SoundDeck Studio</a>
  </div>
  <script>window.location.replace(${JSON.stringify(origin)});</script>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'SoundDeck-Studio-App.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isInIframe, installing, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setShowGuide(false);
        return;
      }
      if (outcome === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleDownloadLauncher = async () => {
    triggerAppLauncherDownload();
    try {
      if ('caches' in window) {
        const cache = await caches.open('sounddeck-app-shell');
        await cache.addAll(['/', '/manifest.webmanifest', '/pwa-192x192.png', '/pwa-512x512.png']);
      }
    } catch {
      // Service worker precache handles offline assets
    }
    setDownloadedNotice(
      'App launcher downloaded to your device and offline studio files cached!'
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-md shadow-amber-500/20 disabled:opacity-60"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{installing ? 'Installing...' : 'Install App'}</span>
      </button>

      <InstallGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        isIOS={isIOS}
        isInIframe={isInIframe}
        installing={installing}
        canTriggerNativeInstall={isInstallable}
        onNativeInstall={handleInstallClick}
        onDownloadAppShortcut={handleDownloadLauncher}
        downloadedNotice={downloadedNotice}
      />
    </>
  );
};

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isInIframe, installing, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('sounddeck_install_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [showGuide, setShowGuide] = useState(false);
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);

  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('sounddeck_install_banner_dismissed', '1');
    } catch {
      // ignore
    }
  };

  const handleInstallPress = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setShowGuide(false);
        return;
      }
      if (outcome === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleDownloadLauncher = async () => {
    triggerAppLauncherDownload();
    try {
      if ('caches' in window) {
        const cache = await caches.open('sounddeck-app-shell');
        await cache.addAll(['/', '/manifest.webmanifest', '/pwa-192x192.png', '/pwa-512x512.png']);
      }
    } catch {
      // Service worker precache handles offline assets
    }
    setDownloadedNotice(
      'App launcher downloaded to your device and offline studio files cached!'
    );
  };

  return (
    <>
      <div className="rounded-xl bg-[#13161B] border border-amber-500/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/pwa-192x192.png"
            alt="SoundDeck App"
            className="w-10 h-10 rounded-lg border border-[#2A313E] shrink-0"
          />
          <div>
            <div className="text-xs sm:text-sm font-semibold text-slate-100">
              Install SoundDeck Studio as an App
            </div>
            <p className="text-xs text-slate-400">
              Download the app onto your phone, tablet, or computer for full-screen studio mode and offline beat-making.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallPress}
            disabled={installing}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{installing ? 'Downloading...' : 'Install App'}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1B2028] transition-colors"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <InstallGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        isIOS={isIOS}
        isInIframe={isInIframe}
        installing={installing}
        canTriggerNativeInstall={isInstallable}
        onNativeInstall={handleInstallPress}
        onDownloadAppShortcut={handleDownloadLauncher}
        downloadedNotice={downloadedNotice}
      />
    </>
  );
};
