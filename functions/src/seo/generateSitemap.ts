import { onRequest } from "firebase-functions/v2/https";
import { algoliasearch } from "algoliasearch";
import { communityHitToSitemapUrl, SITEMAP_STATIC_ROUTES } from "./searchIndexPolicy";

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

// Guest-browsable company interview quest pages (/quest/{slug}) — regenerated
// by scripts/generate-sitemap.mjs whenever interview guides change.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { QUEST_ROUTE_SLUGS } from "./questRoutes.generated";

const QUEST_ROUTES = QUEST_ROUTE_SLUGS.map((slug) => ({
    loc: `https://careervivid.app/quest/${slug}`,
    changefreq: "weekly",
    priority: "0.6",
}));

const ALL_STATIC_ROUTES = [...SITEMAP_STATIC_ROUTES, ...QUEST_ROUTES];

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
                            const url = communityHitToSitemapUrl(hit);
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

                console.log(`[generateSitemap] ${seenUrls.size} public articles + ${ALL_STATIC_ROUTES.length} static URLs.`);
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
