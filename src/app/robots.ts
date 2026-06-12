import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fifa26.eu.cc';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/sbsadmin/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
