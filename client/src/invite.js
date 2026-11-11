// Shareable links for an already-running public multiplayer server.
// The URL contains world details, never an account secret or an authentication token.
const localHosts = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[?::1\]?|.*\.local)$/i;
export function isPublicHost(host) {
  if (!host || localHosts.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
  const m = /^172\.(\d+)\./.exec(host);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
  if (/^(fc|fd|fe80):/i.test(host.replace(/^\[|\]$/g,''))) return false;
  return true;
}
export function publicInviteUrl({pageUrl, serverUrl, room, mode, seed, fallbackSite='https://juliusbo-afk.github.io/Minecraft/'}) {
  const server = new URL(serverUrl);
  if (server.protocol !== 'wss:' || !isPublicHost(server.hostname)) {
    throw new Error('Für Freunde im Internet brauchst du einen öffentlichen WSS-Server (nicht localhost oder eine lokale IP).');
  }
  const openedPage = new URL(pageUrl);
  const site = openedPage.protocol === 'https:' && isPublicHost(openedPage.hostname)
    ? openedPage
    : new URL(fallbackSite);
  if (site.protocol !== 'https:') throw new Error('Der Einladungslink muss eine sichere HTTPS-Webseite verwenden.');
  const url = new URL(site.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', '1');
  url.searchParams.set('room', String(room).slice(0,28));
  url.searchParams.set('mode', mode === 'creative' ? 'creative' : 'survival');
  url.searchParams.set('seed', String(seed));
  // When the client is hosted by the game server, use same-origin WebSocket.
  if (url.host !== server.host) url.searchParams.set('server', server.href);
  return url.href;
}
export function parseInviteUrl(pageUrl) {
  const page = new URL(pageUrl), p = page.searchParams;
  if (p.get('join') !== '1') return null;
  const room = (p.get('room') || '').trim().slice(0,28);
  const mode = p.get('mode');
  if (!room || (mode !== 'creative' && mode !== 'survival')) return null;
  const server = p.get('server');
  if (server) {
    try {
      const parsed = new URL(server);
      if (parsed.protocol !== 'wss:' || !isPublicHost(parsed.hostname)) return null;
    } catch { return null; }
  }
  return {room,mode,seed:(p.get('seed') || '').slice(0,80),server};
}
export function sameOriginSocketUrl(pageUrl) {
  const url = new URL(pageUrl);
  if (url.hostname.endsWith('.github.io')) return '';
  return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/ws`;
}
