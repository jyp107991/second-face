// App shell: install as a standalone app, fullscreen + landscape on phones, offline start via the service worker.

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());

/** True when running as the installed app (no browser chrome). */
export function isStandalone(): boolean {
  return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** The browser has offered to install the app and it is not installed yet. */
export function canInstall(): boolean { return !!deferred && !isStandalone(); }

export function onInstallChange(f: () => void): () => void { listeners.add(f); return () => listeners.delete(f); }

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const p = deferred;
  deferred = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  changed();
  return outcome === 'accepted';
}

const touch = () => matchMedia('(pointer: coarse)').matches;

async function goFullscreenLandscape(): Promise<void> {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch { /* not allowed here (e.g. iOS Safari) */ }
  try {
    await (screen.orientation as ScreenOrientation & { lock?(o: string): Promise<void> }).lock?.('landscape');
  } catch { /* only allowed in fullscreen or the installed app */ }
}

export function initApp(): void {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPrompt; changed(); });
  window.addEventListener('appinstalled', () => { deferred = null; changed(); });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {});
    });
  }

  // Portrait guard: on a phone held upright, ask for landscape instead of squeezing the game.
  const rotate = document.createElement('div');
  rotate.className = 'rotate-hint';
  rotate.innerHTML = '<div class="rotate-phone"></div><div>Turn your phone sideways</div><div class="rotate-sub">Tap to go fullscreen</div>';
  document.body.appendChild(rotate);

  // On phones, every tap outside fullscreen re-enters it and locks landscape (browsers only allow this from a tap).
  const onTap = () => { if (touch() && !document.fullscreenElement) void goFullscreenLandscape(); };
  window.addEventListener('pointerup', onTap, { capture: true, passive: true });
  if (isStandalone()) void goFullscreenLandscape();
}
