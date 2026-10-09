const FILE_SEGMENT = /\.[^/]+$/;

/** Prefix a site path with the deploy base. Route paths get a trailing slash; file paths do not. */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  const cleanPath = path.replace(/^\/+/, '');
  if (cleanPath === '') return base;
  const isFile = FILE_SEGMENT.test(cleanPath);
  const joined = `${base}/${cleanPath}${isFile ? '' : '/'}`;
  return joined.replace(/\/{2,}/g, '/');
}

/**
 * Absolute public URL of a built page: `siteUrl` plus the request path without the deploy base,
 * e.g. "/repo/temas/x/" → "https://user.github.io/repo/temas/x/".
 */
export function canonicalUrl(
  pathname: string,
  siteUrl: string,
  base: string = import.meta.env.BASE_URL,
): string {
  const baseDir = base.endsWith('/') ? base : `${base}/`;
  const relative = pathname.startsWith(baseDir)
    ? pathname.slice(baseDir.length)
    : pathname.replace(/^\/+/, '');
  return new URL(relative, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).href;
}

export function topicUrl(slug: string, base: string = import.meta.env.BASE_URL): string {
  return withBase(`temas/${slug}/`, base);
}
