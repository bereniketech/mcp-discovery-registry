import { Helmet, HelmetProvider } from 'react-helmet-async';

const SITE_NAME = 'MCP Discovery Registry';
const DEFAULT_TITLE = 'MCP Discovery Registry | Discover MCP Servers';
const DEFAULT_DESCRIPTION =
  'Discover, compare, and share Model Context Protocol servers with searchable metadata, tags, and trending activity.';
const DEFAULT_OG_IMAGE = 'https://avatars.githubusercontent.com/u/9919?s=400&v=4';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

function toAbsoluteUrl(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const configuredBase = import.meta.env.VITE_SITE_URL as string | undefined;
  const runtimeBase = typeof window !== 'undefined' ? window.location.origin : undefined;
  const base = configuredBase ?? runtimeBase;

  if (!base) {
    return undefined;
  }

  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
}

export function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image,
  path,
  type = 'website',
  noIndex = false,
}: SeoProps) {
  const canonicalUrl = toAbsoluteUrl(path);
  const ogImage = toAbsoluteUrl(image) ?? DEFAULT_OG_IMAGE;

  return (
    <HelmetProvider>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content={type} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
        {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
        {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}
      </Helmet>
    </HelmetProvider>
  );
}