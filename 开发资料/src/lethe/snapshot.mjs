import * as fs from 'node:fs';
import { join } from 'node:path';
import { readJson, writeFileAtomic } from '../atomic.mjs';

const HARD_LINK_MIN = 8 * 1024 * 1024; // 8MB 以上且未改动的文件走硬链接
const MANIFEST = 'manifest.json';

function walk(dir, base = '', out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, rel, out);
    else if (e.isFile()) {
      try { out.push({ rel, abs, size: fs.statSync(abs).size, mtimeMs: Math.round(fs.statSync(abs).mtimeMs) }); }
      catch { /* skip */ }
    }
  }
  return out;
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

/**
 * 自动快照：把整个 Mod 镜像到单槽目录。
 * - 未改动且 >= 8MB 的文件用硬链接（同卷零拷贝）；改动过的文件复制。
 * - 槽内多出来的文件删除，保证“与手动备份无异”的完整镜像。
 */
export function mirrorMod(sourceDir, slotDir) {
  const started = Date.now();
  ensureDir(slotDir);
  const src = walk(sourceDir).filter((f) => f.rel !== MANIFEST);
  const prev = readJson(join(slotDir, MANIFEST), null) || { files: {} };
  const prevFiles = prev.files || {};
  const next = { version: 1, at: new Date().toISOString(), files: {} };
  let copied = 0;
  let linked = 0;
  let kept = 0;
  let bytes = 0;

  for (const f of src) {
    const dest = join(slotDir, f.rel.split('/').join('\\'));
    const old = prevFiles[f.rel];
    const destExists = fs.existsSync(dest);
    const unchanged = Boolean(old && old.size === f.size && old.mtimeMs === f.mtimeMs && destExists);
    if (unchanged) {
      kept += 1;
      bytes += f.size;
      next.files[f.rel] = { size: f.size, mtimeMs: f.mtimeMs, ...(old.link ? { link: true } : {}) };
      continue;
    }
    ensureDir(join(dest, '..'));
    try { if (destExists) fs.rmSync(dest, { force: true }); } catch { /* ignore */ }
    let mode = 'copy';
    if (f.size >= HARD_LINK_MIN) {
      try { fs.linkSync(f.abs, dest); mode = 'link'; } catch { mode = 'copy'; }
    }
    if (mode === 'copy') fs.copyFileSync(f.abs, dest);
    if (mode === 'link') linked += 1; else copied += 1;
    bytes += f.size;
    next.files[f.rel] = { size: f.size, mtimeMs: f.mtimeMs, ...(mode === 'link' ? { link: true } : {}) };
  }

  // 删除源里已不存在的文件
  let removed = 0;
  for (const rel of Object.keys(prevFiles)) {
    if (next.files[rel]) continue;
    const dest = join(slotDir, rel.split('/').join('\\'));
    try { fs.rmSync(dest, { force: true }); removed += 1; } catch { /* ignore */ }
  }

  next.bytes = bytes;
  next.files = next.files;
  writeFileAtomic(join(slotDir, MANIFEST), JSON.stringify({ ...next, count: src.length }, null, 2));
  return {
    ok: true,
    dir: slotDir,
    at: next.at,
    files: src.length,
    bytes,
    copied,
    linked,
    kept,
    removed,
    ms: Date.now() - started,
  };
}

export function slotInfo(slotDir) {
  const man = readJson(join(slotDir, MANIFEST), null);
  if (!man) return null;
  return { at: man.at, files: man.count || Object.keys(man.files || {}).length, bytes: man.bytes || 0 };
}
/** 从快照槽恢复回 Mod 目录（文件级覆盖；多出来的文件删除） */
export function restoreFromSlot(slotDir, targetDir) {
  if (!fs.existsSync(slotDir)) throw new Error('快照不存在：' + slotDir);
  const files = walk(slotDir).filter((f) => f.rel !== MANIFEST);
  const live = new Set(walk(targetDir).map((f) => f.rel));
  let restored = 0;
  for (const f of files) {
    const dest = join(targetDir, f.rel.split('/').join('\\'));
    ensureDir(join(dest, '..'));
    fs.copyFileSync(f.abs, dest);
    live.delete(f.rel);
    restored += 1;
  }
  let removed = 0;
  for (const rel of live) {
    try { fs.rmSync(join(targetDir, rel.split('/').join('\\')), { force: true }); removed += 1; } catch { /* ignore */ }
  }
  return { ok: true, restored, removed, at: new Date().toISOString() };
}