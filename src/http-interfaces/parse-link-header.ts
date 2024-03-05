const MAX_HEADER_LENGTH = 2000;
const THROW_ON_MAX_HEADER_LENGTH_EXCEEDED = false;

interface LinkInfo {
  [key: string]: string | undefined;
  url?: string;
  rel?: string;
}

interface Options {
  maxHeaderLength?: number;
  throwOnMaxHeaderLengthExceeded?: boolean;
}

function hasRel(x: LinkInfo | null): x is LinkInfo {
  return x !== null && x.rel !== undefined;
}

function intoRels(
  acc: { [rel: string]: LinkInfo },
  x: LinkInfo
): { [rel: string]: LinkInfo } {
  function splitRel(rel: string): void {
    acc[rel] = { ...x, rel: rel };
  }

  x.rel!.split(/\s+/).forEach(splitRel);

  return acc;
}

function createObjects(
  acc: { [key: string]: string },
  p: string
): { [key: string]: string } {
  const m = p.match(/\s*(.+)\s*=\s*"?([^"]+)"?/);
  if (m) acc[m[1]] = m[2];
  return acc;
}

function parseLink(link: string): LinkInfo | null {
  try {
    const m = link.match(/<?([^>]*)>(.*)/)!;
    const linkUrl = m[1];
    const parts = m[2].split(';');
    const qry: { [key: string]: string } = {};
    const url = new URL(linkUrl, 'https://example.com');

    for (const [key, value] of url.searchParams) {
      qry[key] = value;
    }

    parts.shift();

    let info = parts.reduce(createObjects, {});
    info = { ...qry, ...info };
    info.url = linkUrl;
    return info;
  } catch {
    return null;
  }
}

function checkHeader(
  linkHeader: string | undefined,
  options?: Options
): boolean {
  if (!linkHeader) return false;

  options = options || {};
  const maxHeaderLength = options.maxHeaderLength || MAX_HEADER_LENGTH;
  const throwOnMaxHeaderLengthExceeded =
    options.throwOnMaxHeaderLengthExceeded ||
    THROW_ON_MAX_HEADER_LENGTH_EXCEEDED;

  if (linkHeader.length > maxHeaderLength) {
    if (throwOnMaxHeaderLengthExceeded) {
      throw new Error(
        'Input string too long, it should be under ' +
          maxHeaderLength +
          ' characters.'
      );
    } else {
      return false;
    }
  }
  return true;
}

function parseLinkHeader(
  linkHeader: string | undefined,
  options?: Options
): { [rel: string]: LinkInfo } | null {
  if (!checkHeader(linkHeader, options)) return null;

  return (linkHeader ?? '')
    .split(/,\s*</)
    .map(parseLink)
    .filter(hasRel)
    .reduce(intoRels, {});
}

export { parseLinkHeader };
