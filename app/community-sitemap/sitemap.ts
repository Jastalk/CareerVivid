import { MetadataRoute } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin (adjust with your standard initialization approach)
if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const BASE_URL = 'https://careervivid.app';

// Maximum URLs per sitemap chunk
const ITEMS_PER_SITEMAP = 5000;

// Revalidate this chunk every 24 hours (86400 seconds)
export const revalidate = 86400;

/**
 * Step 1: Tell Next.js how many sitemaps to generate.
 */
export async function generateSitemaps() {
    // Query Firestore for the total count of community posts.
    const snapshot = await db.collection('community_posts').count().get();
    const totalPosts = snapshot.data().count;

    const numSitemaps = Math.ceil(totalPosts / ITEMS_PER_SITEMAP);

    return Array.from({ length: numSitemaps }, (_, i) => ({
        id: i,
    }));
}

/**
 * Step 2: Generate the URLs for a specific chunk ID.
 */
export default async function sitemap({
    id,
}: {
    id: number;
}): Promise<MetadataRoute.Sitemap> {
    const offset = id * ITEMS_PER_SITEMAP;

    const snapshot = await db
        .collection('community_posts')
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(ITEMS_PER_SITEMAP)
        .get();

    const sitemapEntries: MetadataRoute.Sitemap = snapshot.docs.map((doc) => {
        const post = doc.data();

        const lastModified = post.updatedAt
            ? post.updatedAt.toDate()
            : (post.createdAt ? post.createdAt.toDate() : new Date());

        const route = `/community/post/${doc.id}`;

        return {
            url: `${BASE_URL}${route}`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.7,
        };
    });

    return sitemapEntries;
}
