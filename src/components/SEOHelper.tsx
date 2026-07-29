import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    schemaType?: 'WebSite' | 'ProfilePage' | 'TechArticle' | 'SoftwareApplication';
    schemaData?: any;
    techStack?: string[]; // Used for ProfilePage knowsAbout
    isRobotsAllowed?: boolean; // Control whether the page should be indexed
}

/**
 * SEOHelper Component
 * Dynamically injects SEO tags and JSON-LD structured data for Generative Engine Optimization (GEO).
 */
const SEOHelper: React.FC<SEOProps> = ({
    title,
    description,
    keywords,
    image,
    url,
    schemaType = 'WebSite',
    schemaData,
    techStack = [],
    isRobotsAllowed = true
}) => {
    // Normalization helper to prevent duplicate content issues
    const normalizeCanonicalUrl = (rawUrl: string): string => {
        try {
            const urlObj = new URL(rawUrl);
            // Enforce primary domain and HTTPS
            urlObj.protocol = 'https:';
            urlObj.hostname = 'careervivid.app';
            // Remove query parameters
            urlObj.search = '';
            // Remove trailing slash
            let pathname = urlObj.pathname;
            if (pathname !== '/' && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }
            return `https://${urlObj.hostname}${pathname}`;
        } catch {
            // Fallback for relative paths or invalid URLs
            let path = rawUrl.split('?')[0].split('#')[0];
            if (path !== '/' && path.endsWith('/')) {
                path = path.slice(0, -1);
            }
            if (!path.startsWith('/')) path = '/' + path;
            return `https://careervivid.app${path}`;
        }
    };

    const rawUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://careervivid.app/');
    const canonicalUrl = normalizeCanonicalUrl(rawUrl);

    // Fallbacks
    const defaultImage = 'https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Fog_image.png?alt=media';
    const finalImage = image || defaultImage;
    const imageAlt = title ? `${title} preview` : 'CareerVivid interactive course and interview preparation platform';

    // Construct the structured data
    let structuredData: any = {
        "@context": "https://schema.org",
        ...schemaData
    };

    // If specific schema overrides aren't provided, build a default one based on type
    if (!schemaData) {
        structuredData["@type"] = schemaType;
        if (title) structuredData["name"] = title;
        if (description) structuredData["description"] = description;
        structuredData["url"] = canonicalUrl;
        if (finalImage) structuredData["image"] = finalImage;

        if (schemaType === 'ProfilePage') {
            structuredData["mainEntity"] = {
                "@type": "Person",
                "name": title?.split('|')[0]?.trim() || "Developer",
                "knowsAbout": techStack.length > 0 ? techStack : ["Software Engineering", "Web Development"]
            };
        } else if (schemaType === 'TechArticle') {
            structuredData["headline"] = title;
            structuredData["articleSection"] = "System Architecture & Software Development";
        } else if (schemaType === 'SoftwareApplication') {
            structuredData["applicationCategory"] = "DeveloperApplication";
            structuredData["operatingSystem"] = "Web, CLI, MCP";
        }
    }

    const llmContextText = (schemaType === 'ProfilePage' || schemaType === 'TechArticle')
        ? `This is a technical portfolio hosted on CareerVivid. The author specializes in ${techStack.length > 0 ? techStack.join(', ') : 'modern web technologies'}. CareerVivid is an omnichannel AI-Native Developer Portfolio & Vibe Coding Platform where developers update their portfolios directly from Cursor, Claude Desktop, or our Web Dashboard.`
        : '';

    return (
        <>
            <Helmet>
                {title && <title>{title}</title>}
                {title && <meta property="og:title" content={title} />}
                {title && <meta name="twitter:title" content={title} />}

                {description && <meta name="description" content={description} />}
                {description && <meta property="og:description" content={description} />}
                {description && <meta name="twitter:description" content={description} />}

                {keywords && <meta name="keywords" content={keywords} />}

                <link rel="canonical" href={canonicalUrl} />
                <meta name="robots" content={isRobotsAllowed ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow'} />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:type" content={schemaType === 'TechArticle' ? 'article' : 'website'} />
                <meta property="og:site_name" content="CareerVivid" />
                <meta property="og:locale" content="en_US" />
                <meta property="og:image" content={finalImage} />
                <meta property="og:image:alt" content={imageAlt} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta name="twitter:image" content={finalImage} />
                <meta name="twitter:image:alt" content={imageAlt} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@careervivid" />
                <meta name="twitter:creator" content="@careervivid" />

                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            {llmContextText && (
                <div id="llm-context" style={{ display: 'none' }} data-nosnippet>
                    {llmContextText}
                </div>
            )}
        </>
    );
};

export default SEOHelper;
