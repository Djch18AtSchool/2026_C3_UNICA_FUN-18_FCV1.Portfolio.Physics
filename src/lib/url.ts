const FILE_SEGMENT = /\.[^/]+$/;

/** Prefix a site path with the deploy base. Route paths get a trailing slash; file paths do not. */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  const cleanPath = path.replace(/^\/+/, '');
  if (cleanPath === '') return base;
  const isFile = FILE_SEGMENT.test(cleanPath);
  const joined = `${base}/${cleanPath}${isFile ? '' : '/'}`;
  return joined.replace(/\/{2,}/g, '/');
}

export function topicUrl(slug: string, base: string = import.meta.env.BASE_URL): string {
  return withBase(`temas/${slug}/`, base);
}
