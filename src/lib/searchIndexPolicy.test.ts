import { describe, expect, it } from "vitest";
import {
    communityHitToSitemapUrl,
    getSearchPage,
    SITEMAP_STATIC_ROUTES,
} from "../../functions/src/seo/searchIndexPolicy";

describe("search indexing policy", () => {
    it("keeps the sitemap canonical and excludes unfinished locale aliases", () => {
        const urls = SITEMAP_STATIC_ROUTES.map((route) => route.loc);

        expect(new Set(urls).size).toBe(urls.length);
        expect(urls).toContain("https://careervivid.app/pricing");
        expect(urls).toContain("https://careervivid.app/interview-studio");
        expect(urls).toContain("https://careervivid.app/demo");
        expect(urls.some((url) => /careervivid\.app\/(?:en|es|fr|de|zh|ja|ko)(?:\/|$)/.test(url))).toBe(false);
    });

    /*
     * /job-market used to be on this list, which was the bug rather than the
     * check: it is a ProtectedRoute, so it was indexed and sent every searcher
     * to a login wall. The public job list at /jobs carries that intent now.
     */
    it("provides unique crawlable content for reported public pages", () => {
        for (const path of [
            "/pricing",
            "/interview-studio",
            "/blog",
            "/jobs",
            "/resume-builder",
            "/contact",
            "/product",
            "/community/guidelines",
            "/partners/agency",
            "/demo",
        ]) {
            const page = getSearchPage(path);
            expect(page, path).toBeDefined();
            expect(page?.title, path).not.toBe("CareerVivid | Courses, Interview Prep & Tailored Resumes");
            expect(page?.summary.length, path).toBeGreaterThan(30);
        }
    });

    it("marks account entry pages as noindex", () => {
        expect(getSearchPage("/signin")?.indexable).toBe(false);
        expect(getSearchPage("/signup")?.indexable).toBe(false);
    });

    it("only adds stable public articles from the community index", () => {
        expect(communityHitToSitemapUrl({ objectID: "post-1", type: "article" }))
            .toBe("https://careervivid.app/community/post/post-1");
        expect(communityHitToSitemapUrl({ objectID: "post-2" }))
            .toBe("https://careervivid.app/community/post/post-2");
        expect(communityHitToSitemapUrl({ objectID: "board-1", type: "whiteboard" })).toBeNull();
        expect(communityHitToSitemapUrl({ objectID: "draft-1", type: "article", status: "draft" })).toBeNull();
        expect(communityHitToSitemapUrl({ objectID: "" })).toBeNull();
    });
});
