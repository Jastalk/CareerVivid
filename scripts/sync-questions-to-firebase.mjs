/**
 * Push ALL interview questions to Firebase (Firestore).
 *
 * This is the deploy-time sync: it is wired as a Firebase Hosting `predeploy`
 * hook (see firebase.json), so `firebase deploy --only hosting` updates every
 * company's questions in Firestore before the site is uploaded. The questions
 * are intentionally NOT bundled into the public site — the app reads them from
 * Firestore at runtime — so this step is what makes them available to website
 * users after a deploy.
 *
 * Behaviour:
 *   - Requires firebase-service-account.json in the repo root (gitignored).
 *     If it is absent, this SKIPS with a clear warning and exits 0, so a build
 *     or deploy never fails just because credentials aren't present on the
 *     machine (e.g. CI without secrets).
 *   - Fingerprints the question sources and compares that against what was last
 *     pushed. Unchanged sources skip the sync entirely — a full run deletes and
 *     rewrites ~24k documents, which is slow and burns write quota for nothing
 *     on the many deploys that only touch site code.
 *   - Otherwise runs a full, idempotent sync of all guides (--replace, so old
 *     questions are cleared first — no duplicates) plus the category banks.
 *
 * Usage:  node scripts/sync-questions-to-firebase.mjs [--dry-run] [--force]
 *
 * Deploy hooks should call the .cjs wrapper next to this file rather than this
 * module directly — see the note there.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SERVICE_ACCOUNT = path.join(ROOT, 'firebase-service-account.json');
const SEED = path.join(__dirname, 'seed-interview-guides.mjs');
const VERIFY_TRACKER = path.join(__dirname, 'verify-quest-question-tracker.mjs');

const GUIDES_DIR = path.join(ROOT, 'data', 'interview-guides');
const BANKS = path.join(ROOT, 'data', 'quest-category-banks.json');
/**
 * The scripts that shape the documents count as inputs too: changing how a
 * guide is mapped changes what lands in Firestore even when no question text
 * moved, and skipping on that would quietly ship stale documents.
 */
const SHAPERS = [SEED, path.join(__dirname, 'mobile-interview-question-catalog.mjs')];

/** Where the last pushed fingerprint lives. */
const STATE_COLLECTION = 'siteMeta';
const STATE_DOC = 'questionSync';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

// The workbook/CSV tracker is the human-auditable backup of the Web source.
// Refuse to sync if it was not regenerated after a question edit, so neither
// the site nor native app can silently drift from the reviewed question set.
// `process.execPath`, never the string 'node': whatever interpreter is running
// this file is by definition a working one, whereas a bare `node` is resolved
// through PATH — and the standalone firebase-tools binary puts a shim there
// that points at its own bundled runtime.
const verification = spawnSync(process.execPath, [VERIFY_TRACKER], { stdio: 'inherit', cwd: ROOT });
if (verification.status !== 0) {
  console.error('\n❌  Question tracker verification failed. Rebuild the tracker before syncing questions.');
  process.exit(verification.status ?? 1);
}

if (!fs.existsSync(SERVICE_ACCOUNT)) {
  console.warn(
    '\n⚠️  firebase-service-account.json not found — skipping question sync to Firestore.\n' +
    '    (Add the service account key to push questions. Deploy will continue.)\n'
  );
  process.exit(0);
}

/**
 * A content hash of everything that determines what the sync would write.
 *
 * Computes a global digest as well as per-company digests so deploys can
 * incrementally sync ONLY the specific guides that changed.
 */
function fingerprintSources() {
  const hash = crypto.createHash('sha256');
  const companyHashes = {};
  const guideFiles = fs.readdirSync(GUIDES_DIR)
    .filter(name => name.endsWith('.json'))
    .sort();

  for (const name of guideFiles) {
    const slug = path.basename(name, '.json');
    const content = fs.readFileSync(path.join(GUIDES_DIR, name));
    const h = crypto.createHash('sha256').update(content).digest('hex');
    companyHashes[slug] = h;
    hash.update(slug);
    hash.update('\0');
    hash.update(h);
    hash.update('\0');
  }

  const banksContent = fs.existsSync(BANKS) ? fs.readFileSync(BANKS) : '';
  const banksHash = crypto.createHash('sha256').update(banksContent).digest('hex');
  hash.update('banks');
  hash.update('\0');
  hash.update(banksHash);
  hash.update('\0');

  const shapersHash = crypto.createHash('sha256');
  for (const s of SHAPERS) {
    if (fs.existsSync(s)) shapersHash.update(fs.readFileSync(s));
  }
  const shapersDigest = shapersHash.digest('hex');
  hash.update('shapers');
  hash.update('\0');
  hash.update(shapersDigest);

  return {
    digest: hash.digest('hex'),
    companyHashes,
    banksHash,
    shapersHash: shapersDigest,
    count: guideFiles.length + 1 + SHAPERS.length,
  };
}

