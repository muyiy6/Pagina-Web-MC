#!/usr/bin/env node
// 独立 Minecraft 服务器在线检测脚本（无需安装任何依赖，Node 18+）
// 用法：
//   node scripts/check-server.mjs                      → 检测 .env 中的 MINECRAFT_SERVER_IP
//   node scripts/check-server.mjs mc.example.com       → 指定地址（默认端口 25565）
//   node scripts/check-server.mjs mc.example.com 25566 → 指定地址和端口

import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';

// ---- 读取 .env ----
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const host = process.argv[2] || process.env.MINECRAFT_SERVER_IP || 'localhost';
const port = Number(process.argv[3] || process.env.MINECRAFT_SERVER_PORT || 25565);

// ---- VarInt ----
function writeVarInt(value) {
  let val = value >>> 0;
  const bytes = [];
  do {
    let b = val & 0x7f;
    val >>>= 7;
    if (val !== 0) b |= 0x80;
    bytes.push(b);
  } while (val !== 0);
  return Buffer.from(bytes);
}
function readVarInt(buf, offset) {
  let num = 0, shift = 0, i = offset;
  while (i < buf.length) {
    const b = buf[i];
    num |= (b & 0x7f) << shift;
    i += 1;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [num >>> 0, i];
}

function pingDirect(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let settled = false;
    const socket = net.createConnection({ host, port, timeout: timeoutMs });
    let buffer = Buffer.alloc(0);
    const done = (v) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve(v);
    };
    socket.on('connect', () => {
      try {
        const hb = Buffer.from(host, 'utf8');
        const body = Buffer.concat([
          writeVarInt(0x00), writeVarInt(760),
          writeVarInt(hb.length), hb,
          Buffer.from([(port >> 8) & 0xff, port & 0xff]),
          writeVarInt(1),
        ]);
        socket.write(Buffer.concat([writeVarInt(body.length), body, Buffer.from([0x01, 0x00])]));
      } catch { done(null); }
    });
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const [len, start] = readVarInt(buffer, 0);
        if (buffer.length < start + len) return;
        if (buffer[start] !== 0x00) { done(null); return; }
        const [jlen, jstart] = readVarInt(buffer, start + 1);
        if (buffer.length < jstart + jlen) return;
        done(JSON.parse(buffer.slice(jstart, jstart + jlen).toString('utf8')));
      } catch { done(null); }
    });
    socket.on('timeout', () => done(null));
    socket.on('error', () => done(null));
  });
}

async function pingViaApi(host, port) {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${host}:${port}`, {
      headers: { 'user-agent': 'mc-server-check/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    return await res.json();
  } catch { return null; }
}

const start = Date.now();
console.log(`⏳ 正在检测 ${host}:${port} ...`);

let data = await pingDirect(host, port);
let mode = '直连 (TCP)';
if (!data) {
  console.log('   直连失败（服务器无响应 / 本机网络受限），改用公共 API ...');
  data = await pingViaApi(host, port);
  mode = '公共 API (mcsrvstat.us)';
}

if (data && (data.online || (data.players && typeof data.players.online === 'number'))) {
  const players = data.players || {};
  const version = data.version?.name || data.version || '未知';
  const motd = (data.motd?.clean?.join(' ') || data.motd?.raw?.join(' ') ||
    (typeof data.description === 'string' ? data.description : data.description?.text) || '').trim();
  console.log(`\n✅ 服务器在线！（${mode}，耗时 ${Date.now() - start}ms）`);
  console.log(`   版本: ${version}`);
  console.log(`   玩家: ${players.online ?? 0}/${players.max ?? 0}`);
  if (motd) console.log(`   MOTD: ${motd}`);
  process.exit(0);
} else {
  console.log('\n❌ 服务器离线或无法访问。请检查：');
  console.log('   1. 服务器是否已启动');
  console.log('   2. IP/端口是否正确，端口是否放行（防火墙/安全组）');
  console.log('   3. 如果是家用宽带，需在路由器上做端口映射（25565）');
  process.exit(1);
}
