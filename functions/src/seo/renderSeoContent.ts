import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { isbot } from "isbot";
import { algoliasearch } from "algoliasearch";
import { getLearningSeoPage, isLearningPageFree } from "./learningSeo";
import { getSearchPage, SEARCH_ORIGIN, SearchPageDefinition } from "./searchIndexPolicy";
import { MAX_PUBLIC_JOB_PAGES, readPublicJobs } from "../publicJobFeed";

const db = admin.firestore();

// ── index.html, fetched — deliberately NOT inlined at build time ──────────────
// Hosting rewrites /learning/** here, so every human pageview of a course page
// runs this function, and for a human it only serves index.html back.
//
// A previous version baked dist/index.html into the bundle at build time to
// avoid this fetch. That was wrong, and it broke production: index.html
// references Vite's CONTENT-HASHED asset URLs, so the inlined copy is only
// valid for the exact hosting build it was captured from. Deploy hosting again
// without redeploying this function and it keeps serving /assets/index-<old
// hash>.js, which no longer exists — Hosting's `** -> /index.html` rewrite then
// answers that request with HTML, and the browser reports:
//
//   Failed to load module script: Expected a JavaScript-or-Wasm module script
//   but the server responded with a MIME type of "text/html"
//
// The page renders blank on direct navigation while in-app navigation still
// works, because client-side routing never refetches the shell. Inlining
// silently couples this function to one hosting build; fetching cannot go
// stale. Correctness beats saving one request.
//
// The fetch is abort-guarded so a slow CDN can never hang the function to its
// timeout, and cached per instance so only the first request on a cold
// container pays for it. Instance recycling is what picks up a new deploy.
const INDEX_FETCH_TIMEOUT_MS = 5_000;

let cachedIndexHtml: string | null = null;

