import { onRequest } from "firebase-functions/v2/https";
import { algoliasearch } from "algoliasearch";

const BASE_URL = "https://careervivid.app";
const INDEX_NAME = "community_posts";

const xmlEsc = (s: string) =>
    (s || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/'/g, "&apos;");

const toIsoDate = (ts: number | string | undefined): string => {
    if (!ts) return new Date().toISOString().split("T")[0];
    const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
    return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
};

const hitToUrl = (hit: any): string | null => {
    const id: string = hit.objectID;
    const type: string = hit.type || "article";
    switch (type) {
        case "article": return `${BASE_URL}/community/post/${id}`;
        case "resume": return hit.authorId ? `${BASE_URL}/shared/${hit.authorId}/${id}` : null;
        case "portfolio": return hit.authorId ? `${BASE_URL}/portfolio/${hit.authorId}` : null;
        case "whiteboard": return `${BASE_URL}/whiteboard/${id}`;
        default: return `${BASE_URL}/community/post/${id}`;
    }
};

const STATIC_ROUTES = [
    { loc: BASE_URL, changefreq: "daily", priority: "1.0" },
    { loc: `${BASE_URL}/learning`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/learning/coding-interview-patterns`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/learning/system-design-interview`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/learning/ai-agent-curriculum`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/interview-studio`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/community`, changefreq: "hourly", priority: "0.9" },
    { loc: `${BASE_URL}/pricing`, changefreq: "weekly", priority: "0.8" },
    { loc: `${BASE_URL}/blog`, changefreq: "daily", priority: "0.8" },
    { loc: `${BASE_URL}/job-market`, changefreq: "daily", priority: "0.7" },
    { loc: `${BASE_URL}/contact`, changefreq: "monthly", priority: "0.6" },
    { loc: `${BASE_URL}/product`, changefreq: "monthly", priority: "0.6" },
    { loc: `${BASE_URL}/community/guidelines`, changefreq: "monthly", priority: "0.5" },
];

// Guest-browsable company interview quest pages (/quest/{slug}) — regenerated
// by scripts/generate-sitemap.mjs whenever interview guides change.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { QUEST_ROUTE_SLUGS } from "./questRoutes.generated";

const QUEST_ROUTES = QUEST_ROUTE_SLUGS.map((slug) => ({
    loc: `${BASE_URL}/quest/${slug}`,
    changefreq: "weekly",
    priority: "0.6",
}));

// Add localized versions for each static route (excluding root which handles 'en' by default)
const SUPPORTED_LANGUAGE_CODES = ["es", "fr", "de", "zh", "ja", "ko"];

const LOCALIZED_STATIC_ROUTES = SUPPORTED_LANGUAGE_CODES.flatMap(code => {
    return STATIC_ROUTES.map(route => {
        const path = route.loc.replace(BASE_URL, "");
        // If it's the home page, just /lang
        const loc = path === "" ? `${BASE_URL}/${code}` : `${BASE_URL}/${code}${path}`;
        return {
            ...route,
            loc,
            priority: (parseFloat(route.priority) * 0.9).toFixed(1) // slightly lower priority for localized versions
        };
    });
});

const ALL_STATIC_ROUTES = [...STATIC_ROUTES, ...LOCALIZED_STATIC_ROUTES, ...QUEST_ROUTES];

export const generateSitemap = onRequest(
    {
        region: "us-west1",
        memory: "512MiB",
        timeoutSeconds: 60,
    },
    async (_req, res) => {
        try {
            const appId = process.env.ALGOLIA_APP_ID;
            // Use the write/admin key for browseObjects — requires 'browse' ACL
            // which the search-only key doesn't have.
            const writeKey = process.env.ALGOLIA_WRITE_KEY;

            const urlEntries: string[] = [];

            // 1. Static routes
            for (const route of ALL_STATIC_ROUTES) {
                urlEntries.push(`
  <url>
    <loc>${xmlEsc(route.loc)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
            }

            // 2. Dynamic routes via browseObjects (requires write/admin key)
            if (appId && writeKey) {
                const client = algoliasearch(appId, writeKey);
                const seenUrls = new Set<string>();

                await client.browseObjects({
                    indexName: INDEX_NAME,
                    aggregator: (response: any) => {
                        const hits: any[] = response.hits || [];
                        for (const hit of hits) {
                            const url = hitToUrl(hit);
                            if (!url || seenUrls.has(url)) continue;
                            seenUrls.add(url);

                            const lastmod = toIsoDate(hit.updatedAt || hit.createdAt);
                            urlEntries.push(`
  <url>
    <loc>${xmlEsc(url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
                        }
                    },
                });

                console.log(`[generateSitemap] ${seenUrls.size} dynamic + ${STATIC_ROUTES.length} static URLs.`);
            } else {
                console.warn("[generateSitemap] Missing ALGOLIA_WRITE_KEY — serving static-only sitemap.");
            }

            // 3. Build XML
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("")}
</urlset>`;

            res.set("Content-Type", "application/xml; charset=utf-8");
            res.set("Cache-Control", "public, max-age=21600, s-maxage=43200");
            res.status(200).send(xml);

        } catch (err) {
            console.error("[generateSitemap] Error:", err);
            res.status(500).send("Failed to generate sitemap.");
        }
    }
);
