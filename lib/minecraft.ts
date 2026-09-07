import net from 'net';

export interface ServerStatus {
  online: boolean;
  players: {
    online: number;
    max: number;
    list?: string[];
  };
  version?: string;
  motd?: string;
  favicon?: string;
  ping?: number;
}

const PING_TIMEOUT_MS = 5000;

// ---------- VarInt helpers ----------
function writeVarInt(value: number): Buffer {
  let val = value >>> 0;
  const bytes: number[] = [];
  do {
    let b = val & 0x7f;
    val >>>= 7;
    if (val !== 0) b |= 0x80;
    bytes.push(b);
  } while (val !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buf: Buffer, offset: number): [number, number] {
  let num = 0;
  let shift = 0;
  let i = offset;
  while (i < buf.length) {
    const b = buf[i];
    num |= (b & 0x7f) << shift;
    i += 1;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [num >>> 0, i];
}

// ---------- Direct Server List Ping (Minecraft 1.7+ protocol) ----------
async function pingServerDirect(host: string, port: number): Promise<ServerStatus | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: ServerStatus | null) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve(value);
    };

    const socket = net.createConnection({ host, port, timeout: PING_TIMEOUT_MS });
    let buffer = Buffer.alloc(0);

    socket.on('connect', () => {
      try {
        const hostBytes = Buffer.from(host, 'utf8');
        // Handshake: packet id 0x00, protocol 760, host, port, next state 1
        const handshakeBody = Buffer.concat([
          writeVarInt(0x00),
          writeVarInt(760),
          writeVarInt(hostBytes.length),
          hostBytes,
          Buffer.from([(port >> 8) & 0xff, port & 0xff]),
          writeVarInt(1),
        ]);
        const handshake = Buffer.concat([writeVarInt(handshakeBody.length), handshakeBody]);
        // Status request: length 1, id 0x00
        const request = Buffer.from([0x01, 0x00]);
        socket.write(Buffer.concat([handshake, request]));
      } catch {
        done(null);
      }
    });

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        // Need at least the packet length VarInt
        const [packetLen, dataStart] = readVarInt(buffer, 0);
        if (buffer.length < dataStart + packetLen) return;

        const packetId = buffer[dataStart];
        if (packetId !== 0x00) { done(null); return; }

        const [jsonLen, jsonStart] = readVarInt(buffer, dataStart + 1);
        if (buffer.length < jsonStart + jsonLen) return;

        const json = JSON.parse(buffer.slice(jsonStart, jsonStart + jsonLen).toString('utf8'));
        const players = json.players || {};
        done({
          online: true,
          players: {
            online: Number(players.online || 0),
            max: Number(players.max || 0),
            list: Array.isArray(players.sample)
              ? players.sample.map((p: any) => String(p.name || '')).filter(Boolean)
              : [],
          },
          version: json.version?.name || 'Unknown',
          motd: typeof json.description === 'string'
            ? json.description
            : (json.description?.text || '') +
              (Array.isArray(json.description?.extra)
                ? json.description.extra.map((e: any) => e.text || '').join('')
                : ''),
          favicon: json.favicon || '',
        });
      } catch {
        done(null);
      }
    });

    socket.on('timeout', () => done(null));
    socket.on('error', () => done(null));
  });
}

// ---------- Third-party API fallback (mcsrvstat.us) ----------
async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'user-agent': '999wrld-minecraft-status/1.0',
        accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getServerStatusViaApi(host: string, port: number): Promise<ServerStatus> {
  const data = await fetchJsonWithTimeout(`https://api.mcsrvstat.us/3/${host}:${port}`, 5000);
  if (!data.online) {
    return { online: false, players: { online: 0, max: 0 } };
  }
  return {
    online: true,
    players: {
      online: data.players?.online || 0,
      max: data.players?.max || 0,
      list: data.players?.list || [],
    },
    version: data.version || 'Unknown',
    motd: data.motd?.clean?.join('\n') || data.motd?.raw?.join('\n') || '',
    favicon: data.icon || '',
    ping: data.debug?.ping || 0,
  };
}

const OFFLINE: ServerStatus = { online: false, players: { online: 0, max: 0 } };

/**
 * Check a Minecraft server online.
 * 1) Direct Server List Ping over TCP (works on Node.js hosting).
 * 2) Falls back to the mcsrvstat.us public API (works everywhere, incl. Vercel).
 */
export async function getServerStatus(host: string, port: number = 25565): Promise<ServerStatus> {
  // 1) Direct TCP ping (not available on serverless platforms like Vercel)
  try {
    const direct = await pingServerDirect(host, port);
    if (direct && direct.online) return direct;
  } catch {
    // ignore, try API fallback
  }

  // 2) Public API fallback
  try {
    const viaApi = await getServerStatusViaApi(host, port);
    if (viaApi.online) return viaApi;
  } catch {
    // ignore
  }

  return OFFLINE;
}

export function getPlayerAvatar(username: string, size: number = 64): string {
  return `https://crafatar.com/avatars/${username}?size=${size}&overlay=true`;
}

export function getPlayerHead(username: string): string {
  return `https://crafatar.com/renders/head/${username}?scale=4&overlay=true`;
}
