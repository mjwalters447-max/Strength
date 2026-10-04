import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMarket } from '../lib/import-market.mjs';
import { packSnapshot } from '../lib/snapshot-codec.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || process.argv.length !== 4) throw new Error('Usage: node scripts/prepare-market.mjs <private-input.json> <new-private-output.json>');
  for (const path of [input, output]) {
    const candidate = resolve(path);
    if (candidate.toLowerCase() === root.toLowerCase() || candidate.toLowerCase().startsWith(root.toLowerCase() + sep)) throw new Error('Keep input and output outside the repository.');
  }
  const raw = await readFile(input);
  if (raw.length > 2000000) throw new Error('Input too large.');
  const snapshot = importMarket(JSON.parse(raw.toString('utf8')));
  const packed = packSnapshot(snapshot);
  await writeFile(output, JSON.stringify({ snapshot, env: { STRENGTH_SNAPSHOT_B64: packed, STRENGTH_REQUIRE_SOURCE: '1' } }), { flag: 'wx', mode: 0o600 });
  console.log(`Prepared ${snapshot.instruments.length} market series; ${packed.length} encoded characters. Private output created; nothing was uploaded.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
