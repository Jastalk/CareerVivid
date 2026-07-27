/**
 * postinstall guard.
 *
 * package.json used to run `node ./dist/postinstall.js` directly. That is fine
 * for an installed package, where dist ships in the tarball, but it made
 * `npm install` fail outright in a git checkout — dist does not exist until
 * something builds it, so the very first install a contributor runs died with
 * MODULE_NOT_FOUND.
 *
 * The welcome banner is cosmetic, so a missing build is a skip, not an error.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, '..', 'dist', 'postinstall.js');

if (!existsSync(entry)) {
    // Source checkout with no build yet. Nothing to greet with.
    process.exit(0);
}

try {
    await import(pathToFileURL(entry).href);
} catch (error) {
    // A cosmetic banner must never fail an install.
    process.stderr.write(`careervivid: skipped post-install notice (${error.message})\n`);
}
