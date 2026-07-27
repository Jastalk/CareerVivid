#!/usr/bin/env node
/**
 * Provision the Agent Builder datastores that back grounded generation.
 *
 * Creates, if absent:
 *   careervivid-job-catalog        — job specs, used to ground ATS matching
 *   careervivid-interview-rubrics  — coding & system-design rubrics
 *
 * These are billable Google Cloud resources, so the script is a no-op until it
 * is run with --apply. Without that flag it prints exactly what it would do and
 * exits, which is also how you check whether the stores already exist.
 *
 *   node scripts/setup-enterprise-datastores.mjs              # dry run
 *   node scripts/setup-enterprise-datastores.mjs --apply      # create
 *
 * Auth comes from Application Default Credentials:
 *   gcloud auth application-default login
 *
 * The caller needs roles/discoveryengine.admin to create datastores. The runtime
 * service account needs only roles/discoveryengine.user — do not reuse an admin
 * identity for the Cloud Functions themselves.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// The SDK is a functions/ dependency, not a root one, so resolve it from there
// rather than duplicating a heavyweight GCP client in the web app's tree.
const here = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(path.join(here, '..', 'functions', 'package.json'));

let DataStoreServiceClient;
try {
    ({ DataStoreServiceClient } = requireFromFunctions('@google-cloud/discoveryengine'));
} catch {
    console.error('@google-cloud/discoveryengine is not installed. Run: (cd functions && npm install)');
    process.exit(1);
}

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'jastalk-firebase';
// Agent Builder multi-regions are global | us | eu — never a compute region.
const LOCATION = process.env.ENTERPRISE_LOCATION || 'global';
const APPLY = process.argv.includes('--apply');

const DATASTORES = [
    {
        id: process.env.ENTERPRISE_DATASTORE_JOB_CATALOG || 'careervivid-job-catalog',
        displayName: 'CareerVivid Job Catalog',
        envVar: 'ENTERPRISE_DATASTORE_JOB_CATALOG',
        purpose: 'Job specifications used to ground ATS matching and role feedback.',
    },
    {
        id: process.env.ENTERPRISE_DATASTORE_RUBRICS || 'careervivid-interview-rubrics',
        displayName: 'CareerVivid Interview Rubrics',
        envVar: 'ENTERPRISE_DATASTORE_RUBRICS',
        purpose: 'Coding and system-design scoring rubrics used to ground interview feedback.',
    },
];

const apiEndpoint = LOCATION === 'global'
    ? 'discoveryengine.googleapis.com'
    : `${LOCATION}-discoveryengine.googleapis.com`;

const client = new DataStoreServiceClient({ apiEndpoint });
const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection`;

async function exists(datastoreId) {
    try {
        await client.getDataStore({ name: `${parent}/dataStores/${datastoreId}` });
        return true;
    } catch (error) {
        if (error.code === 5 /* NOT_FOUND */) return false;
        throw error;
    }
}

async function main() {
    console.log(`project=${PROJECT_ID}  location=${LOCATION}  endpoint=${apiEndpoint}`);
    console.log(APPLY ? 'mode=APPLY (will create missing datastores)\n' : 'mode=DRY RUN (pass --apply to create)\n');

    const resolved = [];

    for (const store of DATASTORES) {
        const already = await exists(store.id);
        if (already) {
            console.log(`✓ ${store.id} — already exists`);
            resolved.push(store);
            continue;
        }

        if (!APPLY) {
            console.log(`+ ${store.id} — would create ("${store.displayName}")`);
            console.log(`    ${store.purpose}`);
            resolved.push(store);
            continue;
        }

        console.log(`+ ${store.id} — creating…`);
        const [operation] = await client.createDataStore({
            parent,
            dataStoreId: store.id,
            dataStore: {
                displayName: store.displayName,
                industryVertical: 'GENERIC',
                // SEARCH powers retrieval; CHAT is what answerQuery needs for
                // grounded, session-aware answers. Both must be present.
                solutionTypes: ['SOLUTION_TYPE_SEARCH', 'SOLUTION_TYPE_CHAT'],
                contentConfig: 'CONTENT_REQUIRED',
                naturalLanguageQueryUnderstandingConfig: { mode: 'ENABLED' },
            },
        });
        await operation.promise();
        console.log(`  created ${store.id}`);
        resolved.push(store);
    }

    console.log('\nAdd these to functions runtime config (firebase functions:secrets or .env):\n');
    for (const store of resolved) console.log(`  ${store.envVar}=${store.id}`);
    console.log(`  ENTERPRISE_LOCATION=${LOCATION}`);

    if (!APPLY) {
        console.log('\nNothing was created — this was a dry run.');
    } else {
        console.log('\nDatastores are empty until documents are imported.');
        console.log('Import with: gcloud alpha discovery-engine documents import …  (or the Console UI)');
    }
}

main().catch((error) => {
    console.error('\nFailed:', error.message);
    if (error.code === 7) {
        console.error('PERMISSION_DENIED — the caller needs roles/discoveryengine.admin on', PROJECT_ID);
    }
    process.exit(1);
});
