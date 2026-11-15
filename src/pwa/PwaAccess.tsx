import { Check, Download } from 'lucide-react';
import { installPwa, usePwa, type OfflineState } from './state';
import './pwa.css';

const states: Record<OfflineState, [string, string]> = {
  preparing: ['Preparing offline access…', 'Keep this page open and connected until setup is complete.'],
  ready: ['Ready offline', 'The lab and its resources are saved on this device. External source links need a connection.'],
  error: ['Offline setup incomplete', 'Reconnect and reload to finish saving the app on this device.'],
  unavailable: ['Offline access unavailable', 'Open the published HTTPS app in a browser that supports offline storage.'],
  development: ['Offline setup in the published app', 'The development server does not prepare offline access. Use the published or production-preview app.'],
};

export function PwaAccess() {
  const { offline, installed, prompt, installing, installError } = usePwa();
  const [label, note] = states[offline];
  return <div className="pwa-access">
    <div className="pwa-actions">
      {installed ? <span className="pwa-installed"><Check size={14} aria-hidden="true" />Installed</span> : prompt ?
        <button className="pwa-install" type="button" disabled={installing} onClick={() => void installPwa()}><Download size={14} aria-hidden="true" />{installing ? 'Opening installer…' : 'Install VITRUVIO'}</button> :
        <details className="pwa-help"><summary>How to install</summary><div>
          <p>In Chrome or Edge, look for <b>Install app</b> in the address bar or browser menu. On iPhone or iPad, open Safari’s Share menu and choose <b>Add to Home Screen</b>.</p>
          <p>If your browser does not offer installation, you can still use the lab in this browser. Installation is optional for offline use.</p>
        </div></details>}
      <span className={`pwa-state is-${offline}`} role="status"><i aria-hidden="true" />{label}</span>
    </div>
    <p className="pwa-note">{note}</p>
    {installError && <p className="pwa-note" role="alert">The installer could not open. Use your browser’s Install app or Add to Home Screen option.</p>}
  </div>;
}
