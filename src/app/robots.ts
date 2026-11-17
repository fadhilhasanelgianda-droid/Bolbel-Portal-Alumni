import type { MetadataRoute } from 'next';

/** The portal is private (sign-in only): nothing here should be indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