async function getIndexHtml(): Promise<string> {
    if (cachedIndexHtml) return cachedIndexHtml;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INDEX_FETCH_TIMEOUT_MS);
    try {
        const response = await fetch("https://careervivid.app/index.html", {
            headers: { "X-Internal-Fetch": "1" },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Failed to fetch index.html: ${response.status}`);
        cachedIndexHtml = await response.text();
        return cachedIndexHtml;
    } finally {
        clearTimeout(timer);
    }
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const DEFAULT_OG_IMAGE = "https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Fog_image.png?alt=media";
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Flogo_light_mode.png?alt=media";
const BASE_URL = SEARCH_ORIGIN;

const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const stripMarkdown = (md: string): string => (md || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[#_*`[\]>~]/g, "")
    .replace(/\n+/g, " ")
    .trim();

const buildHtml = ({
    title, description, canonicalUrl, imageUrl, structuredData, bodyContent, siteSuffix, indexable = true
}: {
    title: string; description: string; canonicalUrl: string; imageUrl: string;
    structuredData: object | object[]; bodyContent: string; siteSuffix: string; indexable?: boolean;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}${siteSuffix ? ` | ${esc(siteSuffix)}` : ""}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="${indexable ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" : "noindex, follow"}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="icon" href="${LOGO_URL}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="CareerVivid" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>

</head>
<body>
  <!-- Semantic HTML served only to crawlers; human requests receive index.html. -->
  <div id="root">
    <main style="max-width:780px;margin:0 auto;padding:48px 24px;font-family:sans-serif;color:#111;">
      ${bodyContent}
    </main>
  </div>
</body>
</html>`;

// ── Route handlers ────────────────────────────────────────────────────────────

/** Sections and FAQs as real, readable HTML — see SearchPageSection. */
function renderSections(page: SearchPageDefinition): string {
    return (page.sections || []).map((section) => {
        const bullets = (section.bullets || []).length
            ? `<ul style="padding-left:20px;line-height:1.8;margin:12px 0 0;">${
                (section.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("")
            }</ul>`
            : "";
        const body = section.body
            ? `<p style="line-height:1.7;color:#333;margin:0;">${esc(section.body)}</p>`
            : "";
        return `<section style="margin-top:36px;">
        <h2 style="font-size:1.4rem;font-weight:700;margin:0 0 10px;">${esc(section.heading)}</h2>
        ${body}${bullets}
      </section>`;
    }).join("");
}

function renderFaqs(page: SearchPageDefinition): string {
    if (!page.faqs?.length) return "";
    const items = page.faqs.map((faq) => `<div style="margin-top:20px;">
        <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 6px;">${esc(faq.question)}</h3>
        <p style="line-height:1.7;color:#333;margin:0;">${esc(faq.answer)}</p>
      </div>`).join("");
    return `<section style="margin-top:40px;">
        <h2 style="font-size:1.4rem;font-weight:700;margin:0;">Frequently asked questions</h2>
        ${items}
      </section>`;
}

function handleStaticPage(page: SearchPageDefinition): string {
    const canonicalUrl = `${BASE_URL}${page.path === "/" ? "/" : page.path}`;
    const indexable = page.indexable !== false;
    const links = (page.links || []).map(({ href, label }) =>
        `<li><a href="${BASE_URL}${href}" style="color:#4f46e5;font-weight:700;">${esc(label)}</a></li>`
    ).join("");

    const webPage = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        name: page.title,
        description: page.description,
        url: canonicalUrl,
        isPartOf: { "@type": "WebSite", name: "CareerVivid", url: `${BASE_URL}/` },
    };

    /*
     * FAQPage markup is only emitted alongside the visible answers rendered
     * below. Google requires the answer be on the page for the rich result to
     * be eligible, and schema describing content that is not there is exactly
     * what earns a structured-data manual action.
     */
    const structuredData = page.faqs?.length
        ? [
            webPage,
            {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "@id": `${canonicalUrl}#faq`,
                mainEntity: page.faqs.map((faq) => ({
                    "@type": "Question",
                    name: faq.question,
                    acceptedAnswer: { "@type": "Answer", text: faq.answer },
                })),
            },
        ]
        : webPage;

    const bodyContent = `
        <nav aria-label="Breadcrumb" style="font-size:0.9rem;margin-bottom:20px;"><a href="${BASE_URL}/" style="color:#4f46e5;">CareerVivid</a></nav>
        <h1 style="font-size:2.2rem;font-weight:800;line-height:1.2;margin:0 0 16px;">${esc(page.heading)}</h1>
        <p style="font-size:1.1rem;color:#555;line-height:1.7;margin:0;">${esc(page.summary)}</p>
        ${renderSections(page)}
        ${renderFaqs(page)}
        ${links ? `<ul style="padding-left:20px;line-height:1.9;margin-top:28px;">${links}</ul>` : ""}
        <p style="margin-top:32px;"><a href="${canonicalUrl}" style="color:#4f46e5;font-weight:700;">Open ${esc(page.heading)} on CareerVivid</a></p>`;

    return buildHtml({
        title: page.title,
        description: page.description,
        canonicalUrl,
        imageUrl: DEFAULT_OG_IMAGE,
        structuredData,
        bodyContent,
        siteSuffix: "",
        indexable,
    });
}

