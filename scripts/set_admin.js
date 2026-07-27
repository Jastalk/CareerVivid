#!/usr/bin/env node
/**
 * Grant the `admin: true` custom claim used by firestore.rules and storage.rules.
 *
 *   node scripts/set_admin.js                        # the two built-in admin accounts
 *   node scripts/set_admin.js someone@example.com    # a specific account
 *   node scripts/set_admin.js --revoke old@admin.com # take the claim away
 *
 * Run this BEFORE deploying the rules. isAdmin() no longer trusts a hardcoded
 * email list, so an account without the claim loses admin access the moment the
 * new rules go live.
 *
 * Credentials, in order: GOOGLE_APPLICATION_CREDENTIALS, then
 * firebase-service-account.json in the repo root, then Application Default
 * Credentials (gcloud auth application-default login).
 */

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

// firebase-admin is a functions/ dependency, not a root one.
const requireFromFunctions = createRequire(join(repoRoot, 'functions', 'package.json'));

let admin;
try {
    admin = requireFromFunctions('firebase-admin');
} catch {
    console.error('firebase-admin is not installed. Run: (cd functions && npm install)');
    process.exit(1);
}

const DEFAULT_EMAILS = ['evan@careervivid.app', 'evan@jastalk.com'];

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const emails = args.filter((arg) => !arg.startsWith('--'));
const targets = emails.length > 0 ? emails : DEFAULT_EMAILS;

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || join(repoRoot, 'firebase-service-account.json');

if (existsSync(keyPath)) {
    admin.initializeApp({ credential: admin.credential.cert(keyPath) });
    console.log(`auth: service account key at ${keyPath}`);
} else {
    // No key on disk — fall back to ADC so this works on a machine that has
    // only gcloud set up.
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('auth: application default credentials');
}

async function apply(email) {
    const user = await admin.auth().getUserByEmail(email);

    // Merge rather than replace: these accounts may carry unrelated claims that
    // other rules depend on, and setCustomUserClaims overwrites wholesale.
    const claims = { ...(user.customClaims || {}) };
    if (revoke) {
        delete claims.admin;
    } else {
        claims.admin = true;
    }

    await admin.auth().setCustomUserClaims(user.uid, claims);
    console.log(`${revoke ? 'revoked' : 'granted'}  ${email}  (uid ${user.uid})`);
}

async function main() {
    console.log(`${revoke ? 'Revoking' : 'Granting'} admin claim for: ${targets.join(', ')}\n`);

    let failed = 0;
    for (const email of targets) {
        try {
            await apply(email);
        } catch (error) {
            failed += 1;
            console.error(`failed   ${email}: ${error.message}`);
        }
    }

    console.log('\nClaims land in the ID token, not immediately in an open session.');
    console.log('Sign out and back in (or force a token refresh) before testing.');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
    console.error('Failed:', error.message);
    process.exit(1);
});
