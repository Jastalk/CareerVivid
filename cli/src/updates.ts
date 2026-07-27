/**
 * CareerVivid CLI — Update Notifier
 *
 * This module checks the npm registry for newer versions of the CLI
 * and prints a non-intrusive message if an update is available.
 */

import updateNotifier from "update-notifier";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function checkForUpdates() {
    // Read package.json to get current name and version
    const pkgPath = path.resolve(__dirname, "../package.json");
    if (!fs.existsSync(pkgPath)) return;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    const notifier = updateNotifier({
        pkg,
        updateCheckInterval: 1000 * 60 * 60 * 24, // Check once a day
        shouldNotifyInNpmScript: true,
    });

    if (notifier.update) {
        notifier.notify({
            message: `📦 Update available: {currentVersion} → {latestVersion}\nRun {bold.cyan 'npm install -g careervivid@latest'} or {bold.cyan 'cv update'} to upgrade.`,
            defer: false, // Show immediately
            isGlobal: true,
        });
    }
}