async function handleArticle(postId: string): Promise<string> {
    const snap = await db.collection("community_posts").doc(postId).get();
    if (!snap.exists) throw new Error("not_found");
    const post = snap.data() as any;

    const title = post.title || "CareerVivid Article";
    const rawContent = stripMarkdown(post.content || "");
    const description = rawContent.substring(0, 160) || "Read this article on CareerVivid Community.";
    const imageUrl = post.coverImage || DEFAULT_OG_IMAGE;
    const canonicalUrl = `${BASE_URL}/community/post/${postId}`;
    const publishDate = post.createdAt?.toDate?.().toISOString() ?? new Date().toISOString();

    // Extract FAQs
    const faqs: any[] = [];
    const faqMatch = (post.content || "").match(/(?:^|\n)(?:#+)\s*Frequently Asked Questions\s*\n([\s\S]*)$/i);
    if (faqMatch) {
        const qnaRegex = /(?:\*\*Q:?|### Q:?|Q:?)\s*(.*?)\n(?:\*\*A:?|A:?)\s*(.*?)(?=\n(?:\*\*Q|### Q|Q)|$)/gs;
        let m;
        while ((m = qnaRegex.exec(faqMatch[1])) !== null) {
            if (m[1] && m[2]) faqs.push({ "@type": "Question", "name": m[1].trim(), "acceptedAnswer": { "@type": "Answer", "text": m[2].trim() } });
        }
    }

    const structuredData: any = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": `${canonicalUrl}#article`,
                headline: title.substring(0, 110),
                description,
                image: [imageUrl],
                datePublished: publishDate,
                author: { "@type": "Person", name: post.authorName || "CareerVivid Community" },
                publisher: { "@type": "Organization", name: "CareerVivid", logo: { "@type": "ImageObject", url: LOGO_URL } },
            }
        ]
    };
    if (faqs.length > 0) {
        structuredData["@graph"].push({ "@type": "FAQPage", "@id": `${canonicalUrl}#faq`, mainEntity: faqs });
    }

    const tags = (post.tags || []).map((t: string) => `<span style="margin-right:8px;color:#6366f1;">#${esc(t)}</span>`).join("");
    const bodyContent = `
        <h1 style="font-size:2.25rem;font-weight:800;line-height:1.2;margin-bottom:16px;">${esc(title)}</h1>
        ${tags ? `<p style="margin-bottom:16px;">${tags}</p>` : ""}
        <p style="font-size:1.1rem;color:#555;margin-bottom:24px;">${esc(description)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="font-size:0.95rem;color:#777;line-height:1.7;">${esc(rawContent.substring(0, 2000))}</p>
    `;

    return buildHtml({ title, description, canonicalUrl, imageUrl, structuredData, bodyContent, siteSuffix: "CareerVivid Community" });
}

async function handleResume(uid: string, resumeId: string): Promise<string> {
    const snap = await db.collection("users").doc(uid).collection("resumes").doc(resumeId).get();
    if (!snap.exists) throw new Error("not_found");
    const resume = snap.data() as any;
    const pd = resume.personalDetails || {};

    const fullName = `${pd.firstName || ""} ${pd.lastName || ""}`.trim() || "CareerVivid Resume";
    const jobTitle = pd.jobTitle || "";
    const title = jobTitle ? `${fullName} – ${jobTitle}` : fullName;
    const summary = stripMarkdown(resume.professionalSummary || "");
    const description = summary.substring(0, 160) || `View ${fullName}'s professional resume on CareerVivid.`;
    const imageUrl = pd.photo || DEFAULT_OG_IMAGE;
    const canonicalUrl = `${BASE_URL}/shared/${uid}/${resumeId}`;

    const skills = (resume.skills || []).map((s: any) => esc(s.name)).join(", ");
    const jobs = (resume.employmentHistory || []).slice(0, 3).map((j: any) =>
        `<li><strong>${esc(j.jobTitle)}</strong> at ${esc(j.employer)} (${esc(j.startDate)} – ${esc(j.endDate || "Present")})</li>`
    ).join("");

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: `${fullName}'s Resume`,
        url: canonicalUrl,
        mainEntity: {
            "@type": "Person",
            name: fullName,
            jobTitle,
            description: summary.substring(0, 200),
        }
    };

    const bodyContent = `
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:8px;">${esc(fullName)}</h1>
        ${jobTitle ? `<p style="font-size:1.1rem;color:#6366f1;font-weight:600;margin-bottom:16px;">${esc(jobTitle)}</p>` : ""}
        ${description ? `<p style="font-size:0.95rem;color:#555;margin-bottom:24px;">${esc(description)}</p>` : ""}
        ${skills ? `<p><strong>Skills:</strong> ${skills}</p>` : ""}
        ${jobs ? `<h2 style="font-size:1.1rem;font-weight:700;margin-top:24px;">Experience</h2><ul style="padding-left:20px;">${jobs}</ul>` : ""}
    `;

    return buildHtml({ title, description, canonicalUrl, imageUrl, structuredData, bodyContent, siteSuffix: "CareerVivid Resume" });
}

