const MOVIESMOD_HOSTS = [
  "moviesmod.band",
  "moviesmod.bond",
  "moviesmod.cafe",
  "moviesmod.chat",
  "moviesmod.day",
  "moviesmod.email",
  "moviesmod.food",
  "moviesmod.fyi",
  "moviesmod.hair",
  "moviesmod.ink",
  "moviesmod.lat",
  "moviesmod.life",
  "moviesmod.money",
  "moviesmod.zip"
] as const;

const MOVIESMOD_HOST_SET = new Set([
  ...MOVIESMOD_HOSTS,
  ...MOVIESMOD_HOSTS.map((host) => `www.${host}`)
]);

export function getAllowedMoviesModHosts() {
  return [...MOVIESMOD_HOSTS];
}

export function parseMoviesModUrl(rawUrl: string) {
  const parsedUrl = new URL(rawUrl);
  const hostname = parsedUrl.hostname.toLowerCase();
  const isAllowed = MOVIESMOD_HOST_SET.has(hostname);

  return {
    parsedUrl,
    hostname,
    isAllowed
  };
}

export function isAllowedMoviesModHost(hostname: string) {
  return MOVIESMOD_HOST_SET.has(hostname.toLowerCase());
}
