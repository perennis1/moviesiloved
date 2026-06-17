export const DEFAULT_MOVIESMOD_HOST_PATTERN = String.raw`^([a-z0-9-]+\.)?moviesmod\.[a-z]{2,}$`;

export function getMoviesModHostPattern(patternSource?: string | null) {
  return normalizePattern(patternSource) || DEFAULT_MOVIESMOD_HOST_PATTERN;
}

export function getMoviesModHostPatternDescription(patternSource?: string | null) {
  const pattern = getMoviesModHostPattern(patternSource);
  return `/${pattern}/i`;
}

export function parseMoviesModUrl(rawUrl: string) {
  const parsedUrl = new URL(rawUrl);
  const hostname = parsedUrl.hostname.toLowerCase();

  return {
    parsedUrl,
    hostname
  };
}

export function isAllowedMoviesModHost(hostname: string, patternSource?: string | null) {
  const pattern = getMoviesModHostPattern(patternSource);
  return compilePattern(pattern).test(hostname.toLowerCase());
}

export function describeMoviesModHostCheck(hostname: string, patternSource?: string | null) {
  const pattern = getMoviesModHostPattern(patternSource);
  const isAllowed = compilePattern(pattern).test(hostname.toLowerCase());

  return {
    hostname: hostname.toLowerCase(),
    pattern,
    isAllowed
  };
}

function normalizePattern(patternSource?: string | null) {
  const trimmed = patternSource?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "";
}

function compilePattern(patternSource: string) {
  try {
    return new RegExp(patternSource, "i");
  } catch {
    return new RegExp(DEFAULT_MOVIESMOD_HOST_PATTERN, "i");
  }
}