async function handlePortfolio(uid: string): Promise<string> {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) throw new Error("not_found");
    const user = snap.data() as any;

    const portfolioSnap = await db.collection("users").doc(uid).collection("portfolio").limit(1).get();
    const portfolio = portfolioSnap.empty ? null : portfolioSnap.docs[0].data() as any;

    const name = user.displayName || portfolio?.personalInfo?.name || "CareerVivid Portfolio";
    const bio = portfolio?.personalInfo?.bio || user.bio || "";
    const title = `${name} – Portfolio`;
    const description = stripMarkdown(bio).substring(0, 160) || `View ${name}'s professional portfolio on CareerVivid.`;
    const imageUrl = user.photoURL || portfolio?.personalInfo?.avatar || DEFAULT_OG_IMAGE;
    const canonicalUrl = `${BASE_URL}/portfolio/${uid}`;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: `${name}'s Portfolio`,
        url: canonicalUrl,
        mainEntity: {
            "@type": "Person",
            name,
            description: description,
            image: imageUrl,
        }
    };

    const bodyContent = `
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:16px;">${esc(name)}</h1>
        ${description ? `<p style="font-size:1.05rem;color:#555;line-height:1.7;">${esc(description)}</p>` : ""}
    `;

    return buildHtml({ title, description, canonicalUrl, imageUrl, structuredData, bodyContent, siteSuffix: "CareerVivid Portfolio" });
}

async function handleWhiteboard(parts: string[]): Promise<string> {
    let whiteboardData: any = null;
    const whiteboardId = parts[parts.length - 1];

    const directSnap = await db.collection("whiteboards").doc(whiteboardId).get();
    if (directSnap.exists) {
        whiteboardData = directSnap.data();
    } else if (parts.length >= 2) {
        const uid = parts[parts.length - 2];
        const userSnap = await db.collection("users").doc(uid).collection("whiteboards").doc(whiteboardId).get();
        if (userSnap.exists) whiteboardData = userSnap.data();
    }

    if (!whiteboardData) throw new Error("not_found");

    const title = whiteboardData.title || "CareerVivid Whiteboard";
    const description = stripMarkdown(whiteboardData.description || "").substring(0, 160) || `View this whiteboard on CareerVivid.`;
    const imageUrl = whiteboardData.thumbnailUrl || DEFAULT_OG_IMAGE;
    const canonicalUrl = `${BASE_URL}/whiteboard/${whiteboardId}`;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url: canonicalUrl,
        image: imageUrl,
    };

    const bodyContent = `
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:16px;">${esc(title)}</h1>
        ${description ? `<p style="font-size:1.05rem;color:#555;line-height:1.7;">${esc(description)}</p>` : ""}
    `;

    return buildHtml({ title, description, canonicalUrl, imageUrl, structuredData, bodyContent, siteSuffix: "CareerVivid Whiteboard" });
}

