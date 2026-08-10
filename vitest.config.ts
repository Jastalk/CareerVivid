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
        exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
    },
});
