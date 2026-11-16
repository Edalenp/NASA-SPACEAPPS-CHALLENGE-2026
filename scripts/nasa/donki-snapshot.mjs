// Refreshes src/data/nasa/donki-snapshot.json: the NASA DONKI SEP list for the 60 days before
// today, shipped with the build so the console answers before its first fetch, offline, or when
// api.nasa.gov's hourly limit is reached. The replayed May 2024 storm is kept as it is.
//
//   node scripts/nasa/donki-snapshot.mjs            uses DEMO_KEY
//   NASA_API_KEY=... node scripts/nasa/donki-snapshot.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/data/nasa/donki-snapshot.json');
const key = process.env.NASA_API_KEY || 'DEMO_KEY';
const end = new Date();
const start = new Date(end.getTime() - 59 * 24 * 60 * 60 * 1000);
const day = (d) => d.toISOString().slice(0, 10);
const url = `https://api.nasa.gov/DONKI/SEP?startDate=${day(start)}&endDate=${day(end)}&api_key=${key}`;
const res = await fetch(url);
if (!res.ok) {
  console.error(`DONKI answered HTTP ${res.status}. The snapshot was not changed.`);
  process.exit(1);
}
const text = await res.text();
const records = text.trim() ? JSON.parse(text) : [];
const keep = (x) => ({
  sepID: x.sepID,
  eventTime: x.eventTime,
  instruments: (x.instruments ?? []).map((i) => ({ displayName: i.displayName })),
  link: x.link ?? null,
  linkedEvents: (x.linkedEvents ?? []).map((l) => ({ activityID: l.activityID })),
});
const snap = JSON.parse(readFileSync(file, 'utf8'));
snap.fetchedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
snap.window = { startDate: day(start), endDate: day(end) };
snap.sep = records.map(keep);
writeFileSync(file, JSON.stringify(snap, null, 2) + '\n');
console.log(`DONKI snapshot: ${snap.sep.length} SEP events, ${snap.window.startDate} to ${snap.window.endDate}`);