function handleLearningPage(slug?: string): string {
    const page = getLearningSeoPage(slug);

    // page.path, not the request path — an unrecognised slug renders the
    // catalog, and its canonical must point at /learning rather than claim the
    // URL that was asked for.
    const canonicalUrl = `${BASE_URL}${page.path}`;
    const isCatalog = page.path === "/learning";
    const courseSchema = isCatalog
        ? {
            "@type": "ItemList",
            name: "CareerVivid interactive courses",
            numberOfItems: 3,
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Coding Interview Patterns", url: `${BASE_URL}/learning/coding-interview-patterns` },
                { "@type": "ListItem", position: 2, name: "System Design Interview", url: `${BASE_URL}/learning/system-design-interview` },
                { "@type": "ListItem", position: 3, name: "AI Agent Builder Curriculum", url: `${BASE_URL}/learning/ai-agent-curriculum` },
            ],
        }
        : {
            "@type": "Course",
            "@id": `${canonicalUrl}#course`,
            name: page.heading,
            description: page.description,
            url: canonicalUrl,
            provider: { "@type": "Organization", name: "CareerVivid", url: `${BASE_URL}/` },
            educationalLevel: page.level,
            isAccessibleForFree: isLearningPageFree(slug),
            hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
            teaches: page.topics,
            ...(isLearningPageFree(slug)
                ? { offers: { "@type": "Offer", price: "0", priceCurrency: "USD", category: "Free" } }
                : {}),
        };
    const structuredData: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": isCatalog ? "CollectionPage" : "WebPage",
                "@id": `${canonicalUrl}#webpage`,
                name: page.title,
                description: page.description,
                url: canonicalUrl,
                isPartOf: { "@type": "WebSite", name: "CareerVivid", url: `${BASE_URL}/` },
            },
            courseSchema,
            ...(isCatalog ? [] : [{
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "CareerVivid", item: `${BASE_URL}/` },
                    { "@type": "ListItem", position: 2, name: "Learning", item: `${BASE_URL}/learning` },
                    { "@type": "ListItem", position: 3, name: page.heading, item: canonicalUrl },
                ],
            }]),
            ...(page.faqs.length === 0 ? [] : [{
                "@type": "FAQPage",
                mainEntity: page.faqs.map(({ question, answer }) => ({
                    "@type": "Question",
                    name: question,
                    acceptedAnswer: { "@type": "Answer", text: answer },
                })),
            }]),
        ],
    };

    const topicList = page.topics.map((topic) => `<li>${esc(topic)}</li>`).join("");
    const faqList = page.faqs.map(({ question, answer }) => `
        <section>
          <h3 style="font-size:1rem;font-weight:700;margin:16px 0 4px;">${esc(question)}</h3>
          <p style="color:#555;line-height:1.6;margin:0;">${esc(answer)}</p>
        </section>`).join("");
    const courseLinks = isCatalog ? `
        <section style="margin-top:32px;">
          <h2 style="font-size:1.35rem;font-weight:800;">Available courses</h2>
          <article style="padding:16px 0;border-bottom:1px solid #eee;">
            <h3 style="font-size:1.05rem;margin:0 0 6px;"><a href="${BASE_URL}/learning/coding-interview-patterns" style="color:#4f46e5;">Coding Interview Patterns</a></h3>
            <p style="color:#555;line-height:1.6;margin:0;">20 algorithm patterns, 60 lessons, visual step-through animations, and runnable JavaScript code labs. Currently free to access.</p>
          </article>
          <article style="padding:16px 0;border-bottom:1px solid #eee;">
            <h3 style="font-size:1.05rem;margin:0 0 6px;"><a href="${BASE_URL}/learning/system-design-interview" style="color:#4f46e5;">System Design Interview</a></h3>
            <p style="color:#555;line-height:1.6;margin:0;">13 modules and 85 lessons: an answer framework, capacity estimation, caching, data at scale, async processing, multi-region reliability, real-time systems, and a senior capstone.</p>
          </article>
          <article style="padding:16px 0;">
            <h3 style="font-size:1.05rem;margin:0 0 6px;"><a href="${BASE_URL}/learning/ai-agent-curriculum" style="color:#4f46e5;">AI Agent Builder Curriculum</a></h3>
            <p style="color:#555;line-height:1.6;margin:0;">10 modules and 58 lessons from LLM foundations to a shipped AI agent portfolio project. The Foundations module is free to start.</p>
          </article>
        </section>` : "";
    const bodyContent = `
        <nav aria-label="Breadcrumb" style="font-size:0.9rem;margin-bottom:20px;"><a href="${BASE_URL}/learning" style="color:#4f46e5;">Learning</a>${isCatalog ? "" : ` / ${esc(page.heading)}`}</nav>
        <h1 style="font-size:2.2rem;font-weight:800;line-height:1.2;margin:0 0 12px;">${esc(page.heading)}</h1>
        <p style="font-size:1.1rem;color:#555;line-height:1.7;margin:0;">${esc(page.introduction)}</p>
        <dl style="display:grid;grid-template-columns:max-content 1fr;gap:8px 18px;margin:28px 0;padding:16px;background:#f8fafc;border-radius:8px;">
          <dt style="font-weight:700;">Format</dt><dd style="margin:0;">Self-paced online learning</dd>
          <dt style="font-weight:700;">Duration</dt><dd style="margin:0;">${esc(page.duration)}</dd>
          <dt style="font-weight:700;">Level</dt><dd style="margin:0;">${esc(page.level)}</dd>
          <dt style="font-weight:700;">Access</dt><dd style="margin:0;">${esc(page.access)}</dd>
        </dl>
        ${isCatalog ? "" : `<section><h2 style="font-size:1.35rem;font-weight:800;">What you will learn</h2><ul style="padding-left:20px;line-height:1.8;">${topicList}</ul></section>`}
        ${courseLinks}
        ${faqList ? `<section style="margin-top:32px;"><h2 style="font-size:1.35rem;font-weight:800;">Frequently asked questions</h2>${faqList}</section>` : ""}
        <p style="margin-top:32px;"><a href="${canonicalUrl}" style="color:#4f46e5;font-weight:700;">Open this interactive course on CareerVivid</a></p>`;

    return buildHtml({ title: page.title, description: page.description, canonicalUrl, imageUrl: DEFAULT_OG_IMAGE, structuredData, bodyContent, siteSuffix: "CareerVivid" });
}