/** Opens Firestore with the same credentials the seed uses. */
async function openFirestore() {
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT, 'utf-8'));
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

const { digest, companyHashes, banksHash, shapersHash, count } = fingerprintSources();
const short = digest.slice(0, 12);

let db = null;
let previous = null;
try {
  db = await openFirestore();
  const snapshot = await db.collection(STATE_COLLECTION).doc(STATE_DOC).get();
  previous = snapshot.exists ? snapshot.data() : null;
} catch (error) {
  // Never let the bookkeeping stop a deploy — fall through and sync.
  console.warn(`\n⚠️  Could not read the last sync fingerprint (${error.message}). Syncing anyway.`);
}

if (previous?.fingerprint === digest && !force) {
  const when = previous.syncedAt?.toDate?.()?.toISOString?.() ?? 'an earlier deploy';
  console.log(
    `\n⏭️   Questions unchanged since ${when} — skipping the Firestore sync.\n` +
    `    ${count} source files, fingerprint ${short}. Use --force to sync anyway.\n`
  );
  process.exit(0);
}

// Determine if we can do an incremental sync (only changed companies)
const prevCompanies = previous?.companyHashes || {};
const prevBanksHash = previous?.banksHash;
const prevShapersHash = previous?.shapersHash;

const shapersOrBanksChanged = force || !previous || prevBanksHash !== banksHash || prevShapersHash !== shapersHash;

let changedCompanies = [];
if (!shapersOrBanksChanged) {
  for (const [slug, h] of Object.entries(companyHashes)) {
    if (prevCompanies[slug] !== h) {
      changedCompanies.push(slug);
    }
  }
}

if (!shapersOrBanksChanged && changedCompanies.length > 0 && changedCompanies.length < 50) {
  console.log(
    `\n⚡ Incremental Sync: ${changedCompanies.length} company guide(s) changed (${changedCompanies.slice(0, 5).join(', ')}${changedCompanies.length > 5 ? '...' : ''})...\n`
  );

  let success = true;
  for (const slug of changedCompanies) {
    const args = [SEED, '--company', slug, '--replace'];
    if (dryRun) args.push('--dry-run');
    const res = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: ROOT });
    if (res.status !== 0) {
      success = false;
      break;
    }
  }

  if (success) {
    if (!dryRun && db) {
      try {
        const { FieldValue } = await import('firebase-admin/firestore');
        await db.collection(STATE_COLLECTION).doc(STATE_DOC).set({
          fingerprint: digest,
          companyHashes,
          banksHash,
          shapersHash,
          sourceFiles: count,
          syncedAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.warn(`\n⚠️  Sync succeeded but fingerprint update failed (${error.message}).`);
      }
    }
    console.log('\n✅  Incremental question sync complete.');
    process.exit(0);
  }
}

const args = [SEED, '--replace', '--banks'];
if (dryRun) args.push('--dry-run');

console.log(
  `\n🔄  Syncing all interview questions → Firestore (interviewGuides + questCategoryBanks)…\n` +
  `    ${previous?.fingerprint ? `changed: ${previous.fingerprint.slice(0, 12)} → ${short}` : `first recorded sync: ${short}`}\n`
);
const res = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: ROOT });

if (res.status !== 0) {
  console.error('\n❌  Question sync failed. Aborting so questions and site do not drift out of sync.');
  process.exit(res.status ?? 1);
}

// Recorded only after the sync actually succeeded, so a failed run is retried
// rather than skipped next time.
if (!dryRun && db) {
  try {
    const { FieldValue } = await import('firebase-admin/firestore');
    await db.collection(STATE_COLLECTION).doc(STATE_DOC).set({
      fingerprint: digest,
      companyHashes,
      banksHash,
      shapersHash,
      sourceFiles: count,
      syncedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn(`\n⚠️  Sync succeeded but the fingerprint could not be recorded (${error.message}).`);
    console.warn('    The next deploy will simply sync again.');
  }
}

console.log('\n✅  Questions synced to Firestore.');
