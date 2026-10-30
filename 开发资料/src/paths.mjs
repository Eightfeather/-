import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 是否运行在打包后的单文件形态（SEA / 内嵌运行时） */
export const IS_SEA = process.env.LETHE_WB_SEA === '1' || !/node(\.exe)?$/i.test(process.execPath);

/** 应用根目录：开发态 = 项目根；单文件 = exe 所在目录 */
export const APP_ROOT = process.env.LETHE_WB_APP_ROOT
  ? resolve(process.env.LETHE_WB_APP_ROOT)
  : IS_SEA
    ? dirname(process.execPath)
    : resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 源码目录（开发态有效；SEA 下回退到 APP_ROOT） */
export const SRC_DIR = (() => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return APP_ROOT;
  }
})();

const HOME = process.env.USERPROFILE || process.env.HOME || process.cwd();
export const USER_DATA_DIR = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'LetheWorkbench')
  : join(HOME, '.lethe-creator-workshop');

export const LOG_DIR = join(USER_DATA_DIR, 'logs');
export const RUNTIME_DIR = join(USER_DATA_DIR, 'runtime');

/** 配置候选目录 */
export const DATA_DIRS = [
  process.env.LETHE_WB_HOME && resolve(process.env.LETHE_WB_HOME),
  APP_ROOT,
  USER_DATA_DIR,
].filter(Boolean);

export const DEFAULT_CONFIG = {
  version: 1,
  gameRoot: '',
  letheRoot: '',
  recentRoots: [],
  theme: 'dark',
};

export function normalizePath(p) {
  return resolve(String(p || '')).replace(/[\\/]+$/, '');
}

/** Windows 路径比较用的全小写归一 */
export function pathKey(p) {
  return normalizePath(p).toLowerCase().split(sep).join('/');
}