// ── Community feed handler — serves a semantic article list to AI bots ────────
async function handleCommunityFeed(): Promise<string> {
    const appId = process.env.ALGOLIA_APP_ID;
    const searchKey = process.env.ALGOLIA_SEARCH_KEY;

    let articles: { id: string; title: string; author: string; snippet: string }[] = [];

    if (appId && searchKey) {
        try {
            const client = algoliasearch(appId, searchKey);
            const result = await client.search({
                requests: [{
                    indexName: "community_posts",
                    query: "",
                    hitsPerPage: 20,
                    attributesToRetrieve: ["objectID", "title", "authorName", "content", "type"],
                }]
            });
            const firstResult = (result.results[0] as any);
            const hits: any[] = firstResult?.hits ?? [];
            articles = hits
                .filter((h: any) => !h.type || h.type === "article")
                .map((h: any) => ({
                    id: h.objectID,
                    title: (h.title || "Untitled Article").trim(),
                    author: h.authorName || "CareerVivid Community",
                    snippet: stripMarkdown(h.content || "").substring(0, 120),
                }));
        } catch (err) {
            console.warn("[handleCommunityFeed] Algolia query failed:", err);
        }
    } else {
        console.warn("[handleCommunityFeed] Missing ALGOLIA_APP_ID or ALGOLIA_SEARCH_KEY.");
    }

    const title = "CareerVivid Community – Career Articles & Resources";
    const description = "Explore the latest career advice, resume tips, portfolio showcases, and professional development articles from the CareerVivid community.";
    const canonicalUrl = `${BASE_URL}/community`;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonicalUrl,
        publisher: { "@type": "Organization", name: "CareerVivid", logo: { "@type": "ImageObject", url: LOGO_URL } },
        hasPart: articles.map(a => ({
            "@type": "Article",
            name: a.title,
            url: `${BASE_URL}/community/post/${a.id}`,
            author: { "@type": "Person", name: a.author },
        }))
    };

    const listItems = articles.length > 0
        ? articles.map(a => `
    <li style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
      <a href="${BASE_URL}/community/post/${esc(a.id)}" style="font-size:1rem;font-weight:600;color:#4f46e5;text-decoration:none;">
        ${esc(a.title)}
      </a>
      <p style="margin:4px 0 0;font-size:0.85rem;color:#888;">${esc(a.author)}${a.snippet ? " · " + esc(a.snippet) + "…" : ""}</p>
    </li>`).join("")
        : `<li style="color:#888;padding:16px 0;">No articles found.</li>`;

    const bodyContent = `
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:8px;">${esc(title)}</h1>
        <p style="font-size:1rem;color:#555;margin-bottom:24px;">${esc(description)}</p>
        <ul style="list-style:none;padding:0;margin:0;">${listItems}
        </ul>
        <p style="margin-top:24px;font-size:0.85rem;color:#aaa;">
          <a href="${BASE_URL}/community" style="color:#4f46e5;">View all articles →</a>
        </p>`;

    return buildHtml({ title, description, canonicalUrl, imageUrl: DEFAULT_OG_IMAGE, structuredData, bodyContent, siteSuffix: "CareerVivid" });
}

