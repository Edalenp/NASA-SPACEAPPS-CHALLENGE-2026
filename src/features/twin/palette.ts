/** Scene colours. Mirrors src/styles/tokens.css; Three.js needs literal values. */
export interface ScenePalette {
  scene: string; floor: string; wall: string; panel: string; frame: string; seam: string; hatch: string;
  ink: string; future: string;
  muscle: string; bone: string; vessel: string; organ: string; skin: string;
  /** Context tissue around an inspected system: bright frosted glass, never a status. */
  ghost: string;
  select: string; watch: string; alert: string; hover: string;
  /** Gel stops of a tinted organ, [light edge, deep centre], matching the status auras. */
  gel: Record<'select' | 'watch' | 'alert', [string, string]>;
  shadow: string;
}

export const day: ScenePalette = {
  scene: '#d8dcd2', floor: '#c8cfc0', wall: '#d4d7cf', panel: '#e1e3db', frame: '#a6b09c', seam: '#bdc5b5', hatch: '#bfc8b5',
  ink: '#3a4035', future: '#a9b09f',
  muscle: '#959a8f', bone: '#cfd0c4', vessel: '#a3a798', organ: '#aeb5a9', skin: '#b8beb0',
  ghost: '#f4f6f0',
  select: '#4cb04a', watch: '#f28a2e', alert: '#ee3b55', hover: '#bcb48f',
  gel: { select: ['#cdf08c', '#17702f'], watch: ['#ffd96e', '#c4401b'], alert: ['#ffa4b7', '#9e0f2e'] },
  shadow: '#34402b',
};

export const night: ScenePalette = {
  scene: '#34382f', floor: '#32382c', wall: '#353a31', panel: '#3d4338', frame: '#58614e', seam: '#4a5341', hatch: '#30372b',
  ink: '#d8dccb', future: '#5e6852',
  muscle: '#959a8f', bone: '#cfd0c4', vessel: '#979b8d', organ: '#a8afa3', skin: '#a9afa1',
  ghost: '#e2e8db',
  select: '#5cc25a', watch: '#ff9d4d', alert: '#ff6b80', hover: '#c9bf95',
  gel: { select: ['#d6f59a', '#1f8236'], watch: ['#ffe082', '#d24f22'], alert: ['#ffb3c3', '#b01535'] },
  shadow: '#11140e',
};
