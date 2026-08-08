import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://careervivid.app';

    // Define static routes (empty string '' corresponds to the root '/')
    const staticRoutes = ['', '/pricing', '/demo', '/blog', '/contact'];

    return staticRoutes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '' ? 1.0 : 0.8,
    }));
}
