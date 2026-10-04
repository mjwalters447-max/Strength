import { readFile } from 'node:fs/promises';
import { validateSnapshot } from '../lib/model.mjs';
if (!process.argv[2]) { console.error('Usage: node scripts/validate.mjs /absolute/path/to/research.json'); process.exitCode = 2; }
else {
  try {
    const source = await readFile(process.argv[2], 'utf8');
    if (Buffer.byteLength(source) > 2000000) throw new Error('Input exceeds 2 MB.');
    const data = validateSnapshot(JSON.parse(source));
    console.log(`Validated ${data.instruments.length} instruments; mode=${data.mode}; source time=${data.publishedAt}. This validates structure, not source accuracy or permission.`);
  } catch (error) { console.error('Validation failed: ' + error.message); process.exitCode = 1; }
}
