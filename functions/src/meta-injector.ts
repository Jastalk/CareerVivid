import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const injectCommunityMeta = onRequest(
    {
        region: "us-west1",
        memory: "512MiB",
        timeoutSeconds: 30,
    },
    async (req, res) => {
        // req.path in v2 onRequest includes the full path from the root when used with rewrites
        const pathParts = req.path.split('/');
        const postId = pathParts[pathParts.length - 1];

        if (!postId || postId === 'post') {
            res.status(404).send('Not Found');
            return;
        }

        try {
            const postDoc = await db.collection('community_posts').doc(postId).get();
            if (!postDoc.exists) {
                // Return a generic metadata if the post specifically doesn't exist
                // but keep it on the page so React can show a 404
                res.status(404).redirect('https://careervivid.app/community');
                return;
            }

            const post = postDoc.data() as any;
            const title = (post.title || 'CareerVivid Article').replace(/"/g, '&quot;');

            // Clean markdown for description
            let description = (post.content || '')
                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
                .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text
                .replace(/[#_*`[\]>]/g, '') // Remove formatting
                .replace(/\n+/g, ' ') // Flatten newlines
                .trim();

            description = description.substring(0, 160) || 'Read this article on CareerVivid Community.';
            description = description.replace(/"/g, '&quot;');

            const imageUrl = post.coverImage || 'https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Fog_image.png?alt=media';
            const canonicalUrl = `https://careervivid.app/community/post/${postId}`;

            // --- GEO Optimization: Structured Data ---
            const publishDate = post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : (post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toISOString() : new Date().toISOString());

            // Extract FAQs for GEO (FAQPage Schema)
            const faqs: any[] = [];
            const faqHeaderRegex = /(?:^|\n)(?:#+)\s*Frequently Asked Questions\s*\n([\s\S]*)$/i;
            const faqMatch = (post.content || '').match(faqHeaderRegex);
            if (faqMatch) {
                const qnaRegex = /(?:\*\*Q:?|### Q:?|Q:?)\s*(.*?)\n(?:\*\*A:?|A:?)\s*(.*?)(?=\n(?:\*\*Q|### Q|Q)|$)/gs;
                let qnaMatch;
                while ((qnaMatch = qnaRegex.exec(faqMatch[1])) !== null) {
                    if (qnaMatch[1] && qnaMatch[2]) {
                        faqs.push({
                            "@type": "Question",
                            "name": qnaMatch[1].trim(),
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": qnaMatch[2].trim()
                            }
                        });
                    }
                }
            }

            const structuredData = {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "Article",
                        "@id": `${canonicalUrl}#article`,
                        "headline": title.substring(0, 110),
                        "description": description,
                        "image": [imageUrl],
                        "datePublished": publishDate,
                        "author": {
                            "@type": "Person",
                            "name": post.authorName || "CareerVivid Community"
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "CareerVivid",
                            "logo": {
                                "@type": "ImageObject",
                                "url": "https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Flogo_light_mode.png?alt=media"
                            }
                        }
                    }
                ]
            };

            if (faqs.length > 0) {
                (structuredData["@graph"] as any).push({
                    "@type": "FAQPage",
                    "@id": `${canonicalUrl}#faq`,
                    "mainEntity": faqs
                });
            }

            // Return a clean HTML shell with dynamic meta tags
            // This includes enough script to boot the SPA normally
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- Dynamic Meta Tags -->
    <title>${title} | CareerVivid Community</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="CareerVivid" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <!-- GEO / SEO Structured Data -->
    <script type="application/ld+json">
        ${JSON.stringify(structuredData)}
    </script>

    <link rel="icon" href="https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Flogo_light_mode.png?alt=media" />
    
    <!-- Styles -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Primary App Entry (Stable Production Path) -->
    <script type="module" src="/assets/main.js"></script>
    <script>
        window.__PRELOADED_POST__ = ${JSON.stringify({ title, description, imageUrl })};
    </script>
</head>
<body class="bg-gray-100 dark:bg-gray-950">
    <div id="root">
        <!-- Minimal loading state for SEO crawlers -->
        <article style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif;">
            <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 24px; color: #111;">${title}</h1>
            <p style="color: #444; font-size: 1.25rem; line-height: 1.6; margin-bottom: 32px;">${description}...</p>
            <div style="padding: 20px; border-top: 1px solid #eee; color: #888; font-size: 0.9rem;">
                Loading interactive experience on CareerVivid...
            </div>
        </article>
    </div>
</body>
</html>`;

            res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
            res.status(200).send(html);

        } catch (error) {
            console.error('Meta Injector Error:', error);
            res.status(500).send('Internal Server Error');
        }
    }
);
