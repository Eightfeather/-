import * as fs from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { isInside } from '../safety.mjs';
import { assetText } from '../assets.mjs';
import { MAX_BODY_BYTES } from '../safety.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

export function sendError(res, err) {
  const status = err?.status || (err?.name === 'SafetyError' ? 400 : 500);
  sendJson(res, status, { ok: false, error: err?.message || String(err) });
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('请求体过大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      const text = Buffer.concat(chunks).toString('utf8');
      try { resolve(JSON.parse(text)); } catch { reject(Object.assign(new Error('JSON 解析失败'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

export function checkToken(req, token) {
  if (!token) return true;
  const got = req.headers['x-wb-token'];
  return typeof got === 'string' && got === token;
}

const ALLOWED_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;

export function checkHost(req) {
  const host = String(req.headers.host || '');
  if (!ALLOWED_HOST.test(host)) return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      const u = new URL(origin);
      if (!/^(127\.0\.0\.1|localhost|\[::1\])$/i.test(u.hostname)) return false;
    } catch { return false; }
  }
  return true;
}

/** 静态文件：只允许 webRoot 内部；index.html 里注入 token */
export function serveStatic(req, res, webRoot, urlPath, { token = '' } = {}) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const virtual = assetText('web/' + rel.split('/').filter(Boolean).join('/'));
  if (virtual != null) {
    let body = Buffer.from(virtual, 'utf8');
    const ext = extname(rel).toLowerCase();
    if (ext === '.html') body = Buffer.from(body.toString('utf8').split('%%WB_TOKEN%%').join(token), 'utf8');
    res.writeHead(200, { 'content-type': MIME[ext] || 'text/html; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store' });
    res.end(body);
    return true;
  }
  const abs = normalize(join(webRoot, ...rel.split('/').filter(Boolean)));
  if (!isInside(webRoot, abs)) { sendJson(res, 403, { ok: false, error: 'forbidden' }); return true; }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return false;
  let body = fs.readFileSync(abs);
  const ext = extname(abs).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  if (ext === '.html') body = Buffer.from(body.toString('utf8').split('%%WB_TOKEN%%').join(token), 'utf8');
  res.writeHead(200, {
    'content-type': type,
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
  return true;
}