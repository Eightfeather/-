import * as fs from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/** 编辑器数据根目录名（位于私服 Lethe 目录下，每个私服一份，天然隔离） */
export const LCW_NAME = 'LCW';
/** 旧版内部目录（迁到 LCW 后即可删除，仅作为迁移来源） */
export const LEGACY_NAME = '.lethe-workbench';

export function lcwDir(letheRoot) { return join(letheRoot, LCW_NAME); }
export function legacyDir(letheRoot) { return join(letheRoot, LEGACY_NAME); }

export function projectsDir(letheRoot) { return join(lcwDir(letheRoot), 'projects'); }
export function backupsDir(letheRoot) { return join(lcwDir(letheRoot), 'backups'); }
export function userBackupsDir(letheRoot) { return join(backupsDir(letheRoot), '用户保存'); }
export function autoBackupsDir(letheRoot) { return join(backupsDir(letheRoot), '自动保存'); }
export function dllBackupsDir(letheRoot) { return join(backupsDir(letheRoot), 'DLL'); }
export function journalDir(letheRoot) { return join(lcwDir(letheRoot), 'journal'); }
export function exportsDir(letheRoot) { return join(lcwDir(letheRoot), 'exports'); }
export function logsDir(letheRoot) { return join(lcwDir(letheRoot), 'logs'); }
export function statePath(letheRoot) { return join(lcwDir(letheRoot), 'state.json'); }
export function sessionPath(letheRoot) { return join(lcwDir(letheRoot), 'session.json'); }
export function appDir(letheRoot) { return join(lcwDir(letheRoot), '_app'); }
export function configPath(letheRoot) { return join(appDir(letheRoot), 'config.json'); }

export const README_TEXT = [
  'The Lethe Workbench · 数据目录说明',
  '',
  '本目录下的内容都由编辑器生成、维护，位于当前私服内，换私服不会串数据。',
  '',
  '目录用途（全部「用到才建」）：',
  '  projects/     设计态数据：模块积木、人格/技能/被动/Buff 的编辑元数据与手改标记。',
  '                ★ 不要手动删除，删了会丢失编辑器内的设计。',
  '  backups/      备份。用户保存/<Mod>_<YYYYMMDD> 为你手动备份的整份 Mod；',
  '                自动保存/<Mod> 为 30 分钟自动快照（单槽覆盖）；DLL 为插件备份。',
  '                ☆ 可删，但删了就没法回滚。',
  '  journal/      撤销流水与写盘回滚副本（崩溃恢复用）。',
  '                ★ 编辑器运行期间不要动；不运行时删除只是让撤销历史丢失。',
  '  disabled/     被禁用、暂时移出 mods/ 的 Mod（disabled/mods）与被禁用的插件（disabled/dlls）。',
  '                ★ 不要手动删，删了这些 Mod 就找不回来了（可在编辑器「Mod 管理」里重新启用）。',
  '  exports/      将来「导出到 Mod」的产物目录（现在未启用）。',
  '  logs/         编辑器侧日志（迁移、写盘失败等）。',
  '  state.json    编辑器状态（编辑器名、哪些 Mod/DLL 被禁用）。',
  '  session.json  上次是否正常关闭的标记。',
  '  _app/         随私服保存的编辑器配置（config.json）。',
  '',
  '注意：真正的 Mod 数据仍然在 mods/<Mod>/ 下，本目录不复制任何游戏文件。',
  '',
].join('\r\n');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readIfExists(p) {
  try { return fs.readFileSync(p); } catch { return null; }
}

/** 移动（同卷 rename，跨卷复制后删除）；目标已存在时递归合并而非覆盖 */
export function moveOrMerge(src, dst) {
  if (!fs.existsSync(src)) return false;
  if (!fs.existsSync(dst)) {
    try {
      ensureDir(join(dst, '..'));
      fs.renameSync(src, dst);
      return true;
    } catch {
      fs.cpSync(src, dst, { recursive: true });
      fs.rmSync(src, { recursive: true, force: true });
      return true;
    }
  }
  // 合并：目录递归、文件后写覆盖
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(src)) moveOrMerge(join(src, name), join(dst, name));
    try { fs.rmdirSync(src); } catch { /* 非空则保留 */ }
  } else {
    ensureDir(join(dst, '..'));
    fs.copyFileSync(src, dst);
    fs.rmSync(src, { force: true });
  }
  return true;
}