/**
 * The public job list, with the actual jobs in the HTML.
 *
 * A client-fetched list is invisible: the crawler receives an empty grid and a
 * spinner, so the page ranks on its boilerplate and nothing else. The listings
 * are read here, server-side, from the SAME function the browser calls — if the
 * two ever diverged, the HTML shown to Google would not be the page a person
 * gets, which is cloaking whether or not anyone meant it that way.
 *
 * Deliberately no JobPosting structured data. These listings are collected from
 * employers' own boards, and Google requires the site claiming JobPosting to be
 * the authoritative source or to have permission. Marking them up would put a
 * manual action at risk for traffic that is not ours to claim. The page still
 * ranks as an ordinary results page.
 */
async function handleJobsList(pageParam: string | undefined): Promise<string> {
    const page = getSearchPage("/jobs/list");
    if (!page) throw new Error("not_found");

    const requested = Number(pageParam);
    const pageNumber = Number.isFinite(requested) && requested >= 1
        ? Math.min(Math.floor(requested), MAX_PUBLIC_JOB_PAGES)
        : 1;

    const { jobs, totalPages } = await readPublicJobs(pageNumber);

    // Page one lives at /jobs/list, never /jobs/list/1 — two URLs with the same
    // results is a duplicate Google has to choose between.
    const pathFor = (n: number) => (n <= 1 ? "/jobs/list" : `/jobs/list/${n}`);
    const canonicalUrl = `${BASE_URL}${pathFor(pageNumber)}`;

    const listItems = jobs.length
        ? jobs.map((job) => {
            const facts = [job.location, job.workModel, job.jobType, job.seniority, job.salary]
                .filter(Boolean).join(" · ");
            return `<li style="padding:16px 0;border-bottom:1px solid #eee;">
        <h3 style="margin:0 0 4px;font-size:1.05rem;font-weight:700;">${esc(job.title)}</h3>
        <p style="margin:0;color:#555;font-weight:600;">${esc(job.company)}</p>
        ${facts ? `<p style="margin:4px 0 0;color:#777;font-size:0.9rem;">${esc(facts)}</p>` : ""}
        ${job.description ? `<p style="margin:8px 0 0;color:#333;line-height:1.6;">${esc(job.description)}</p>` : ""}
      </li>`;
        }).join("")
        : `<li style="color:#888;padding:16px 0;">No open roles on this page right now.</li>`;

    const pager = totalPages > 1
        ? `<nav aria-label="Job list pages" style="margin-top:28px;">${
            Array.from({ length: totalPages }, (_, i) => i + 1)
                .map((n) => n === pageNumber
                    ? `<span style="margin-right:10px;font-weight:700;">${n}</span>`
                    : `<a href="${BASE_URL}${pathFor(n)}" style="margin-right:10px;color:#4f46e5;font-weight:700;">${n}</a>`)
                .join("")
        }</nav>`
        : "";

    const heading = pageNumber > 1 ? `${page.heading} — page ${pageNumber}` : page.heading;
    const title = pageNumber > 1 ? `Open Jobs — Page ${pageNumber} | CareerVivid` : page.title;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description: page.description,
        url: canonicalUrl,
        publisher: { "@type": "Organization", name: "CareerVivid", logo: { "@type": "ImageObject", url: LOGO_URL } },
    };

    const bodyContent = `
        <nav aria-label="Breadcrumb" style="font-size:0.9rem;margin-bottom:20px;"><a href="${BASE_URL}/" style="color:#4f46e5;">CareerVivid</a></nav>
        <h1 style="font-size:2.2rem;font-weight:800;line-height:1.2;margin:0 0 16px;">${esc(heading)}</h1>
        <p style="font-size:1.1rem;color:#555;line-height:1.7;margin:0;">${esc(page.summary)}</p>
        <ul style="list-style:none;padding:0;margin:28px 0 0;">${listItems}</ul>
        ${pager}
        ${renderSections(page)}
        ${renderFaqs(page)}
        ${(page.links || []).length ? `<ul style="padding-left:20px;line-height:1.9;margin-top:28px;">${
            (page.links || []).map(({ href, label }) =>
                `<li><a href="${BASE_URL}${href}" style="color:#4f46e5;font-weight:700;">${esc(label)}</a></li>`).join("")
        }</ul>` : ""}`;

    return buildHtml({
        title,
        description: page.description,
        canonicalUrl,
        imageUrl: DEFAULT_OG_IMAGE,
        structuredData,
        bodyContent,
        siteSuffix: "",
    });
}

