/**
 * Firebase CLI executes predeploy commands through a CommonJS launcher.
 * Dynamic import keeps the ESM question synchronizer compatible with that runtime.
 */
import('./seed-interview-guides.mjs')
  .then(({ main }) => main())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
