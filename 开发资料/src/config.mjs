import * as fs from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT, DATA_DIRS, DEFAULT_CONFIG, IS_SEA, USER_DATA_DIR, normalizePath } from './paths.mjs';

export const CONFIG_NAME = 'config.json';

export function configCandidates() {
  const extra = process.env.LETHE_WB_HOME ? [normalizePath(process.env.LETHE_WB_HOME)] : [];
  // 单文件形态下 APP_ROOT 是每次运行解包出的临时目录，配置必须落在持久目录
  const dirs = IS_SEA
    ? [...extra, USER_DATA_DIR, APP_ROOT, ...DATA_DIRS]
    : [...extra, APP_ROOT, USER_DATA_DIR, ...DATA_DIRS];
  const seen = new Set();
  const out = [];
  for (const dir of dirs) {
    if (!dir) continue;
    const p = join(dir, CONFIG_NAME);
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

export function loadConfig() {
  for (const p of configCandidates()) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      return { ...DEFAULT_CONFIG, ...data, configPath: p };
    } catch { /* try next */ }
  }
  return { ...DEFAULT_CONFIG, configPath: configCandidates()[0] };
}

function writeTo(p, cfg) {
  fs.mkdirSync(join(p, '..'), { recursive: true });
  if (fs.existsSync(p)) {
    try { fs.copyFileSync(p, `${p}.bak`); } catch { /* ignore */ }
  }
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, p);
  return p;
}

export function saveConfig(patch) {
  const cfg = { ...loadConfig(), ...patch };
  delete cfg.configPath;
  const order = [cfg.configPath, ...configCandidates()].filter(Boolean);
  let lastErr = null;
  for (const p of order) {
    try { return { ...cfg, configPath: writeTo(p, cfg) }; } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error('无法写入配置文件');
}

export function rememberRoot(root) {
  const cfg = loadConfig();
  const list = [normalizePath(root), ...(cfg.recentRoots || []).map(normalizePath)]
    .filter((v, i, a) => v && a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
    .slice(0, 8);
  return saveConfig({ recentRoots: list });
}
export function configPath() {
  return loadConfig().configPath;
}
