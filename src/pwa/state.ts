import { create } from 'zustand';

interface InstallPrompt extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export type OfflineState = 'preparing' | 'ready' | 'error' | 'unavailable' | 'development';
interface PwaState { offline: OfflineState; installed: boolean; prompt: InstallPrompt | null; installing: boolean; installError: boolean }
export const usePwa = create<PwaState>(() => ({ offline: 'preparing', installed: false, prompt: null, installing: false, installError: false }));
let started = false;

/** Listen before the lazy landing/lab mounts so an early install event is never lost. */
export function initializePwa() {
  if (started) return;
  started = true;
  const mode = matchMedia('(display-mode: standalone)');
  const standalone = () => usePwa.setState({ installed: mode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone) });
  standalone();
  mode.addEventListener('change', standalone);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    usePwa.setState({ prompt: event as InstallPrompt, installError: false });
  });
  window.addEventListener('appinstalled', () => usePwa.setState({ installed: true, prompt: null }));
  if (import.meta.env.DEV) { usePwa.setState({ offline: 'development' }); return; }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { usePwa.setState({ offline: 'unavailable' }); return; }
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).then(registration => {
    const watch = () => {
      const worker = registration.installing;
      if (!worker) return;
      usePwa.setState({ offline: 'preparing' });
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') usePwa.setState({ offline: 'ready' });
        if (worker.state === 'redundant') usePwa.setState({ offline: 'error' });
      });
    };
    watch();
    registration.addEventListener('updatefound', watch);
    // Activation follows successful precaching. Later visits already have an active worker.
    if (registration.active?.state === 'activated' && !registration.installing) usePwa.setState({ offline: 'ready' });
  }).catch(() => usePwa.setState({ offline: 'error' }));
}

export async function installPwa() {
  const event = usePwa.getState().prompt;
  if (!event || usePwa.getState().installing) return;
  usePwa.setState({ installing: true, installError: false });
  try { await event.prompt(); }
  catch { usePwa.setState({ installError: true }); }
  finally { usePwa.setState({ installing: false, prompt: null }); }
}
