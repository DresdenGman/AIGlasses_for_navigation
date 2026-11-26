/**
 * Single source of truth for the deployment base path.
 *
 * The showcase is served from a subpath on GitHub Pages
 * (/QuietFrame). Next's <Link> applies the configured
 * basePath automatically, but hand-built URLs (raw <a> hrefs, img srcSet
 * strings, media URLs) do not — every such URL must go through
 * withBasePath or it escapes the site prefix and 404s.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  if (BASE_PATH && (url === BASE_PATH || url.startsWith(`${BASE_PATH}/`))) return url;
  return `${BASE_PATH}${url}`;
}

/** Prefix every candidate URL inside a srcSet string, not just the first. */
export function withBasePathSrcSet(srcSet: string): string {
  return srcSet
    .split(",")
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      const url = parts[0];
      if (!url) return candidate;
      return [withBasePath(url), ...parts.slice(1)].join(" ");
    })
    .join(", ");
}
