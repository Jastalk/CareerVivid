import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEARCH_PAGES } from "../../functions/src/seo/searchIndexPolicy";

/*
 * An indexed URL has to be reachable without an account.
 *
 * This has now gone wrong twice. First /job-market: a ProtectedRoute that sat
 * in the sitemap, so every searcher who clicked Google's sitelink got a login
 * form. Then /edit/new: the same mistake at a new URL, while the test written
 * to catch the first one passed, because that test is a hand-maintained list of
 * gated paths and nobody adds a path to a deny-list they do not know about.
 *
 * So this one is derived from the router instead. It reads the routing chain in
 * src/App.tsx, works out which branch would handle each crawlable path, and
 * fails if that branch wraps its page in ProtectedRoute. A new indexed page
 * behind a login wall fails here without anyone having to remember anything.
 *
 * What it deliberately does NOT do is fail on a path with no matching branch:
 * quest routes, blog posts and community pages are matched by prefixes and
 * generated slugs, and asserting completeness here would make this test a
 * maintenance burden of exactly the kind it replaces.
 */

const APP_SOURCE = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");

interface RouteBranch {
    /** Paths this branch matches exactly. */
    exact: string[];
    /** Path prefixes this branch matches. */
    prefixes: string[];
    /** True when the branch renders its page inside <ProtectedRoute>, always. */
    gated: boolean;
}

const PATH_LITERAL = /path(?:\.toLowerCase\(\))?\s*===\s*'([^']+)'|path\.startsWith\('([^']+)'\)/g;

/** The `if` / `else if` chain in AppContent, in source order. */
const parseRouteBranches = (source: string): RouteBranch[] => {
    const chunks = source.split(/\n\s*(?:else if|if)\s*\(/).slice(1);

    return chunks.map((chunk) => {
        const condition = chunk.split("{")[0];
        const body = chunk.slice(condition.length);
        const exact: string[] = [];
        const prefixes: string[] = [];

        for (const match of condition.matchAll(PATH_LITERAL)) {
            if (match[1]) exact.push(match[1]);
            if (match[2]) prefixes.push(match[2]);
        }

        // A branch that picks between a protected and an unprotected render —
        // /interview-studio serves the catalog to guests and gates only the
        // deep link with a jobId — is not a login wall on the crawlable URL, so
        // the ternary is what separates "gated" from "gated for some ids".
        const wrapsSometimes = /\?\s*\(/.test(body);

        return { exact, prefixes, gated: /<ProtectedRoute/.test(body) && !wrapsSometimes };
    });
};

const BRANCHES = parseRouteBranches(APP_SOURCE);

const branchFor = (routePath: string): RouteBranch | undefined =>
    BRANCHES.find(
        (branch) =>
            branch.exact.includes(routePath) ||
            branch.prefixes.some((prefix) => routePath === prefix || routePath.startsWith(prefix)),
    );

describe("nothing in the sitemap is behind a login wall", () => {
    const crawlable = SEARCH_PAGES.filter((page) => page.includeInSitemap && page.indexable !== false);

    it("finds the routing chain, so the rest of this file means something", () => {
        expect(BRANCHES.length).toBeGreaterThan(50);
        expect(BRANCHES.some((branch) => branch.gated)).toBe(true);
        // The known-gated page the previous version of this bug lived on.
        expect(branchFor("/job-market")?.gated).toBe(true);
    });

    it.each(crawlable.map((page) => page.path))("%s is served without ProtectedRoute", (routePath) => {
        const branch = branchFor(routePath);
        // No branch means a prefix or generated route this parser does not model;
        // see the note at the top of the file.
        if (!branch) return;
        expect(branch.gated, `${routePath} is in the sitemap but its route is wrapped in ProtectedRoute`).toBe(false);
    });

    /*
     * The specific one: /edit/new is the destination of the /resume-builder and
     * /resume-templates 301s and carries priority 1.0, while every other /edit/*
     * path is a saved document and stays protected. It only stays public as long
     * as its branch comes FIRST.
     */
    it("routes /edit/new publicly and keeps every other /edit/ path protected", () => {
        expect(branchFor("/edit/new")?.gated).toBe(false);
        expect(branchFor("/edit/guest")?.gated).toBe(false);
        expect(branchFor("/edit/abc123")?.gated).toBe(true);
    });
});
