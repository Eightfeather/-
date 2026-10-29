// 发布脚本：把当前版本打成一个 GitHub Release（exe 作为资产上传）
// 用法：
//   $env:GITHUB_TOKEN='ghp_xxx'; node tools/release.mjs            # 创建 tag + Release + 上传 zip
//   node tools/release.mjs --dry                                   # 只打印将要做什么
//   node tools/release.mjs --notes-file=docs/RELEASE-NOTES.md      # 用文件作为更新说明
// 约定：仓库源码不含二进制；每个版本 = 一个 tag（vX.Y.Z）+ 一个 Release（附 zip）

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_OWNER = 'Eightfeather';
const REPO_NAME = 'LetheCreatorWorkshop';
const API = 'https://api.github.com';

const argv = process.argv.slice(2);
const arg = (k, d = '') => {
  const hit = argv.find((a) => a === `--${k}` || a.startsWith(`--${k}=`));
  if (!hit) return d;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : '1';
};
const dry = arg('dry', '') === '1';

const devRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(devRoot, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(devRoot, 'package.json'), 'utf8'));
const version = String(pkg.version || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`package.json 版本号不合法：${version}`);

const tag = `v${version}`;
const exe = path.join(repoRoot, 'TheLetheWorkbench.exe');
if (!fs.existsSync(exe)) throw new Error(`找不到成品：${exe}（先跑 node tools/build-app.mjs）`);
const sizeMB = (fs.statSync(exe).size / 1048576).toFixed(1);

const zipName = `TheLetheWorkbench-v${version}-win-x64.zip`;
const zipPath = path.join(repoRoot, '.release', zipName);
fs.mkdirSync(path.dirname(zipPath), { recursive: true });

const notesFile = arg('notes-file', '');
const notes = notesFile && fs.existsSync(notesFile)
  ? fs.readFileSync(notesFile, 'utf8')
  : [
      `## The Lethe Workbench v${version}`,
      '',
      `- 成品：\`${zipName}\`（解压后双击 \`TheLetheWorkbench.exe\`）`,
      `- 依赖：Windows 10/11 x64 + .NET Framework 4.8 + WebView2 Runtime（系统一般自带）`,
      `- 源码：本仓库对应 tag \`${tag}\``,
      '',
      '### 本版变更',
      '- 见 commit 记录与 `开发资料/docs/04-验证记录.md` 对应小节',
    ].join('\n');

console.log(`[release] repo   ${REPO_OWNER}/${REPO_NAME}`);
console.log(`[release] tag    ${tag}`);
console.log(`[release] exe    ${exe} (${sizeMB} MB)`);
console.log(`[release] asset  ${zipName}`);

if (dry) {
  console.log('[release] --dry 模式：不打包、不打 tag、不联网');
  process.exit(0);
}

// 1) 打包
try { fs.rmSync(zipPath, { force: true }); } catch {}
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `Compress-Archive -LiteralPath '${exe}' -DestinationPath '${zipPath}' -Force`], { stdio: 'inherit' });
console.log(`[release] zip    ${zipPath} (${(fs.statSync(zipPath).size / 1048576).toFixed(1)} MB)`);

// 2) 确保 tag 指向当前 HEAD 并已推送
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
try {
  execFileSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { cwd: repoRoot, stdio: 'ignore' });
  console.log(`[release] tag 已存在：${tag}（复用）`);
} catch {
  execFileSync('git', ['tag', '-a', tag, '-m', `The Lethe Workbench ${tag}`], { cwd: repoRoot, stdio: 'inherit' });
  console.log(`[release] 已创建 tag ${tag} -> ${head.slice(0, 7)}`);
}
execFileSync('git', ['push', 'origin', `refs/tags/${tag}`], { cwd: repoRoot, stdio: 'inherit' });

// 3) 创建 Release（已存在则复用）
const token = process.env.GITHUB_TOKEN || '';
if (!token) {
  console.error('[release] 缺少 GITHUB_TOKEN：先设置后再跑，或手动在网页上创建 Release 并上传 zip');
  console.error(`[release] 已生成的 zip：${zipPath}`);
  process.exit(2);
}
const H = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
const api = async (p, init = {}) => {
  const res = await fetch(API + p, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${p} -> ${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
};

let rel = null;
try {
  rel = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`);
  console.log(`[release] Release 已存在：#${rel.id}`);
} catch {
  rel = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/releases`, {
    method: 'POST',
    body: JSON.stringify({ tag_name: tag, name: `The Lethe Workbench ${tag}`, body: notes, draft: false, prerelease: false }),
  });
  console.log(`[release] 已创建 Release：#${rel.id} ${rel.html_url}`);
}

// 4) 上传资产（同名则先删）
const existing = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/${rel.id}/assets`);
for (const a of existing || []) {
  if (a.name === zipName) {
    await api(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${a.id}`, { method: 'DELETE' });
    console.log(`[release] 删除同名旧资产 ${zipName}`);
  }
}
const buf = fs.readFileSync(zipPath);
const up = await fetch(`https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${rel.id}/assets?name=${encodeURIComponent(zipName)}`, {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/zip', 'Content-Length': String(buf.length) },
  body: buf,
});
if (!up.ok) throw new Error(`上传失败 ${up.status} ${(await up.text()).slice(0, 300)}`);
const asset = await up.json();
console.log(`[release] 已上传 ${asset.name} (${(asset.size / 1048576).toFixed(1)} MB)`);
console.log(`[release] 完成：${rel.html_url}`);
