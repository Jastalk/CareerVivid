import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // Must mirror the aliases in vite.config.ts. Without them any test that
    // reaches `@shared/credits` — which most of the app does, via
    // src/config/creditCosts.ts — fails to collect with "Failed to resolve
    // import", and reports as a failed *file* with zero tests run. That was
    // silently hiding 20 test files.
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared': path.resolve(__dirname, './shared'),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        globals: true,
        /*
         * State where the tests are, rather than letting vitest walk the repo.
         *
         * With no `include`, the default glob swept up three kinds of file that
         * this runner cannot execute, each surfacing as a failed suite with zero
         * tests — noise that looked like ten broken test files:
         *   - functions/lib/**  is tsc's outDir. Its *.test.js are compiled
         *     duplicates of functions/src; the CommonJS output of a vitest test
         *     cannot `require` vitest, so every one of them threw.
         *   - third_party/**   is vendored sample code from the OpenAI cookbook
         *     that ships its own `node:test` suites. Not ours to run or fix.
         *   - scripts/**       likewise uses `node:test`.
         *
         * functions/src IS included: those tests are real vitest suites that
         * were never running.
         */
        include: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'functions/src/**/*.{test,spec}.ts',
        ],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.claude/**',
            'functions/lib/**',
            'third_party/**',
        ],
    },
});
