import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getProjectSources, sourceCreditsMarkdown } from './catalog';

const root = new URL('../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');

describe('source credit consistency', () => {
  it('credits the URLs actually cited by monitoring, guides, emergency, NASA and landing consumers', () => {
    const credited = new Set(getProjectSources().flatMap(source => source.links.map(link => link.url)));
    const files = [
      'src/engine/clinical-limits.json', 'src/engine/sleep.ts', 'src/engine/dose.ts', 'src/engine/zones.ts',
      'src/data/guides.ts', 'src/data/health-actions.ts', 'src/data/protocols.ts',
      'src/data/nasa/sources.json', 'src/data/nasa/hazards.json', 'src/data/nasa/reference-catalog.json',
      'src/data/nasa/medical-kit.json', 'src/data/nasa/osd575-bands.json', 'src/data/nasa/radiation-reference.json',
      'src/features/measurements/references.ts', 'src/features/emergency/News2Limits.tsx', 'src/features/dashboard/Panels.tsx',
      'src/features/twin/environments/MotionControl.tsx', 'src/landing/sections/NasaStory.tsx', 'src/landing/sections/Closing.tsx',
    ];
    const missing = files.flatMap(path => [...read(path).matchAll(/https?:\/\/[^\s"'<>`]+/g)]
      .map(match => match[0].replace(/[),.;\]]+$/, ''))
      .filter(url => !credited.has(url)).map(url => `${path}: ${url}`));
    expect(missing).toEqual([]);
  });

  it('keeps the README inventory identical to the records used by both web surfaces', () => {
    const section = read('README.md').split('<!-- project-source-credits:start -->')[1]?.split('<!-- project-source-credits:end -->')[0];
    expect(section?.trim()).toBe(sourceCreditsMarkdown());
  });

  it('ships every locally linked attribution and licence notice', () => {
    const localLinks = getProjectSources().flatMap(source => source.links).filter(link => link.url.startsWith('/'));
    for (const link of localLinks) expect(existsSync(fileURLToPath(new URL(`public${link.url}`, root))), link.url).toBe(true);
    expect(read('public/credits/react-bits-LICENSE.txt')).toContain('Commons Clause');
    expect(read('public/credits/ibm-plex-sans-LICENSE.txt')).toContain('SIL OPEN FONT LICENSE');
  });

  it('distinguishes future catalog resources from the sources actually used', () => {
    const entries = getProjectSources();
    expect(entries.filter(source => source.kind === 'Catalog only').map(source => source.id).sort())
      .toEqual(['donki', 'nasa-3d-resources', 'noaa-swpc']);
    expect(new Set(entries.map(source => source.id)).size).toBe(entries.length);
  });

  it('records an access-check result for every external URL currently offered by the inventory', () => {
    const report = JSON.parse(read('docs/source-link-validation.json')) as { results: { url: string; result: string }[] };
    const offered = [...new Set(getProjectSources().flatMap(source => source.links).filter(link => link.url.startsWith('https://')).map(link => link.url))].sort();
    expect(report.results.map(result => result.url).sort()).toEqual(offered);
    expect(report.results.every(result => ['accessible', 'restricted', 'challenge', 'incomplete-content', 'network-error'].includes(result.result))).toBe(true);
  });
});
