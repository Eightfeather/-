import { join } from 'node:path';
import { autoBackupsDir, readState, writeState } from './state.mjs';
import { resolveModDir } from './mods.mjs';
import { mirrorMod, slotInfo } from './snapshot.mjs';

export const AUTOSAVE_INTERVAL_MS = 30 * 60 * 1000;

/**
 * 自动快照调度：从该 Mod 第一次被改动起算，每 30 分钟一次；
 * 只在还有未保存改动时执行；结果写 state.json 供前端显示左下角提示。
 */
export class AutoSaver {
  constructor({ session, getLetheRoot, log }) {
    this.session = session;
    this.getLetheRoot = getLetheRoot;
    this.log = log;
    this.timers = new Map();
    this.logs = [];
  }

  touch(mod) {
    const letheRoot = this.getLetheRoot();
    if (!letheRoot || !mod) return;
    if (this.timers.has(mod)) return;
    const timer = setTimeout(() => this.run(mod), AUTOSAVE_INTERVAL_MS);
    if (timer.unref) timer.unref();
    this.timers.set(mod, timer);
  }

  runNow(mod) {
    const letheRoot = this.getLetheRoot();
    if (!letheRoot) return { ok: false, reason: 'no-root' };
    const st = this.session.state(mod);
    if (!st.dirty) return { ok: false, reason: 'clean' };
    const { dir } = resolveModDir(letheRoot, mod);
    const slot = join(autoBackupsDir(letheRoot), mod);
    const result = mirrorMod(dir, slot);
    const at = new Date().toISOString();
    this.logs.unshift({ mod, at, files: result.files, bytes: result.bytes, copied: result.copied, linked: result.linked, ms: result.ms });
    this.logs = this.logs.slice(0, 20);
    try {
      const state = readState(letheRoot);
      writeState(letheRoot, {
        ...state,
        autoSave: { ...(state.autoSave || {}), [mod]: { at, files: result.files, bytes: result.bytes } },
      });
    } catch { /* ignore */ }
    this.log?.(`自动快照：${mod} · ${result.files} 文件 · ${result.copied} 复制 / ${result.linked} 链接 · ${result.ms}ms`);
    return { ok: true, ...result, at };
  }

  run(mod) {
    this.timers.delete(mod);
    let result = { ok: false };
    try { result = this.runNow(mod); } catch (err) { this.logs.unshift({ mod, at: new Date().toISOString(), error: err.message }); }
    if (this.session.state(mod).dirty) this.touch(mod);
    return result;
  }

  stop(mod) {
    const t = this.timers.get(mod);
    if (t) { clearTimeout(t); this.timers.delete(mod); }
  }

  stopAll() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  status() {
    return this.logs.slice(0, 10);
  }

  slot(mod) {
    const letheRoot = this.getLetheRoot();
    if (!letheRoot) return null;
    return slotInfo(join(autoBackupsDir(letheRoot), mod));
  }
}