/**
 * CommonJS entry point for the deploy-time question sync.
 *
 * `firebase deploy` runs its predeploy hook with whatever `node` resolves to on
 * PATH. The standalone firebase-tools binary is built with `pkg` and puts its
 * own bundled Node 20 there; pkg loads the entry file through `require()`, and
 * Node 20 cannot `require()` an ES module. Pointing the hook straight at the
 * .mjs therefore died with ERR_REQUIRE_ESM before a single line of the sync ran.
 *
 * This file is CommonJS, so every interpreter can load it. From there:
 *
 *   - a normal node simply imports the real module;
 *   - a pkg-bundled node hands off to a real node it finds on disk, because it
 *     cannot run ES modules at all.
 *
 * The .mjs itself spawns its children with `process.execPath` rather than a
 * bare `node`, so the working interpreter chosen here carries all the way down.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const ESM = path.join(__dirname, 'sync-questions-to-firebase.mjs');
const args = process.argv.slice(2);

/** Set by the pkg runtime, and by nothing else. */
const insidePkg = Boolean(process.pkg);

if (!insidePkg) {
    import(pathToFileURL(ESM).href).catch(error => {
        console.error(error);
        process.exit(1);
    });
} else {
    const node = findRealNode();
    if (!node) {
        console.error(
            '\n❌  The deploy is running under the standalone firebase-tools binary, whose\n' +
            '    bundled Node cannot run ES modules, and no separate Node install was found.\n' +
            '    Install Node, or deploy with the npm build of the CLI:\n' +
            '        npm i -g firebase-tools && firebase deploy --only hosting\n',
        );
        process.exit(1);
    }
    const result = spawnSync(node, [ESM, ...args], { stdio: 'inherit' });
    process.exit(result.status ?? 1);
}

/**
 * Looks for a real Node on disk.
 *
 * PATH is deliberately not consulted: the shim that caused this whole problem
 * is the first `node` on it.
 */
function findRealNode() {
    const candidates = [
        process.env.NVM_BIN && path.join(process.env.NVM_BIN, 'node'),
        '/opt/homebrew/bin/node',
        '/usr/local/bin/node',
        '/usr/bin/node',
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (!fs.existsSync(candidate)) continue;
        // Confirm it actually runs, and that it is not another pkg build.
        const probe = spawnSync(candidate, ['-p', 'process.pkg ? "pkg" : process.version'], {
            encoding: 'utf8',
        });
        if (probe.status === 0 && probe.stdout.trim().startsWith('v')) return candidate;
    }
    return null;
}
