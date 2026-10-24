import * as fs from 'node:fs';
import { join } from 'node:path';
import { listMods } from './mods.mjs';
import { listDlls } from './dlls.mjs';
import { readState } from './state.mjs';

/** 名片五项统计：编辑者 / 编辑器名 / Mod 数（含禁用、不含备份）/ DLL 数 / 所有 Mod 体积 */
export function homeStats(letheRoot, gameRoot) {
  const st = readState(letheRoot);
  let mods = [];
  let dlls = [];
  try { mods = listMods(letheRoot); } catch { mods = []; }
  try { dlls = listDlls(gameRoot); } catch { dlls = []; }
  const bytes = mods.reduce((n, m) => n + (Number(m.bytes) || 0), 0);
  return {
    editorName: st.editorName || '但丁',
    editorTitle: '边狱工作台 Limbus Workshop',
    modCount: mods.length,
    modEnabled: mods.filter((m) => m.enabled).length,
    dllCount: dlls.length,
    dllEnabled: dlls.filter((d) => d.enabled).length,
    bytes,
    pluginsDir: join(gameRoot || '', 'BepInEx', 'plugins'),
    letheRoot: letheRoot || '',
    gameRoot: gameRoot || '',
  };
}