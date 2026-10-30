/* 生成原版 UI 切图样式：把 ui-assets.css 里内嵌的 52 张图按用途拆成多个 css 文件。
 * 用法：
 *   node tools/gen-ui-assets.cjs                 # 只按现有 data URI 拆分（默认）
 *   node tools/gen-ui-assets.cjs --from "E:\辅助文件\Mod编辑器\UI素材"   # 尝试从原图重新编码
 * 设计说明：
 *   - 打包脚本（tools/build-server.mjs）只把 src/web 下的文本资源内联进单文件 exe，
 *     二进制资源必须写成 data URI，所以这里仍输出 base64。
 *   - 输出：src/web/ui-assets/{frames,dock,nav,sinner-cards,sinner-emblems,misc}.css + manifest.json
 *   - index.html 逐个 <link> 引入这些文件（不用 @import，避免相对路径解析问题）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'src', 'web');
const OUT = path.join(WEB, 'ui-assets');
const SRC_CSS = path.join(WEB, 'ui-assets.css');

const fromArg = process.argv.find((a) => a.startsWith('--from=')) || process.argv[process.argv.indexOf('--from') + 1];
const FROM = typeof fromArg === 'string' && fromArg.startsWith('--from=') ? fromArg.slice(7) : (process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : '');

const GROUPS = [
  { key: 'frames', title: '面板/卡片/边框', test: (n) => n.startsWith('frame-') },
  { key: 'dock', title: '底栏与铭牌', test: (n) => n.startsWith('dock-') },
  { key: 'nav', title: '导航图标与按键', test: (n) => n.startsWith('nav-') },
  { key: 'sinner-cards', title: '罪人头像卡', test: (n) => n.startsWith('sinner-card') },
  { key: 'sinner-emblems', title: '罪人纹章', test: (n) => n.startsWith('sinner-emblem') },
  { key: 'misc', title: '其它切图', test: () => true },
];

function groupOf(name) {
  for (const g of GROUPS) if (g.test(name)) return g.key;
  return 'misc';
}

function normName(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }

function collectFromFile(dir, out, depth = 0) {
  if (depth > 6 || !fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) collectFromFile(p, out, depth + 1);
    else if (/\.(png|jpg|jpeg|webp)$/i.test(ent.name)) out.push(p);
  }
}

function main() {
  if (!fs.existsSync(SRC_CSS)) {
    console.error('缺少源文件：' + SRC_CSS);
    process.exit(1);
  }
  const css = fs.readFileSync(SRC_CSS, 'utf8');
  const re = /--ui-([a-z0-9-]+)\s*:\s*url\("(data:[^"]+)"\)\s*;?/g;
  const items = [];
  let m;
  while ((m = re.exec(css))) items.push({ name: m[1], uri: m[2] });
  if (!items.length) {
    console.error('未能从 ui-assets.css 中解析出任何 --ui-* 变量');
    process.exit(1);
  }

  /* 可选：从原图重新编码（按变量名模糊匹配文件名） */
  let replaced = 0;
  let pool = [];
  if (FROM) {
    collectFromFile(FROM, pool);
    for (const it of items) {
      const target = normName(it.name);
      const hit = pool.find((p) => {
        const base = normName(path.basename(p, path.extname(p)));
        return base === target || base.includes(target) || target.includes(base.slice(0, Math.max(6, Math.floor(base.length * 0.6))));
      });
      if (!hit) continue;
      const buf = fs.readFileSync(hit);
      const ext = path.extname(hit).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
      it.uri = 'data:' + mime + ';base64,' + buf.toString('base64');
      it.from = path.relative(ROOT, hit);
      replaced += 1;
    }
  }

  fs.mkdirSync(OUT, { recursive: true });
  const buckets = new Map(GROUPS.map((g) => [g.key, []]));
  for (const it of items) buckets.get(groupOf(it.name)).push(it);

  const manifest = { generatedAt: new Date().toISOString(), from: FROM || null, replacedFromSource: replaced, groups: {}, vars: {} };
  for (const g of GROUPS) {
    const list = buckets.get(g.key);
    if (!list.length) continue;
    const body = list.map((it) => `  --ui-${it.name}:url("${it.uri}");`).join('\n');
    const text = `/* 自动生成（tools/gen-ui-assets.cjs）：${g.title}。请勿手改，改原图或 ui-assets.css 后重跑生成。 */\n:root{\n${body}\n}\n`;
    fs.writeFileSync(path.join(OUT, g.key + '.css'), text, 'utf8');
    manifest.groups[g.key] = { title: g.title, count: list.length, file: g.key + '.css' };
    for (const it of list) manifest.vars[it.name] = { group: g.key, from: it.from || null };
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  /* index.html：把单个 ui-assets.css 换成按组引入 */
  const htmlPath = path.join(WEB, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const links = GROUPS.filter((g) => manifest.groups[g.key])
    .map((g) => `    <link rel="stylesheet" href="/ui-assets/${g.key}.css">`)
    .join('\n');
  if (/<link rel="stylesheet" href="\/ui-assets\.css"\s*\/?>/.test(html)) {
    html = html.replace(/[ \t]*<link rel="stylesheet" href="\/ui-assets\.css"\s*\/?>\s*\n?/, links + '\n');
    fs.writeFileSync(htmlPath, html, 'utf8');
  } else if (!/\/ui-assets\/frames\.css/.test(html)) {
    console.error('index.html 里找不到 /ui-assets.css 的引入行，请手动替换为按组引入');
    process.exit(2);
  }

  const total = items.length;
  console.log('切图变量 ' + total + ' 个，拆成 ' + Object.keys(manifest.groups).length + ' 个文件' + (FROM ? '，其中 ' + replaced + ' 个已从原图重新编码' : '（未指定 --from，沿用原 data URI）'));
  for (const k of Object.keys(manifest.groups)) console.log('  ' + k + '.css  ' + manifest.groups[k].count + ' 个 · ' + manifest.groups[k].title);
}

main();
