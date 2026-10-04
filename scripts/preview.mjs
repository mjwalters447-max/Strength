import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStrengthServer } from '../server.mjs';

// Credentials are written outside the source tree and never embedded in the URL.
const accessPath = process.argv[2];
if (!accessPath) throw new Error('Provide an access-file path outside the source directory.');
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const relativePath = relative(sourceRoot, resolve(accessPath));
if (!relativePath.startsWith('..') && !isAbsolute(relativePath)) throw new Error('Access file must be outside the source directory.');
const port = Number(process.env.PORT ?? 4173);
const password = randomBytes(24).toString('base64url');
const origin = `http://127.0.0.1:${port}`;
const server = await createStrengthServer({ password, origin });
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', async () => {
  try {
    await writeFile(resolve(accessPath), JSON.stringify({ url: origin, password, note: 'Temporary local preview only. Restarting the preview rotates its password.' }, null, 2), { mode: 0o600, flag: 'wx' });
    console.log(`Strength preview ready at ${origin}. Access details saved outside the source tree.`);
  } catch { console.error('Could not create access file. Choose a new path outside the source directory.'); server.close(); process.exitCode = 1; }
});
