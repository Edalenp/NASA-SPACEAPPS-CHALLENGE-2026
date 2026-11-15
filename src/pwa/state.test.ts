import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.stubEnv('DEV', false); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function browser(registration: object | Promise<never>) {
  const surface = Object.assign(new EventTarget(), { isSecureContext: true });
  vi.stubGlobal('window', surface);
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false }));
  vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockImplementation(() => Promise.resolve(registration)) } });
  return surface;
}

describe('offline readiness and installation', () => {
  it('waits for activation instead of advertising an incomplete cache as offline ready', async () => {
    const worker = Object.assign(new EventTarget(), { state: 'installing' });
    browser(Object.assign(new EventTarget(), { installing: worker, active: null }));
    const { initializePwa, usePwa } = await import('./state');
    initializePwa();
    await Promise.resolve();
    expect(usePwa.getState().offline).toBe('preparing');
    worker.state = 'installed'; worker.dispatchEvent(new Event('statechange'));
    expect(usePwa.getState().offline).toBe('preparing');
    worker.state = 'activated'; worker.dispatchEvent(new Event('statechange'));
    expect(usePwa.getState().offline).toBe('ready');
  });
  it('recognises a previously activated worker on return visits', async () => {
    browser(Object.assign(new EventTarget(), { installing: null, active: { state: 'activated' } }));
    const { initializePwa, usePwa } = await import('./state');
    initializePwa(); await Promise.resolve();
    expect(usePwa.getState().offline).toBe('ready');
  });
  it('reports registration failure without falsely declaring offline availability', async () => {
    browser({});
    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockRejectedValue(new Error('Storage unavailable')) } });
    const { initializePwa, usePwa } = await import('./state');
    initializePwa(); await Promise.resolve(); await Promise.resolve();
    expect(usePwa.getState().offline).toBe('error');
  });
  it('consumes a dismissed install prompt once and can accept a later browser offer', async () => {
    const surface = browser(Object.assign(new EventTarget(), { installing: null, active: null }));
    const { initializePwa, installPwa, usePwa } = await import('./state');
    initializePwa();
    const prompt = vi.fn().mockResolvedValue({ outcome: 'dismissed' });
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt });
    surface.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await installPwa(); await installPwa();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(usePwa.getState()).toMatchObject({ prompt: null, installed: false, installing: false });
    surface.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt }));
    expect(usePwa.getState().prompt).not.toBeNull();
    surface.dispatchEvent(new Event('appinstalled'));
    expect(usePwa.getState()).toMatchObject({ installed: true, prompt: null });
  });
});
