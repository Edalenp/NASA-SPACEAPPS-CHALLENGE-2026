import { Check, Download, Monitor, Smartphone, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { installPwa, usePwa, type OfflineState } from './state';
import './pwa.css';

const states: Record<OfflineState, [string, string]> = {
  preparing: ['Preparing offline access…', 'Keep this page open and connected until setup is complete.'],
  ready: ['Ready offline', 'The lab and its resources are saved on this device. External source links need a connection.'],
  error: ['Offline setup incomplete', 'Reconnect and reload to finish saving the app on this device.'],
  unavailable: ['Offline access unavailable', 'Open the published HTTPS app in a browser that supports offline storage.'],
  development: ['Offline setup in the published app', 'The development server does not prepare offline access. Use the published or production-preview app.'],
};

function InstallHelp({ variant, close }: { variant: 'landing' | 'console'; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const node = dialog.current;
    const opener = document.activeElement;
    node?.showModal();
    return () => { node?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={dialog} className={`pwa-guide is-${variant}`} aria-labelledby={title} onCancel={close}>
    <header><span className="pwa-guide-kicker">VITRUVIO / on this device</span><button type="button" onClick={close} aria-label="Close installation guide"><X size={18} aria-hidden="true" /></button></header>
    <h2 id={title}>Install VITRUVIO</h2>
    <p className="pwa-guide-intro">Keep the lab within reach, directly from your device’s home screen or app launcher.</p>
    <div className="pwa-guide-methods">
      <section><Monitor size={20} aria-hidden="true" /><div><h3>Chrome or Edge</h3><p>Open the browser menu or the install icon in the address bar. Choose <strong>Install app</strong> and follow the browser’s instructions.</p></div></section>
      <section><Smartphone size={20} aria-hidden="true" /><div><h3>iPhone or iPad</h3><p>In Safari, open the Share menu and choose <strong>Add to Home Screen</strong>.</p></div></section>
    </div>
    <footer><p>Installation is optional. If your browser does not offer it, keep using the lab in your browser. For offline use, wait for <strong>Ready offline</strong> before disconnecting.</p><button type="button" className="pwa-guide-done" onClick={close}>Got it</button></footer>
  </dialog>, document.body);
}

export function PwaAccess({ variant = 'console' }: { variant?: 'landing' | 'console' }) {
  const [help, setHelp] = useState(false);
  const { offline, installed, prompt, installing, installError } = usePwa();
  const [label, note] = states[offline];
  return <div className="pwa-access">
    <div className="pwa-actions">
      {installed ? <span className="pwa-installed"><Check size={14} aria-hidden="true" />Installed</span> : prompt ?
        <button className="pwa-install" type="button" disabled={installing} onClick={() => void installPwa()}><Download size={14} aria-hidden="true" />{installing ? 'Opening installer…' : 'Install VITRUVIO'}</button> :
        <button type="button" className="pwa-install" aria-haspopup="dialog" aria-expanded={help} onClick={() => setHelp(true)}>How to install</button>}
      <span className={`pwa-state is-${offline}`} role="status"><i aria-hidden="true" />{label}</span>
    </div>
    <p className="pwa-note">{note}</p>
    {installError && <p className="pwa-note" role="alert">The installer could not open. Use your browser’s Install app or Add to Home Screen option.</p>}
    {help && <InstallHelp variant={variant} close={() => setHelp(false)} />}
  </div>;
}
