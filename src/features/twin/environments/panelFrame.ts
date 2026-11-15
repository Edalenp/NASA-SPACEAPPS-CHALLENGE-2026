const TEAL = 'rgba(159, 243, 230, 0.9)';

/** Shared look: a title with a rule, faint scanlines; a dark ground for opaque screens. */
export function panelFrame(g: CanvasRenderingContext2D, w: number, h: number, title: string, holo: boolean) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = holo ? 'rgba(40, 120, 110, 0.10)' : '#06110f';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(159, 243, 230, 0.5)';
  g.lineWidth = 2;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = TEAL;
  g.font = '500 22px "IBM Plex Mono", monospace';
  g.fillText(title, 26, 44);
  g.fillRect(26, 56, w - 52, 2);
  for (let y = 70; y < h - 10; y += 4) { g.fillStyle = 'rgba(0, 0, 0, 0.1)'; g.fillRect(8, y, w - 16, 1); }
}
