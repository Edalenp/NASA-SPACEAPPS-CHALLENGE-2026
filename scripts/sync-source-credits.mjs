import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const mode = process.argv[2];
if (!['--check', '--write'].includes(mode) || process.argv.length !== 3) {
  throw new Error('Usage: node scripts/sync-source-credits.mjs --check|--write');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const path = new URL('../README.md', import.meta.url);
const readme = await readFile(path, 'utf8');
const start = '<!-- project-source-credits:start -->';
const end = '<!-- project-source-credits:end -->';
if (readme.split(start).length !== 2 || readme.split(end).length !== 2) {
  throw new Error('README must contain exactly one pair of project-source-credits markers');
}

// Transform the actual TypeScript citation consumers without a browser or HTTP listener.
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false } });
try {
  const { sourceCreditsMarkdown } = await server.ssrLoadModule('/src/features/sources/catalog.ts');
  const before = readme.slice(0, readme.indexOf(start) + start.length);
  const after = readme.slice(readme.indexOf(end));
  const updated = `${before}\n\n${sourceCreditsMarkdown()}\n\n${after}`;
  if (mode === '--write') {
    await writeFile(path, updated);
    console.log('README source inventory synchronized with the landing and laboratory.');
  } else if (updated !== readme) {
    throw new Error('README source inventory is stale. Run npm run credits:sync.');
  } else {
    console.log('README, landing and laboratory source inventories match.');
  }
} finally {
  await server.close();
}