// ── Main Function ─────────────────────────────────────────────────────────────
export const renderSeoContent = onRequest(
    {
        region: "us-west1",
        memory: "512MiB",
        timeoutSeconds: 30,
    },
    async (req, res) => {
        const ua = (req.headers["user-agent"] || "").toString();
        const path = req.path || "/";
        const parts = path.replace(/^\//, "").split("/");
        
        let language = "en";
        let routeParts = parts;

        // Check for language prefix (e.g., /zh/community/...)
        const SUPPORTED_LANGS = ["es", "fr", "de", "zh", "ja", "ko"];
        if (SUPPORTED_LANGS.includes(parts[0])) {
            language = parts[0];
            routeParts = parts.slice(1);
        }

        const routeType = routeParts[0]; // e.g. "community", "shared", "portfolio", "whiteboard"

        // ── Human traffic: serve the SPA's index.html directly ───────────
        if (!isbot(ua)) {
            try {
                const indexHtml = await getIndexHtml();
                // Inject language to html tag if needed, but SPA usually handles this
                res.set("Cache-Control", "public, max-age=300, s-maxage=600");
                res.status(200).type("html").send(indexHtml);
            } catch {
                res.status(200).type("html").send(
                    `<!DOCTYPE html><html lang="${language}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>CareerVivid</title><script type="module" src="/assets/main.js"></script></head><body><div id="root"></div></body></html>`
                );
            }
            return;
        }

        // ── Bot traffic: generate rich HTML ──────────────────────────────
        try {
            let html: string;

            if (routeType === "community" && routeParts[1] === "post" && routeParts[2]) {
                html = await handleArticle(routeParts[2]);
            } else if (routeType === "community" && !routeParts[1]) {
                html = await handleCommunityFeed();
            // Any /learning/* path renders: known courses get their own page,
            // everything else falls back to the catalog. Hosting rewrites the
            // whole subtree here, so a hardcoded slug list meant real routes
            // like /learning/system-design-interview and /learning/ccaf-quest
            // answered 404 to crawlers.
            } else if (routeType === "learning") {
                html = handleLearningPage(routeParts[1]);
            } else if (routeType === "shared" && routeParts[1] && routeParts[2]) {
                html = await handleResume(routeParts[1], routeParts[2]);
            } else if (routeType === "portfolio" && routeParts[1]) {
                html = await handlePortfolio(routeParts[1]);
            } else if (routeType === "whiteboard") {
                html = await handleWhiteboard(routeParts.slice(1));
            // /jobs/list and /jobs/list/{n}. Matched before getSearchPage so the
            // numbered pages resolve too — only page one is in SEARCH_PAGES.
            } else if (routeType === "jobs" && routeParts[1] === "list") {
                html = await handleJobsList(routeParts[2]);
            } else if (language === "en") {
                const page = getSearchPage(path);
                if (!page) {
                    res.status(404).send("Not Found");
                    return;
                }
                html = handleStaticPage(page);
            } else {
                res.status(404).send("Not Found");
                return;
            }

            // Set the correct lang attribute in the generated HTML
            html = html.replace('<html lang="en">', `<html lang="${language}">`);

            // Default cache: 5 min client, 10 min CDN
            if (!res.getHeader("Cache-Control")) {
                res.set("Cache-Control", "public, max-age=300, s-maxage=600");
            }
            res.set("X-Rendered-By", "renderSeoContent");
            res.status(200).type("html").send(html);

        } catch (err: any) {
            if (err.message === "not_found") {
                res.status(404).send("Content not found.");
            } else {
                console.error("[renderSeoContent] Error:", err);
                res.status(500).send("Internal Server Error");
            }
        }
    }
);
