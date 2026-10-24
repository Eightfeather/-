import * as fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { readJson, writeFileAtomic } from '../atomic.mjs';
import { cleanName, SafetyError } from '../safety.mjs';
import { readModPayload, resolveModDir } from './mods.mjs';
import { backupsRoot, dllBackupsDir, userBackupsDir } from './state.mjs';
import { pluginsDir } from './dlls.mjs';

export function dayStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function sizeOf(dir) {
  let bytes = 0;
  let files = 0;
  const walk = (p) => {
    let entries = [];
    try { entries = fs.readdirSync(p, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const abs = join(p, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.isFile()) { try { bytes += fs.statSync(abs).size; files += 1; } catch { /* ignore */ } }
    }
  };
  walk(dir);
  return { bytes, files };
}

function dirsOf(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { return []; }
}

/** 手动备份：backups/用户保存/<Mod名>_<YYYYMMDD>[_n] */
export function createUserBackup(letheRoot, modName) {
  const { dir: src } = resolveModDir(letheRoot, modName);
  const base = userBackupsDir(letheRoot);
  fs.mkdirSync(base, { recursive: true });
  const day = dayStamp();
  let label = `${modName}_${day}`;
  let n = 2;
  while (fs.existsSync(join(base, label))) { label = `${modName}_${day}_${n}`; n += 1; }
  const dest = join(base, label);
  fs.cpSync(src, dest, { recursive: true });
  const info = sizeOf(dest);
  return { label, dir: dest, kind: 'user', at: new Date().toISOString(), ...info };
}

/** 兼容旧版扁平布局（backups/<label>）与新版（backups/用户保存/<label>） */
export function listUserBackups(letheRoot, modName) {
  const prefix = `${modName}_`;
  const out = [];
  const scan = (root, kind) => {
    for (const d of dirsOf(root)) {
      if (!d.name.startsWith(prefix)) continue;
      const abs = join(root, d.name);
      let st = null;
      try { st = fs.statSync(abs); } catch { continue; }
      out.push({ label: d.name, dir: abs, kind, at: st.mtime.toISOString(), ...sizeOf(abs) });
    }
  };
  scan(userBackupsDir(letheRoot), 'user');
  scan(backupsRoot(letheRoot), 'legacy');
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export function findBackup(letheRoot, modName, label) {
  const clean = String(label);
  const all = listUserBackups(letheRoot, modName);
  const hit = all.find((b) => b.label === clean);
  if (!hit) throw new SafetyError(`找不到这个备份：${label}`);
  return hit;
}

/** 只读查看备份里的人格尔等摘要 */
export function readBackupPayload(letheRoot, modName, label) {
  const b = findBackup(letheRoot, modName, label);
  const payload = readModPayload(b.dir);
  return {
    label: b.label,
    dir: b.dir,
    at: b.at,
    bytes: b.bytes,
    files: b.files,
    personalities: payload.personalities,
    categories: Object.keys(payload.data),
  };
}

/**
 * 当前版本 ↔ 备份 互换（两步 rename，失败回滚）。
 * 返回两个位置的实际名字，供确认弹窗展示。
 */
export function swapBackup(letheRoot, modName, label) {
  const current = resolveModDir(letheRoot, modName);
  const backup = findBackup(letheRoot, modName, label);
  const parent = dirname(current.dir);
  const tmp = join(parent, `.swap-${cleanName(modName)}-${Date.now()}`);
  const steps = [];
  try {
    fs.renameSync(current.dir, tmp);
    steps.push(() => fs.renameSync(tmp, current.dir));
    fs.renameSync(backup.dir, current.dir);
    steps.push(() => fs.renameSync(current.dir, backup.dir));
    fs.renameSync(tmp, backup.dir);
  } catch (err) {
    for (const undo of steps.reverse()) { try { undo(); } catch { /* ignore */ } }
    throw err;
  }
  return {
    ok: true,
    current: { label: modName, dir: current.dir },
    backup: { label, dir: backup.dir },
    note: '两个版本已互换位置：当前版本与备份的实际文件夹名如下',
  };
}

/* ---------- DLL 备份 ---------- */

export function createDllBackup(gameRoot, letheRoot, file) {
  const src = join(pluginsDir(gameRoot), basename(file));
  if (!fs.existsSync(src)) throw new SafetyError(`DLL 不存在：${file}`);
  const base = basename(file).replace(/\.dll(\.disabled)?$/i, '');
  const label = `${base}_${dayStamp()}`;
  const dest = join(dllBackupsDir(letheRoot), label);
  fs.mkdirSync(dest, { recursive: true });
  const destFile = join(dest, basename(file));
  fs.copyFileSync(src, destFile);
  writeFileAtomic(join(dest, 'backup.json'), JSON.stringify({
    label, file: basename(file), from: src, at: new Date().toISOString(), size: fs.statSync(src).size,
  }, null, 2));
  return { label, dir: dest, file: destFile, size: fs.statSync(src).size };
}

export function listDllBackups(letheRoot, file) {
  const base = basename(String(file || '')).replace(/\.dll(\.disabled)?$/i, '');
  const prefix = `${base}_`;
  const out = [];
  for (const d of dirsOf(dllBackupsDir(letheRoot))) {
    if (base && !d.name.startsWith(prefix)) continue;
    const abs = join(dllBackupsDir(letheRoot), d.name);
    let st = null;
    try { st = fs.statSync(abs); } catch { continue; }
    const meta = readJson(join(abs, 'backup.json'), null) || {};
    out.push({ label: d.name, dir: abs, at: meta.at || st.mtime.toISOString(), size: meta.size || 0, file: meta.file || '' });
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}