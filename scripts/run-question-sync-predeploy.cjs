/**
 * Firebase CLI's packaged CommonJS launcher cannot require an ESM predeploy
 * script directly. Load the existing synchronizer with dynamic import instead.
 */
import('./sync-questions-to-firebase.mjs').catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
