import * as fs from 'node:fs';
import { join } from 'node:path';
import { BACKUP_DIRNAME, readJson, writeFileAtomic } from '../atomic.mjs';

export const STATE_NAME = 'state.json';
export const DEFAULT_EDITOR_NAME = '但丁';

export function workbenchDir(letheRoot) { return join(letheRoot, BACKUP_DIRNAME); }
export function statePath(letheRoot) { return join(workbenchDir(letheRoot), STATE_NAME); }
export function disabledModsDir(letheRoot) { return join(workbenchDir(letheRoot), 'disabled', 'mods'); }
export function disabledDllsDir(letheRoot) { return join(workbenchDir(letheRoot), 'disabled', 'dlls'); }

/** 目录拆分：backups/用户保存、backups/自动保存、journal（内部回滚与操作流水） */
export function backupsRoot(letheRoot) { return join(workbenchDir(letheRoot), 'backups'); }
export function userBackupsDir(letheRoot) { return join(backupsRoot(letheRoot), '用户保存'); }
export function autoBackupsDir(letheRoot) { return join(backupsRoot(letheRoot), '自动保存'); }
export function journalDir(letheRoot) { return join(workbenchDir(letheRoot), 'journal'); }
export function dllBackupsDir(letheRoot) { return join(workbenchDir(letheRoot), 'backups', 'DLL'); }

export function readState(letheRoot) {
  const st = readJson(statePath(letheRoot), null);
  return {
    version: 2,
    disabledMods: {},
    disabledDlls: {},
    editorName: DEFAULT_EDITOR_NAME,
    ...(st || {}),
  };
}

export function writeState(letheRoot, state) {
  fs.mkdirSync(workbenchDir(letheRoot), { recursive: true });
  writeFileAtomic(statePath(letheRoot), JSON.stringify(state, null, 2));
  return state;
}

export function updateState(letheRoot, fn) {
  const next = fn(readState(letheRoot));
  return writeState(letheRoot, next);
}

/** 运行标记：用于检测“软件未被正常关闭” */
export function sessionMarkerPath(letheRoot) { return join(workbenchDir(letheRoot), 'session.json'); }

export function markRunning(letheRoot) {
  if (!letheRoot) return null;
  fs.mkdirSync(workbenchDir(letheRoot), { recursive: true });
  const prev = readJson(sessionMarkerPath(letheRoot), null);
  const next = { pid: process.pid, startedAt: new Date().toISOString(), running: true, unclean: Boolean(prev && prev.running) };
  writeFileAtomic(sessionMarkerPath(letheRoot), JSON.stringify(next, null, 2));
  return next;
}

export function markCleanExit(letheRoot) {
  if (!letheRoot) return;
  const prev = readJson(sessionMarkerPath(letheRoot), null);
  if (!prev) return;
  writeFileAtomic(sessionMarkerPath(letheRoot), JSON.stringify({ ...prev, running: false, exitedAt: new Date().toISOString() }, null, 2));
}

export function readSessionMarker(letheRoot) {
  if (!letheRoot) return null;
  return readJson(sessionMarkerPath(letheRoot), null);
}