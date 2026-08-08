/**
 * Firebase CLI executes predeploy commands through a CommonJS launcher.
 * Dynamic import keeps the ESM tracker verifier compatible with that runtime.
 */
import('./verify-quest-question-tracker.mjs').catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