function rmIfEmpty(dir) {
  try { if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch { /* ignore */ }
}

/** 写入 README（只在 LCW 真正建立时写一次） */
export function writeReadme(letheRoot) {
  const p = join(lcwDir(letheRoot), 'README.txt');
  if (fs.existsSync(p)) return p;
  ensureDir(lcwDir(letheRoot));
  fs.writeFileSync(p, README_TEXT, 'utf8');
  return p;
}

/** 懒创建某个分类目录（自动带上 README） */
export function ensureLcwPart(letheRoot, part) {
  writeReadme(letheRoot);
  const map = {
    projects: () => projectsDir(letheRoot),
    backups: () => backupsDir(letheRoot),
    exports: () => exportsDir(letheRoot),
    logs: () => logsDir(letheRoot),
    journal: () => journalDir(letheRoot),
  };
  const fn = map[part];
  return fn ? ensureDir(fn()) : ensureDir(lcwDir(letheRoot));
}

function appendLog(letheRoot, line) {
  try {
    ensureDir(logsDir(letheRoot));
    fs.appendFileSync(join(logsDir(letheRoot), 'migrate.log'), `${new Date().toISOString()} ${line}\n`, 'utf8');
  } catch { /* ignore */ }
}

/**
 * 把旧位置的数据搬进 LCW，成功即删除旧位置。
 * 旧位置：<Lethe>/.lethe-workbench/{backups,journal,session.json,state.json,meta}
 *        %LOCALAPPDATA%/LetheWorkbench/projects/<sha1(letheRoot)>
 * 幂等：没东西可搬时直接返回。
 */
export function migrateToLcw(letheRoot, log) {
  if (!letheRoot) return { moved: [], removed: [], error: '' };
  const moved = [];
  const removed = [];
  const report = (m) => { appendLog(letheRoot, m); log?.(`[lcw] ${m}`); };
  try {
    const legacy = legacyDir(letheRoot);
    const pairs = [
      [join(legacy, 'backups'), backupsDir(letheRoot)],
      [join(legacy, 'journal'), journalDir(letheRoot)],
      [join(legacy, 'meta'), projectsDir(letheRoot)],
      [join(legacy, 'disabled'), join(lcwDir(letheRoot), 'disabled')],
      [join(legacy, 'session.json'), sessionPath(letheRoot)],
      [join(legacy, 'state.json'), statePath(letheRoot)],
    ];
    for (const [src, dst] of pairs) {
      if (!fs.existsSync(src)) continue;
      ensureDir(lcwDir(letheRoot));
      if (moveOrMerge(src, dst)) { moved.push(src); report(`迁移 ${src} -> ${dst}`); }
    }
    // C 盘设计态数据
    const base = process.env.LOCALAPPDATA || '';
    if (base) {
      const h = createHash('sha1').update(String(letheRoot).toLowerCase()).digest('hex').slice(0, 12);
      const cProjects = join(base, 'LetheWorkbench', 'projects', h);
      if (fs.existsSync(cProjects)) {
        if (moveOrMerge(cProjects, projectsDir(letheRoot))) {
          moved.push(cProjects);
          report(`迁移 ${cProjects} -> ${projectsDir(letheRoot)}`);
        }
        rmIfEmpty(join(base, 'LetheWorkbench', 'projects'));
      }
    }
    // 清理旧目录（搬空后连根目录一起删）
    for (const d of [join(legacy, 'backups'), join(legacy, 'journal'), join(legacy, 'meta'), join(legacy, 'disabled')]) {
      if (fs.existsSync(d)) { fs.rmSync(d, { recursive: true, force: true }); removed.push(d); }
    }
    for (const f of [join(legacy, 'session.json'), join(legacy, 'state.json')]) {
      if (fs.existsSync(f)) { fs.rmSync(f, { force: true }); removed.push(f); }
    }
    rmIfEmpty(legacy);
    if (fs.existsSync(legacy)) report('旧目录仍有残留，未删除：' + legacy);
    else if (removed.length) removed.push(legacy);
    if (removed.length) report(`已删除旧位置：${removed.join(' , ')}`);
    if (moved.length) writeReadme(letheRoot);
    return { moved, removed, error: '' };
  } catch (e) {
    report(`迁移失败：${e && e.message ? e.message : e}`);
    return { moved, removed, error: String(e && e.message ? e.message : e) };
  }
}
