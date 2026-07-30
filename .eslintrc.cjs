/**
 * ESLint configuration.
 *
 * There was none before this file: `npm run lint` ran bare `eslint` with no
 * file patterns, which lints zero files and exits 0. The lint half of the
 * "Build & Lint" CI check has therefore never checked anything, which is how
 * 205 `../../../` imports and 51 components reaching straight into Firestore
 * accumulated without anyone being told.
 *
 * Phase 0 of docs/architecture/refactor-plan.md. Deliberately narrow: this
 * enables the ARCHITECTURAL rules only, all as warnings, so CI stays green
 * while the boundaries become visible. Turning on the full recommended set at
 * once would bury the signal under thousands of pre-existing style warnings.
 *
 * Each rule flips to "error" as its area is migrated. The end state is every
 * rule at "error"; see the phase table in the refactor plan.
 *
 * NOTE ON `overrides`: eslintrc REPLACES a rule's options rather than merging
 * them, so an override that sets `no-restricted-imports` silently drops every
 * pattern from the base config. All patterns are therefore composed through
 * `restrictedImports()` below instead of being redeclared per override.
 */

const OFF = 'off';
const WARN = 'warn';

/**
 * 205 imports are currently `../../../` or deeper. Deep relative paths break
 * the moment a file moves — which is most of what this refactor does — and are
 * why the `@/` alias exists but is used 14 times.
 */
const DEEP_RELATIVE = {
    group: ['../../../*', '../../../../*', '../../../../../*'],
    message:
        'Use the "@/" alias instead of ../../../ — deep relative imports break when files move. See docs/architecture/refactor-plan.md.',
};

/**
 * Inert until modules/ exists (phase 4+), then load-bearing: a module may only
 * be entered through its index.ts, never by reaching into its internals.
 */
const MODULE_INTERNALS = {
    group: ['@/modules/*/*', '**/modules/*/*'],
    message:
        'Import a module through its public API — `@/modules/jobs`, not `@/modules/jobs/components/X`.',
};

/**
 * Today `src/` builds BOTH the web app and the Chrome extension with nothing
 * stopping one from importing the other. Phase 3 splits them into apps/; until
 * then this makes any leak visible.
 */
const EXTENSION_INTERNALS = {
    group: [
        '**/content',
        '**/background',
        '**/extension-ui/**',
        '**/autofill/**',
        '@/content',
        '@/background',
        '@/extension-ui/**',
        '@/autofill/**',
    ],
    message:
        'Web app code must not import Chrome extension code — it bloats the web bundle and blocks the apps/ split. See refactor plan phase 3.',
};

/**
 * 51 files under components/ and pages/ import firebase/firestore directly,
 * mixing queries, business logic, and JSX. That is why JobMarketPage is 1,332
 * lines and JobsRecommendPage is 1,210.
 */
const FIRESTORE_IN_UI = {
    name: 'firebase/firestore',
    message:
        "Move Firestore access into a service or the module's api/ layer. Components should receive data, not fetch it.",
};

/** Compose a full no-restricted-imports config so overrides never drop rules. */
const restrictedImports = ({ patterns = [], paths = [] } = {}) => [
    WARN,
    {
        patterns: [DEEP_RELATIVE, MODULE_INTERNALS, ...patterns],
        ...(paths.length ? { paths } : {}),
    },
];

module.exports = {
    root: true,
    env: { browser: true, es2022: true, node: true },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        // No `project` on purpose — type-aware linting would make every run a
        // full typecheck, and `npm run build` already does that.
    },
    plugins: ['@typescript-eslint', 'react-hooks'],
    ignorePatterns: [
        'node_modules',
        'dist',
        'dist-*',
        'build',
        'coverage',
        '*.backup',
        '**/*.generated.ts',
        'next-app',
        'functions/lib',
        'remotion-commercial',
        'third_party',
        'public',
        'scripts',
    ],
    rules: {
        'no-restricted-imports': restrictedImports(),

        // Correctness rules worth having on day one. react-hooks was installed
        // as a dependency but never ran, since there was no config to enable it.
        'react-hooks/rules-of-hooks': WARN,
        'react-hooks/exhaustive-deps': OFF, // too noisy to land in one step

        'no-debugger': WARN,
        'no-dupe-keys': WARN,
        'no-unreachable': WARN,
        'no-unsafe-negation': WARN,
        'no-constant-condition': [WARN, { checkLoops: false }],

        // Handled by tsc; leaving these on is pure duplicate noise.
        'no-undef': OFF,
        'no-unused-vars': OFF,
        '@typescript-eslint/no-unused-vars': OFF,
    },

    overrides: [
        {
            // Web app surfaces: no extension imports, no raw Firestore.
            files: ['src/pages/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
            excludedFiles: ['src/components/extension/**'],
            rules: {
                'no-restricted-imports': restrictedImports({
                    patterns: [EXTENSION_INTERNALS],
                    paths: [FIRESTORE_IN_UI],
                }),
            },
        },
        {
            // Extension code legitimately imports extension internals; it still
            // should not reach into the web app's pages or features.
            files: ['src/extension-ui/**/*.{ts,tsx}', 'src/autofill/**/*.{ts,tsx}', 'src/content.ts', 'src/background.ts'],
            rules: {
                'no-restricted-imports': restrictedImports({
                    patterns: [{
                        group: ['**/pages/**', '@/pages/**', '**/features/**', '@/features/**'],
                        message:
                            'Extension code must not import web app pages or features — see refactor plan phase 3.',
                    }],
                }),
            },
        },
        {
            // Config, tooling, and test files play by looser rules.
            files: ['**/*.test.{ts,tsx}', '**/*.config.{ts,js,cjs,mjs}', 'vite*.config.ts'],
            rules: { 'no-restricted-imports': OFF },
        },
    ],
};
