import * as fs from 'node:fs';
import { join } from 'node:path';
import { writeFileAtomic } from '../atomic.mjs';
import { cleanName, SafetyError } from '../safety.mjs';
import { journalDir } from './state.mjs';
import { modDirSafe } from './mods.mjs';

/**
 * 编辑会话：撤销/重做栈 + 操作流水。
 * 栈的粒度是“编辑目标”（例如 personality:10101），同一目标的数据文件与本地化文件作为一个原子步骤。
 * 切目标即切栈；保存后清空；不跨重启。
 */
export class EditSession {
  constructor(rootOrFn) {
    this.getRoot = typeof rootOrFn === 'function' ? rootOrFn : () => rootOrFn;
    this.targets = new Map(); // `${mod}::${key}` -> {undo:[], redo:[], firstAt}
  }

  key(mod, key) { return `${mod}::${key}`; }

  target(mod, key, create = false) {
    const k = this.key(mod, key);
    let t = this.targets.get(k);
    if (!t && create) {
      t = { undo: [], redo: [], firstAt: Date.now(), mod, key };
      this.targets.set(k, t);
    }
    return t || null;
  }

  /** changes: [{rel, before, after}] */
  record(mod, key, label, changes) {
    if (!Array.isArray(changes) || !changes.length) return null;
    const t = this.target(mod, key, true);
    const op = { at: Date.now(), label, files: changes.map((c) => ({ rel: c.rel || null, abs: c.abs || null, before: c.before, after: c.after })) };
    t.undo.push(op);
    t.redo.length = 0;
    this.appendJournal(mod, op);
    return op;
  }

  journalPath(mod) {
    return join(journalDir(this.getRoot()), cleanName(mod, 'Mod 名称'), 'ops.jsonl');
  }

  appendJournal(mod, op) {
    try {
      const p = this.journalPath(mod);
      fs.mkdirSync(join(p, '..'), { recursive: true });
      fs.appendFileSync(p, JSON.stringify(op) + '\n', 'utf8');
    } catch { /* 流水失败不影响编辑 */ }
  }

  state(mod) {
    const prefix = `${mod}::`;
    let undo = 0;
    let redo = 0;
    let firstAt = null;
    const keys = [];
    for (const [k, t] of this.targets) {
      if (!k.startsWith(prefix)) continue;
      keys.push({ key: t.key, undo: t.undo.length, redo: t.redo.length });
      undo += t.undo.length;
      redo += t.redo.length;
      if (t.undo.length && (!firstAt || t.firstAt < firstAt)) firstAt = t.firstAt;
    }
    return { mod, dirty: undo > 0, undo, redo, firstDirtyAt: firstAt ? new Date(firstAt).toISOString() : null, keys };
  }

  canUndo(mod, key) {
    const t = this.target(mod, key);
    return Boolean(t && t.undo.length);
  }

  canRedo(mod, key) {
    const t = this.target(mod, key);
    return Boolean(t && t.redo.length);
  }

  _apply(op, direction) {
    const dir = modDirSafe(this.getRoot(), op.modName);
    const target = direction === 'undo' ? 'before' : 'after';
    const files = op.files;
    // 先整体校验，避免撤一半
    for (const f of files) {
      const abs = f.abs || join(dir, String(f.rel).split('/').join('\\'));
      let cur = null;
      try { cur = fs.readFileSync(abs, 'utf8'); } catch { cur = null; }
      const expect = direction === 'undo' ? f.after : f.before;
      if ((cur === null ? null : cur) !== expect) {
        throw new SafetyError('撤回失效：文件内容已被外部修改，无法安全回退');
      }
    }
    for (const f of files) {
      const abs = f.abs || join(dir, String(f.rel).split('/').join('\\'));
      const content = f[target];
      if (content === null) { try { fs.rmSync(abs, { force: true }); } catch { /* ignore */ } }
      else writeFileAtomic(abs, content);
    }
  }

  undo(mod, key) {
    const t = this.target(mod, key);
    if (!t || !t.undo.length) throw new SafetyError('没有可撤销的操作');
    const op = t.undo[t.undo.length - 1];
    op.modName = mod;
    this._apply(op, 'undo');
    t.undo.pop();
    t.redo.push(op);
    return { ok: true, label: op.label, undo: t.undo.length, redo: t.redo.length };
  }

  redo(mod, key) {
    const t = this.target(mod, key);
    if (!t || !t.redo.length) throw new SafetyError('没有可重做的操作');
    const op = t.redo[t.redo.length - 1];
    op.modName = mod;
    this._apply(op, 'redo');
    t.redo.pop();
    t.undo.push(op);
    return { ok: true, label: op.label, undo: t.undo.length, redo: t.redo.length };
  }

  /** 保存成功后清空该目标（或整个 Mod）的栈 */
  clear(mod, key) {
    if (key) {
      const t = this.target(mod, key);
      if (t) { t.undo.length = 0; t.redo.length = 0; t.firstAt = Date.now(); }
      return;
    }
    for (const k of [...this.targets.keys()]) if (k.startsWith(`${mod}::`)) this.targets.delete(k);
  }

  /** 未保存改动最早的编辑时间（用于 30 分钟计时） */
  firstDirtyAt(mod) {
    const st = this.state(mod);
    return st.firstDirtyAt;
  }
}