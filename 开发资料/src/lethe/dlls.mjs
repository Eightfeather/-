import * as fs from 'node:fs';
import { join } from 'node:path';
import { cleanName, SafetyError } from '../safety.mjs';
import { updateState } from './state.mjs';

const DISABLED = '.disabled';

export function pluginsDir(gameRoot) { return join(gameRoot, 'BepInEx', 'plugins'); }

export function listDlls(gameRoot) {
  const dir = pluginsDir(gameRoot);
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const lower = e.name.toLowerCase();
    const enabled = lower.endsWith('.dll');
    const disabled = lower.endsWith('.dll.disabled');
    if (!enabled && !disabled) continue;
    const abs = join(dir, e.name);
    let st = null;
    try { st = fs.statSync(abs); } catch { continue; }
    out.push({
      file: e.name,
      base: enabled ? e.name : e.name.slice(0, -DISABLED.length),
      enabled,
      size: st.size,
      mtime: st.mtimeMs,
      dir,
    });
  }
  return out.sort((a, b) => a.base.localeCompare(b.base, 'en'));
}

export function setDllEnabled(gameRoot, file, enabled) {
  const dir = pluginsDir(gameRoot);
  const name = cleanName(file, 'DLL 文件名');
  if (!/\.dll(\.disabled)?$/i.test(name)) throw new SafetyError('只接受 .dll / .dll.disabled 文件');
  const base = name.replace(/\.disabled$/i, '');
  const from = join(dir, enabled ? `${base}.disabled` : base);
  const to = join(dir, enabled ? base : `${base}.disabled`);
  if (!fs.existsSync(from)) throw new SafetyError(`文件不存在：${from}`);
  if (fs.existsSync(to)) throw new SafetyError(`目标已存在：${to}`);
  fs.renameSync(from, to);
  updateState(dirnameOfLethe(dir), (st) => {
    const next = { ...st, disabledDlls: { ...st.disabledDlls } };
    if (enabled) delete next.disabledDlls[base]; else next.disabledDlls[base] = { at: new Date().toISOString() };
    return next;
  });
  return { file: to.split('\\').pop(), enabled };
}

function dirnameOfLethe(pluginsPath) {
  // <gameRoot>/BepInEx/plugins → <gameRoot>/BepInEx/plugins/Lethe
  return join(pluginsPath, 'Lethe');
}