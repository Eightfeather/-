/** 打包形态下的虚拟资源（单文件 exe 里没有 src/web 目录可读） */
let VIRTUAL = null;

export function setAssets(map) { VIRTUAL = map || null; }

export function hasVirtualAssets() { return Boolean(VIRTUAL && Object.keys(VIRTUAL).length); }

export function assetKeys() { return VIRTUAL ? Object.keys(VIRTUAL) : []; }

/** key 例如 web/index.html / data/timings.json */
export function assetText(key) {
  if (!VIRTUAL) return null;
  const v = VIRTUAL[key];
  return typeof v === 'string' ? v : null;
}