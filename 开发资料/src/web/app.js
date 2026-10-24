/* The Lethe Workbench · 前端主程序 v0.2 */
const TOKEN = window.__WB_TOKEN__ || '';

const S = {
  loading: true,
  locating: false,
  autoLocated: false,
  status: null,
  home: null,
  mods: [],
  dlls: [],
  view: 'home',
  selected: null,          // 当前选中的 Mod（管理页 / 编辑页同步）
  modDetail: null,
  detailTab: 'current',    // 'current' | 备份 label
  backupView: null,
  selectedDll: null,
  dllDetail: null,
  dllTab: 'current',
  editKind: null,
  sinner: null,
  personalityId: null,
  personality: null,
  vanilla: null,
  showVanilla: false,
  session: null,
  sessionKey: '',
  autoAt: '',
  dirty: false,
  // ---- v0.3 技能编辑 ----
  skills: [],
  modules: [],
  skillDefaults: null,
  skill: null,
  skillId: null,
  skillTab: 'code',
  skillSearch: '',
  moduleSearch: '',
  keywords: null,
  dragging: null,
  descCheck: null,
  imp: null,
};
window.__WBS = S; // 调试用：CDP 里可直接检查前端状态

const $ = (sel, root = document) => root.querySelector(sel);const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtBytes = (n) => {
  const v = Number(n) || 0;
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(2)} GB`;
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MB`;
  if (v >= 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${v} B`;
};
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* ---------------------------------- 基础 ---------------------------------- */

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'x-wb-token': TOKEN,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { data = { ok: false, error: '服务器返回的不是 JSON' }; }
  if (!res.ok) {
    const err = new Error(data.error || `请求失败（${res.status}）`);
    err.status = res.status;
    throw err;
  }
  // 业务上 ok:false 但没有 error（例如“没找到私服”）交给调用方判断，不算异常
  if (data.ok === false && data.error) {
    const err = new Error(data.error);
    err.status = res.status;
    throw err;
  }
  return data;
}

function toast(message, kind = 'info', ms = 4200) {
  const root = $('#toasts');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('gone'); setTimeout(() => el.remove(), 300); }, ms);
}

function wip() { toast('该功能正在维修', 'warn'); }

let MODAL = null;
function modal({ title, body, footer, wide = false }) {
  closeModal();
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-back';
  wrap.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><strong>${esc(title)}</strong><button class="modal-x" data-act="close-modal">×</button></div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  root.appendChild(wrap);
  MODAL = wrap;
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) closeModal(); });
  return wrap;
}
function closeModal() {
  if (MODAL) { MODAL.remove(); MODAL = null; }
}

/* -------------------------------- 数据加载 -------------------------------- */

async function loadStatus() {
  S.status = await api('/api/status');
  $('#st-version').textContent = `v${S.status.version}`;
}

async function loadHome() {
  S.home = await api('/api/home');
}

async function loadMods() {
  const res = await api('/api/mods');
  S.mods = res.mods || [];
  if (S.selected && !S.mods.some((m) => m.name === S.selected)) S.selected = null;
  if (!S.selected && S.mods.length) S.selected = S.mods[0].name;
}

async function loadDlls() {
  const res = await api('/api/dlls');
  S.dlls = res.dlls || [];
}

async function loadModDetail(name = S.selected) {
  if (!name) { S.modDetail = null; return; }
  S.modDetail = await api(`/api/mod?name=${encodeURIComponent(name)}`);
}

async function loadPersonalities(name = S.selected) {
  const res = await api(`/api/personalities?name=${encodeURIComponent(name || '')}`);
  S.vanilla = res;
  return res;
}

async function loadVanilla(characterId) {
  const res = await api(`/api/vanilla${characterId ? `?characterId=${characterId}` : ''}`);
  S.vanilla = { ...(S.vanilla || {}), ...res };
  return res;
}

async function loadPersonality(name, id) {
  const res = await api(`/api/personality?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}`);
  S.personality = res.personality;
  S.personalityId = id;
  S.sessionKey = `personality:${id}`;
  await refreshSession(name);
  return S.personality;
}

async function refreshSession(name = S.selected) {
  if (!name) { S.session = null; return; }
  try {
    const q = `name=${encodeURIComponent(name)}${S.sessionKey ? `&key=${encodeURIComponent(S.sessionKey)}` : ''}`;
    const res = await api(`/api/session?${q}`);
    S.session = res.session;
    S.autoAt = res.autoSave?.at || S.autoAt;
  } catch { /* 未定位时不报错 */ }
}

/* --------------------------------- 渲染骨架 -------------------------------- */

function scrollSelector(el) {
  if (!el || el.id === 'view') return '#view';
  const parts = [];
  let cur = el;
  while (cur && cur !== document.body) {
    if (cur.id === 'view') { parts.unshift('#view'); break; }
    const parent = cur.parentElement;
    if (!parent) return null;
    const idx = [...parent.children].indexOf(cur) + 1;
    parts.unshift(cur.tagName.toLowerCase() + ':nth-child(' + idx + ')');
    cur = parent;
  }
  return parts.join(' > ');
}

// 记录 #view 内可滚动容器的 scrollTop（带 CSS 路径），重绘后按路径还原；详情面板不还原，切换对象时应回到顶部
function captureScrollMap() {
  const map = [];
  for (const el of document.querySelectorAll('#view, #view *')) {
    if (el.classList.contains('detail-body')) continue;
    if (!el.scrollTop) continue;
    if (el.scrollHeight - el.clientHeight <= 2) continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') continue;
    const sel = scrollSelector(el);
    if (sel) map.push({ sel, top: el.scrollTop });
  }
  return map;
}

function restoreScrollMap(map) {
  if (!map || !map.length) return;
  for (const it of map) {
    try { const el = document.querySelector(it.sel); if (el) el.scrollTop = it.top; } catch (e) { /* 结构变化则忽略 */ }
  }
}

function render() {
  const view = $('#view');
  if (!view) return;
  if (!S.status) {
    view.innerHTML = `<div class="boot-screen"><div class="boot-mark">L</div><p>正在载入工作台…</p></div>`;
    updateDock();
    return;
  }
  if (!S.status.letheRoot && (S.locating || !S.autoLocated)) {
    view.innerHTML = renderSearching();
    updateDock();
    return;
  }
  if (!S.status.letheRoot) {
    view.innerHTML = renderSetup();
    updateDock();
    return;
  }
  const scrollMap = S._lastView === S.view ? captureScrollMap() : null;
  S._lastView = S.view;
  if (S.view === 'home') view.innerHTML = renderHome();
  else if (S.view === 'mods') view.innerHTML = renderMods();
  else if (S.view === 'edit') view.innerHTML = renderEdit();
  else view.innerHTML = renderImport();
  updateDock();
  restoreScrollMap(scrollMap);
}

function syncDockHeight() {
  const dock = $('.dock');
  if (!dock) return;
  const h = Math.ceil(dock.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty('--dock-h', `${h + 12}px`);
}

function updateDock() {
  $$('.dock-item').forEach((el) => el.classList.toggle('active', el.dataset.view === S.view));
  const root = S.status?.letheRoot || '';
  $('#root-dot')?.classList.toggle('ok', Boolean(root));
  $('#st-root').textContent = root ? `Lethe · ${root}` : '尚未定位私服';
  $('#st-root').title = root || '';
  $('#st-mod').textContent = S.selected || '—';
  const dirty = Boolean(S.session?.dirty);
  const d = $('#st-dirty');
  d.textContent = dirty ? `有未保存改动（撤销 ${S.session?.undo || 0} 步）` : '已保存';
  d.className = dirty ? 'dirty' : 'calm';
  const auto = $('#st-auto');
  if (auto) {
    auto.textContent = S.autoAt ? `自动快照 ${new Date(S.autoAt).toLocaleTimeString('zh-CN', { hour12: false })}` : '自动快照 —';
  }
  // 名片（底栏主行，5 格 / 10×3 网格）
  const st = S.home?.stats || {};
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('#nc-name', S.home?.editorName || st.editorName || '但丁');
  set('#nc-mod', st.modCount ?? '—');
  set('#nc-dll', st.dllCount ?? '—');
  set('#nc-editor', st.editorTitle || '边狱工作台 Limbus Workshop');
  set('#nc-size', fmtBytes(st.bytes));
  syncDockHeight();
}

/* ---------------------------------- 主页 ---------------------------------- */

function renderSearching() {
  return `<section class="home searching">
    <div class="scan-box">
      <div class="scan-ring"></div>
      <h2>正在寻找私服</h2>
      <p>自动扫描常见位置与磁盘目录，查找 <code>BepInEx\\plugins\\Lethe</code></p>
      <p class="muted">如果找不到，可以在“设置”里手动指定目录。</p>
    </div>
  </section>`;
}

function renderSetup() {
  return `<section class="home searching">
    <div class="scan-box">
      <h2>还没有指定私服</h2>
      <p>请选择游戏的安装目录（含 <code>LimbusCompany.exe</code>）或 Lethe 目录（含 <code>mods</code> / <code>dumpedData</code>）。</p>
      <div class="row gap center">
        <button class="btn primary" data-act="open-settings">打开设置</button>
        <button class="btn ghost" data-act="locate-deep">深度扫描磁盘</button>
      </div>
    </div>
  </section>`;
}

function renderHome() {
  return `<section class="home">
    <div class="home-cover">
      <div class="cover-inner">
        <div class="cover-kicker">LIMBUS COMPANY · MOD WORKBENCH</div>
        <h1>THE LETHE<br>WORKBENCH</h1>
        <div class="cover-line"></div>
        <p>边狱公司 · 更简单的模组工作台</p>
        <div class="cover-placeholder">封面占位 · 后续接入原画</div>
      </div>
    </div>

    <div class="home-side">
      <div class="round-actions">
        <button class="round-btn" data-act="open-settings" title="设置"><span>⚙</span><small>设置</small></button>
        <button class="round-btn" data-act="wip-guide" title="指南"><span>?</span><small>指南</small></button>
        <button class="round-btn" data-act="wip-cover" title="封面"><span>▣</span><small>封面</small></button>
        <button class="round-btn" data-act="wip-thanks" title="鸣谢"><span>♥</span><small>鸣谢</small></button>
      </div>
      <div class="panel notice">
        <div class="panel-head">公告栏 <span class="tag">NOTICE</span></div>
        <div class="panel-body"><div class="placeholder">公告占位 · 后续接入更新说明</div></div>
      </div>
    </div>
  </section>`;
}

/* -------------------------------- Mod 管理 -------------------------------- */

const modRow = (m) => `<button class="item ${S.selected === m.name ? 'active' : ''} ${m.enabled ? '' : 'disabled'}" data-act="select-mod" data-name="${esc(m.name)}">
  <span class="state-dot ${m.enabled ? 'on' : 'off'}"></span>
  <span class="item-main"><strong>${esc(m.name)}</strong><small>${m.personalityCount ?? 0} 人格 · ${m.files ?? 0} 文件 · ${fmtBytes(m.bytes)}</small></span>
  ${m.enabled ? '' : '<span class="x-badge">✕</span>'}
</button>`;

const dllRow = (d) => `<button class="item ${S.selectedDll === d.file ? 'active' : ''} ${d.enabled ? '' : 'disabled'}" data-act="select-dll" data-file="${esc(d.file)}">
  <span class="state-dot ${d.enabled ? 'on' : 'off'}"></span>
  <span class="item-main"><strong>${esc(d.base)}</strong><small>${fmtBytes(d.size)} · ${d.backups?.length || 0} 个备份</small></span>
  ${d.enabled ? '' : '<span class="x-badge">✕</span>'}
</button>`;

function renderMods() {
  const enabled = S.mods.filter((m) => m.enabled).length;
  const dllOn = S.dlls.filter((d) => d.enabled).length;
  return `<div class="layout mods">
    <section class="panel">
      <div class="panel-head">已加载 MOD <span class="count">${enabled} / ${S.mods.length}</span></div>
      <div class="panel-body list">${S.mods.map(modRow).join('') || '<div class="list-empty">mods 目录是空的</div>'}</div>
      <div class="panel-foot"><button class="btn ghost block" data-act="create-mod">＋ 创建 Mod</button></div>
    </section>
    <section class="panel detail-pane">${renderModDetail()}</section>
    <section class="panel">
      <div class="panel-head">已加载 DLL <span class="count">${dllOn} / ${S.dlls.length}</span></div>
      <div class="panel-body list">${S.dlls.map(dllRow).join('') || '<div class="list-empty">plugins 目录里没有 DLL</div>'}</div>
      <div class="panel-foot"><button class="btn ghost block" data-act="reveal-plugins">打开插件目录</button></div>
    </section>
  </div>`;
}

function versionBar(items, active, act) {
  return `<div class="version-bar">${items.map((it) => `<button class="vtab ${it.value === active ? 'active' : ''}" data-act="${act}" data-label="${esc(it.value)}">${esc(it.label)}</button>`).join('')}</div>`;
}

function renderModDetail() {
  if (S.selectedDll && S.dllDetail) return renderDllDetail();
  const d = S.modDetail;
  if (!d) return `<div class="empty-state"><div class="empty-mark">◆</div><p>从左侧选择一个 Mod 查看详情</p><small class="muted">禁用的 Mod 也能编辑，改动仍会写入磁盘</small></div>`;

  const tabs = [{ label: '当前版本', value: 'current' }, ...(d.backups || []).map((b) => ({ label: b.label, value: b.label }))];
  const active = S.detailTab === 'current' ? 'current' : S.detailTab;
  const isBackup = active !== 'current';
  return `<div class="detail-head">
    <div class="detail-title">${esc(d.name)} <span class="badge ${d.enabled ? 'ok' : 'off'}">${d.enabled ? '已启用' : '已禁用'}</span></div>
    <div class="detail-sub">${esc(d.dir)}</div>
    <div class="meta-row">
      <span>人格 ${(d.personalities || []).length}</span>
      <span>贴图 ${(d.sprites || []).length}</span>
      <span>数据类目 ${(d.dataCategories || []).length}</span>
      <span>备份 ${(d.backups || []).length}</span>
      ${d.autoSave ? `<span>自动快照 ${new Date(d.autoSave.at).toLocaleString('zh-CN', { hour12: false })}</span>` : '<span class="muted">暂无自动快照</span>'}
    </div>
    ${versionBar(tabs, active, 'pick-mod-version')}
  </div>
  <div class="detail-body">${isBackup ? renderBackupView() : renderCurrentMod(d)}</div>
  <div class="detail-actions">
    <button class="btn ok" data-act="enable-mod" ${d.enabled ? 'disabled' : ''}>启用</button>
    <button class="btn warn" data-act="backup-mod">备份</button>
    <button class="btn danger" data-act="disable-mod" ${d.enabled ? '' : 'disabled'}>禁用</button>
  </div>`;
}

function renderCurrentMod(d) {
  const cats = (d.dataCategories || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('');
  const persons = (d.personalities || []).slice(0, 12).map((p) => `<div class="mini-person"><strong>${esc(p.name || p.id)}</strong><small>${esc(p.title || '')}</small><span class="muted">${esc(p.id)}</span></div>`).join('');
  return `<div class="detail-section">
    <h4>数据类目</h4>
    <div class="chips">${cats || '<span class="muted">这个 Mod 还没有数据文件</span>'}</div>
  </div>
  <div class="detail-section">
    <h4>人格预览</h4>
    <div class="mini-grid">${persons || '<span class="muted">还没有人格</span>'}</div>
  </div>
  ${d.enabled ? '' : `<div class="banner red">该 Mod 正在被禁用的状态 · 修改仍会保存到磁盘，但不会在游戏中生效</div>`}`;
}

function renderBackupView() {
  const b = S.backupView;
  if (!b) return `<div class="empty-state"><p>正在读取备份…</p></div>`;
  const persons = (b.personalities || []).map((p) => `<div class="mini-person"><strong>${esc(p.name || p.id)}</strong><small>${esc(p.title || '')}</small><span class="muted">${esc(p.id)}</span></div>`).join('');
  return `<div class="readonly-note">备份为只读。若要回到这个版本，使用下方「替换当前版本」——两者会互换，操作无法撤销。</div>
  <div class="detail-section"><h4>人格</h4><div class="mini-grid">${persons || '<span class="muted">这个备份里没有人格</span>'}</div></div>
  <div class="detail-actions inner">
    <button class="btn danger" data-act="swap-version" data-label="${esc(b.label)}">替换当前版本</button>
  </div>`;
}

function renderDllDetail() {
  const d = S.dllDetail;
  if (!d) return `<div class="empty-state"><div class="empty-mark">◆</div><p>从右侧选择一个 DLL 查看详情</p></div>`;
  const tabs = [{ label: '当前版本', value: 'current' }, ...(d.backups || []).map((b) => ({ label: b.label, value: b.label }))];
  return `<div class="detail-head">
    <div class="detail-title">${esc(d.base)} <span class="badge ${d.enabled ? 'ok' : 'off'}">${d.enabled ? '已启用' : '已禁用'}</span></div>
    <div class="detail-sub">${esc(d.file)}</div>
    ${versionBar(tabs, S.dllTab, 'pick-dll-version')}
  </div>
  <div class="detail-body">
    <div class="detail-section"><h4>文件</h4>
      <div class="meta-row"><span>${fmtBytes(d.size)}</span><span class="muted">${esc(d.dir || '')}</span></div>
    </div>
    <div class="detail-section"><h4>备份</h4>
      <div class="chips">${(d.backups || []).map((b) => `<span class="chip">${esc(b.label)}</span>`).join('') || '<span class="muted">还没有备份</span>'}</div>
    </div>
    ${S.dllTab !== 'current' ? '<div class="readonly-note">DLL 备份为只读文件，恢复请在文件管理器中手动替换。</div>' : ''}
  </div>
  <div class="detail-actions">
    <button class="btn ok" data-act="enable-dll" ${d.enabled ? 'disabled' : ''}>启用</button>
    <button class="btn warn" data-act="backup-dll">备份</button>
    <button class="btn danger" data-act="disable-dll" ${d.enabled ? '' : 'disabled'}>禁用</button>
  </div>`;
}

/* -------------------------------- Mod 编辑 -------------------------------- */

const WIZARDS = [
  { kind: 'module', name: '模块编辑', sub: 'MODULE', ico: '▤' },
  { kind: 'personality', name: '人格编辑', sub: 'IDENTITY', ico: '◈' },
  { kind: 'passive', name: '被动编辑', sub: 'PASSIVE', ico: '◇' },
  { kind: 'skill', name: '技能编辑', sub: 'SKILL', ico: '✦' },
  { kind: 'buff', name: 'Buff 编辑', sub: 'BUFF', ico: '❖' },
  { kind: 'battle', name: '战斗编辑', sub: 'BATTLE', ico: '⚔', wip: true },
  { kind: 'enemy', name: '敌人编辑', sub: 'ENEMY', ico: '☠', wip: true },
];

function renderEdit() {
  const rows = S.mods.map(modRow).join('');
  return `<div class="layout edit">
    <section class="panel">
      <div class="panel-head">MOD 列表 <span class="count">${S.mods.length}</span></div>
      <div class="panel-body list">${rows || '<div class="list-empty">mods 目录是空的</div>'}</div>
      <div class="panel-foot"><button class="btn ghost block" data-act="create-mod">＋ 创建 Mod</button></div>
    </section>
    <section class="panel edit-pane">
      ${S.editKind ? renderKindArea() : renderWizardHome()}
      <div class="dock-mini" id="session-hint"></div>
    </section>
  </div>`;
}

function renderWizardHome() {
  const cards = WIZARDS.map((w) => `<button class="wiz ${w.wip ? 'wip' : ''}" data-act="open-kind" data-kind="${w.kind}">
    <span class="wiz-ico">${w.ico}</span>
    <strong>${w.name}</strong>
    <small>${w.sub}${w.wip ? ' · 维修中' : ''}</small>
  </button>`).join('');
  return `<div class="pane-head">
    <div><h2>Mod 编辑</h2><p class="muted">${S.selected ? esc(S.selected) : '先从左侧选一个 Mod'}</p></div>
  </div>
  <div class="wiz-grid">${cards}</div>`;
}

function renderKindArea() {
  const back = `<button class="btn ghost sm" data-act="back-wizard">← 返回</button>`;
  if (S.editKind === 'skill') return renderSkillArea(back);
  if (S.editKind === 'module') return renderModuleArea(back);
  if (S.editKind === 'passive') return renderPassiveArea(back);
  if (S.editKind === 'buff') return renderBuffArea(back);
  if (S.editKind !== 'personality') {
    return `<div class="pane-head">${back}<h2>维修中</h2></div><div class="empty-state"><p>该功能正在维修</p></div>`;
  }
  if (S.personality) return renderPersonalityDetail();
  return `${renderSinnerArea()}`;
}

function sinnerCharacters() {
  // 只保留 12 罪人（1–12）；角色表里可能混入 NPC（如 400005 贾惜春），不进人格编辑
  return (S.vanilla?.characters || []).filter((c) => Number(c.id) >= 1 && Number(c.id) <= 12);
}

function renderSinnerArea() {
  const chars = sinnerCharacters();
  const list = S.mods.find((m) => m.name === S.selected);
  const disabled = list && !list.enabled;
  const all = S.vanilla?.custom || [];
  const custom = S.sinner ? all.filter((p) => Number(p.characterId) === Number(S.sinner)) : all;
  const faces = chars.map((c) => `<button class="sinner ${S.sinner === c.id ? 'active' : ''}" data-act="pick-sinner" data-id="${c.id}">
      <span class="face">${esc(String(c.name || '?').slice(0, 1))}</span>
      <span class="s-name">${esc(c.name)}</span>
    </button>`).join('');
  const rows = custom.map((p) => `<button class="person-row" data-act="open-personality" data-id="${esc(p.id)}">
      <strong>${esc(p.name || p.id)}</strong><small>${esc(p.title || '')}</small><span class="muted">${esc(p.id)}</span>
    </button>`).join('');
  const vanillaRows = (S.vanillaList || []).map((p) => `<div class="person-row vanilla"><strong>${esc(p.name || p.id)}</strong><small>${esc(p.title || '')}</small><span class="muted">${esc(p.id)}</span></div>`).join('');
  return `<div class="pane-head">
    <button class="btn ghost sm" data-act="back-wizard">← 返回</button>
    <div><h2>人格编辑</h2><p class="muted">${esc(S.selected || '')} · 选择罪人后开始</p></div>
  </div>
  ${disabled ? '<div class="banner red">该 Mod 正在被禁用的状态 · 修改仍会保存到磁盘，但不会在游戏中生效</div>' : ''}
  <div class="sinner-grid">${faces}</div>
  <div class="list-section">
    <button class="section-toggle" data-act="toggle-vanilla">原版人格列表 (${(S.vanillaList || []).length}) <span>${S.showVanilla ? '收起' : '展开'}</span></button>
    ${S.showVanilla ? `<div class="person-list">${vanillaRows || '<div class="list-empty">该罪人没有原版人格</div>'}</div>` : ''}
    <div class="list-sub">本 MOD 自定义人格${S.sinner ? ` · ${esc(chars.find((c) => c.id === S.sinner)?.name || '')}` : ''}</div>
    <div class="person-list">${rows || `<div class="list-empty">${S.sinner ? '该罪人在此 Mod 下还没有自定义人格' : '这个 Mod 里还没有人格'}</div>`}</div>
    <button class="btn ghost block" data-act="create-personality" ${S.sinner ? '' : 'disabled'}>＋ 新建人格</button>
  </div>`;
}

function fieldRow(label, path, value, opts = {}) {
  if (opts.textarea) {
    return `<label class="field"><span>${label}</span><textarea rows="3" data-field="${path}">${esc(value ?? '')}</textarea></label>`;
  }
  const type = opts.type || 'text';
  const step = opts.step ? ` step="${opts.step}"` : '';
  return `<label class="field"><span>${label}</span><input type="${type}"${step} data-field="${path}" value="${esc(value ?? '')}"></label>`;
}

function renderPersonalityDetail() {
  const p = S.personality;
  const e = p.entity || {};
  const l = p.locale || {};
  const lists = (v) => (Array.isArray(v) ? v.join(',') : (v ?? ''));
  const sess = S.session || {};
  const dirty = sess.dirty;
  const modEnabled = S.mods.find((m) => m.name === S.selected)?.enabled !== false;
  return `<div class="pane-head">
    <button class="btn ghost sm" data-act="back-personalities">← 返回</button>
    <div><h2>${esc(l.name || e.id)}</h2><p class="muted">${esc(p.id)} · ${esc(S.selected || '')}</p></div>
    <span class="spacer"></span>
    <button class="btn ghost sm" data-act="undo" ${sess.undo ? '' : 'disabled'}>撤销</button>
    <button class="btn ghost sm" data-act="redo" ${sess.redo ? '' : 'disabled'}>重做</button>
    <button class="btn primary sm" data-act="save-personality">保存</button>
    <span class="session-state ${dirty ? 'dirty' : ''}" id="session-state">${dirty ? '有未保存改动' : '已保存'}</span>
  </div>
  ${modEnabled ? '' : '<div class="banner red">该 Mod 正在被禁用的状态 · 修改仍会保存到磁盘，但不会在游戏中生效</div>'}
  <div class="form" id="personality-form">
    <div class="grid-2">
      ${fieldRow('名称', 'locale.name', l.name)}
      ${fieldRow('称号', 'locale.title', l.title)}
    </div>
    ${fieldRow('简介', 'locale.desc', l.desc, { textarea: true })}
    <div class="grid-3">
      ${fieldRow('等级 RANK', 'entity.rank', e.rank, { type: 'number' })}
      ${fieldRow('基础 HP', 'entity.hp.defaultStat', e.hp?.defaultStat, { type: 'number', step: '0.5' })}
      ${fieldRow('每级成长', 'entity.hp.incrementByLevel', e.hp?.incrementByLevel, { type: 'number', step: '0.01' })}
      ${fieldRow('防御修正', 'entity.defCorrection', e.defCorrection, { type: 'number' })}
    </div>
    <div class="grid-2">
      ${fieldRow('最小速度', 'entity.minSpeedList', lists(e.minSpeedList))}
      ${fieldRow('最大速度', 'entity.maxSpeedList', lists(e.maxSpeedList))}
    </div>
    ${fieldRow('外观 (appearance)', 'entity.appearance', e.appearance)}
    <div class="hint muted">改动会在停止输入后自动写入磁盘，并记入本文件的撤销历史。保存后撤销历史清空。</div>
  </div>`;
}

/* -------------------------------- 编辑写入 -------------------------------- */

let patchTimer = null;
let patching = false;

function readFieldPatch() {
  const form = $('#personality-form');
  if (!form) return null;
  const entity = {};
  const locale = {};
  $$('[data-field]', form).forEach((el) => {
    const path = el.dataset.field;
    const raw = el.value;
    const [group, key] = path.split('.');
    if (group === 'locale') { locale[key] = raw; return; }
    if (key === 'hp.defaultStat') { entity.hp = { ...(entity.hp || {}), defaultStat: num(raw) }; return; }
    if (key === 'hp.incrementByLevel') { entity.hp = { ...(entity.hp || {}), incrementByLevel: num(raw) }; return; }
    if (key === 'rank' || key === 'defCorrection') { entity[key] = num(raw); return; }
    if (key === 'minSpeedList' || key === 'maxSpeedList') {
      entity[key] = String(raw).split(/[,，\s]+/).filter(Boolean).map((x) => num(x));
      return;
    }
    if (key === 'appearance') { entity[key] = raw.trim(); return; }
  });
  return { entity, locale };
}

function schedulePatch() {
  clearTimeout(patchTimer);
  patchTimer = setTimeout(() => { flushPatch().catch((e) => toast(e.message, 'error')); }, 450);
}

async function flushPatch() {
  if (!S.personality || !S.selected || patching) return;
  const patch = readFieldPatch();
  if (!patch) return;
  patching = true;
  try {
    const res = await api('/api/personality/patch', {
      method: 'POST',
      body: { name: S.selected, id: S.personalityId, ...patch },
    });
    S.session = res.session;
    if (S.session?.firstDirtyAt) S.autoAt = S.autoAt || S.session.firstDirtyAt;
    updateDock();
    const hint = $('#session-state');
    if (hint) { hint.textContent = S.session?.dirty ? '有未保存改动' : '已保存'; hint.className = `session-state ${S.session?.dirty ? 'dirty' : ''}`; }
    const undoBtn = $('[data-act="undo"]');
    const redoBtn = $('[data-act="redo"]');
    if (undoBtn) undoBtn.disabled = !(Number(S.session?.undo) > 0);
    if (redoBtn) redoBtn.disabled = !(Number(S.session?.redo) > 0);
    if (!res.changed) return;
  } finally { patching = false; }
}

/* ---------------------------------- 导入 ---------------------------------- */

function renderImport() {
  return `<div class="layout single">
    <section class="panel">
      <div class="panel-head">MOD 导入 <span class="tag">WIP</span></div>
      <div class="panel-body">
        <div class="empty-state"><div class="empty-mark">⇩</div><p>该功能正在维修</p><small class="muted">后续会支持从压缩包 / 文件夹导入并自动检查结构。</small></div>
      </div>
    </section>
  </div>`;
}

/* --------------------------------- 弹窗流程 -------------------------------- */

function openSettings() {
  const st = S.status || {};
  modal({
    title: '设置',
    wide: true,
    body: `
      <div class="grid-2">
        <label class="field"><span>编辑者名称</span><input id="set-editor" value="${esc(st.editorName || '但丁')}" placeholder="但丁"></label>
        <label class="field"><span>界面主题</span>
          <select id="set-theme">
            <option value="dark" ${(st.theme || 'dark') === 'dark' ? 'selected' : ''}>深色（默认）</option>
            <option value="light" ${st.theme === 'light' ? 'selected' : ''}>浅色</option>
          </select>
        </label>
      </div>
      <label class="field"><span>私服路径（游戏目录或 Lethe 目录）</span><input id="set-root" value="${esc(st.gameRoot || st.letheRoot || '')}" placeholder="D:\\私服"></label>
      <div class="row gap">
        <button class="btn primary sm" data-act="apply-root">使用这个目录</button>
        <button class="btn ghost sm" data-act="locate-quick">自动定位</button>
        <button class="btn ghost sm" data-act="locate-deep">深度扫描磁盘</button>
      </div>
      <div class="hint muted">当前 Lethe：${esc(st.letheRoot || '（未定位）')}<br>配置文件：${esc(st.configPath || '')}</div>`,
    footer: `<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="save-settings">保存设置</button>`,
  });
  $('#set-editor')?.focus();
}

function openCreateMod() {
  modal({
    title: '创建一个 Mod',
    body: `<label class="field"><span>Mod 名称</span><input id="new-mod-name" placeholder="例如：我的第一个 Mod"></label>
      <div class="hint muted">会在 mods 下建立 <code>custom_limbus_data</code> 与 <code>custom_limbus_locale</code> 两个空目录，其余目录用到时再生成。</div>`,
    footer: `<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-create-mod">创建</button>`,
  });
  setTimeout(() => $('#new-mod-name')?.focus(), 30);
}

function openCreatePersonality() {
  const sinner = (S.vanilla?.characters || []).find((c) => c.id === S.sinner);
  modal({
    title: '新建人格',
    body: `<div class="hint muted">罪人：${esc(sinner?.name || '未选择')} · Mod：${esc(S.selected || '')}</div>
      <label class="field"><span>名称</span><input id="np-name" placeholder="例如：测试人格"></label>
      <div class="grid-2">
        <label class="field"><span>称号</span><input id="np-title" placeholder="称号"></label>
        <label class="field"><span>编号（可留空自动分配）</span><input id="np-id" placeholder="自动"></label>
      </div>
      <label class="field"><span>简介</span><textarea id="np-desc" rows="3"></textarea></label>`,
    footer: `<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-create-personality">创建</button>`,
  });
  setTimeout(() => $('#np-name')?.focus(), 30);
}

async function confirmSwap(label) {
  const cur = S.modDetail?.dir || `mods\\${S.selected}`;
  modal({
    title: '替换当前版本',
    body: `<p>即将把当前版本与备份 <strong>${esc(label)}</strong> 互换。</p>
      <div class="hint muted">当前：${esc(cur)}<br>备份：${esc(label)}</div>
      <p class="danger-text">该操作无法撤销，也不会进入撤销历史。</p>`,
    footer: `<button class="btn ghost" data-act="close-modal">取消</button><button class="btn danger" data-act="submit-swap" data-label="${esc(label)}">确认互换</button>`,
  });
}

function openRecover(check) {
  const list = check.mods.map((m) => `<button class="person-row" data-act="recover-mod" data-name="${esc(m.name)}">
      <strong>${esc(m.name)}</strong><small>快照 ${new Date(m.at).toLocaleString('zh-CN', { hour12: false })}</small><span class="muted">${m.files} 文件 · ${fmtBytes(m.bytes)}</span>
    </button>`).join('');
  modal({
    title: '检测到软件未被正常关闭',
    body: `<p>上一次运行没有正常结束。是否尝试恢复自动快照？</p>
      <div class="person-list">${list || '<div class="list-empty">没有可用的自动快照</div>'}</div>
      <div class="hint muted">恢复会先用当前内容做一份内部存档，再覆盖为快照内容。</div>`,
    footer: `<button class="btn ghost" data-act="close-modal">忽略</button>`,
  });
}

/* ---------------------------------- 动作 ---------------------------------- */

const actions = {
  'close-modal': () => closeModal(),
  'wip-guide': wip,
  'wip-cover': wip,
  'wip-thanks': wip,
  'open-settings': () => openSettings(),
  'create-mod': () => openCreateMod(),
  'select-mod': async (el) => {
    const name = el.dataset.name;
    const prev = S.selected;
    S.selected = name;
    S.selectedDll = null;
    S.dllDetail = null;
    S.detailTab = 'current';
    S.backupView = null;
    S.sessionKey = '';
    S.skill = null;
    S.skillId = null;
    S.skills = [];
    S.modules = [];
    S.descCheck = null;
    S.descChecks = null;
    S.passive = null;
    S.passiveId = null;
    S.passives = [];
    S.buff = null;
    S.buffId = null;
    S.buffs = [];
    S.pDescCheck = null;
    S.bDescCheck = null;
    if (S.status.letheRoot) {
      await loadModDetail(name);
      await refreshSession(name);
      // 切换 Mod 时同步刷新当前向导页的内容（此前只换了名字，列表/详情仍是上一个 Mod 的）
      if (prev !== name && S.editKind === 'skill') {
        await ensureKeywords();
        await loadSkillList(name);
      } else if (prev !== name && S.editKind === 'passive') {
        await ensureKeywords();
        await loadPassiveList(name);
      } else if (prev !== name && S.editKind === 'buff') {
        await ensureKeywords();
        await loadBuffList(name);
      } else if (prev !== name && S.editKind === 'module') {
        await loadModules(true);
      } else if (prev !== name && S.editKind === 'personality') {
        S.personality = null;
        S.personalityId = null;
        await loadPersonalities(name);
      }
    }
    render();
  },
  'select-dll': async (el) => {
    S.selectedDll = el.dataset.file;
    S.dllDetail = S.dlls.find((d) => d.file === S.selectedDll) || null;
    S.dllTab = 'current';
    render();
  },
  'pick-mod-version': (el) => {
    S.detailTab = el.dataset.label;
    S.backupView = null;
    render();
    if (S.detailTab !== 'current') {
      api(`/api/backup/read?name=${encodeURIComponent(S.selected)}&label=${encodeURIComponent(S.detailTab)}`)
        .then((res) => { S.backupView = { ...res.backup, label: S.detailTab }; render(); })
        .catch((e) => toast(e.message, 'error'));
    }
  },
  'pick-dll-version': (el) => { S.dllTab = el.dataset.label; render(); },
  'enable-mod': async () => {
    await api('/api/mod/enable', { method: 'POST', body: { name: S.selected } });
    toast('已启用', 'ok');
    await refreshModsAndDetail();
  },
  'disable-mod': async () => {
    await api('/api/mod/disable', { method: 'POST', body: { name: S.selected } });
    toast('已禁用（仍可编辑）', 'warn');
    await refreshModsAndDetail();
  },
  'backup-mod': async () => {
    const res = await api('/api/mod/backup', { method: 'POST', body: { name: S.selected } });
    toast(`已备份：${res.backup.label}`, 'ok');
    await refreshModsAndDetail();
  },
  'swap-version': (el) => confirmSwap(el.dataset.label),
  'submit-swap': async (el) => {
    closeModal();
    await api('/api/mod/swap', { method: 'POST', body: { name: S.selected, label: el.dataset.label } });
    toast('已互换版本', 'ok');
    S.detailTab = 'current';
    S.backupView = null;
    await refreshModsAndDetail();
  },
  'enable-dll': async () => {
    await api('/api/dll/toggle', { method: 'POST', body: { file: S.selectedDll, enabled: true } });
    toast('DLL 已启用', 'ok');
    await refreshDlls();
  },
  'disable-dll': async () => {
    await api('/api/dll/toggle', { method: 'POST', body: { file: S.selectedDll, enabled: false } });
    toast('DLL 已禁用', 'warn');
    await refreshDlls();
  },
  'backup-dll': async () => {
    const res = await api('/api/dll/backup', { method: 'POST', body: { file: S.selectedDll } });
    toast(`DLL 已备份：${res.backup.label}`, 'ok');
    await refreshDlls();
  },
  'reveal-plugins': () => api('/api/reveal', { method: 'POST', body: { path: S.home?.stats?.pluginsDir || '' } }).catch((e) => toast(e.message, 'error')),
  'open-kind': (el) => {
    const kind = el.dataset.kind;
    const w = WIZARDS.find((x) => x.kind === kind);
    if (!w || w.wip) { wip(); return; }
    S.editKind = kind;
    (async () => {
      if (kind === 'module') {
        await Promise.all([loadModules(true), ensureKeywords()]);
        render();
        return;
      }
      if (kind === 'passive') {
        await Promise.all([loadPassiveList(S.selected), ensureKeywords()]);
        render();
        return;
      }
      if (kind === 'buff') {
        await Promise.all([loadBuffList(S.selected), ensureKeywords()]);
        render();
        return;
      }
      if (kind === 'skill') {
        await Promise.all([loadSkillList(S.selected), ensureKeywords()]);
        render();
        return;
      }
      if (S.status.letheRoot) {
        await loadPersonalities(S.selected);
        if (!S.sinner || Number(S.sinner) < 1 || Number(S.sinner) > 12) {
          S.sinner = Number(sinnerCharacters()[0]?.id || 1);
        }
        const res = await loadVanilla(S.sinner);
        S.vanillaList = res.personalities || [];
      }
      render();
    })().catch((e) => toast(e.message, 'error'));
  },
  'back-wizard': () => { S.editKind = null; S.personality = null; S.personalityId = null; S.skill = null; S.skillId = null; S.passive = null; S.passiveId = null; S.buff = null; S.buffId = null; render(); },
  'back-personalities': () => { flushPatch().catch(() => {}); S.personality = null; S.personalityId = null; render(); },
  'pick-sinner': async (el) => {
    S.sinner = Number(el.dataset.id);
    const res = await loadVanilla(S.sinner);
    S.vanillaList = res.personalities || [];
    render();
  },
  'toggle-vanilla': () => { S.showVanilla = !S.showVanilla; render(); },
  'open-personality': async (el) => {
    await loadPersonality(S.selected, el.dataset.id);
    render();
  },
  'create-personality': () => openCreatePersonality(),
  'submit-create-mod': async () => {
    const name = $('#new-mod-name')?.value?.trim();
    if (!name) { toast('请填写 Mod 名称', 'warn'); return; }
    const res = await api('/api/mod/create', { method: 'POST', body: { name } });
    closeModal();
    toast(`已创建 Mod：${res.mod.name}`, 'ok');
    S.selected = res.mod.name;
    await refreshModsAndDetail();
    S.view = 'mods';
    render();
  },
  'submit-create-personality': async () => {
    const name = S.selected;
    const body = {
      name,
      characterId: S.sinner,
      displayName: $('#np-name')?.value?.trim() || '新人格',
      title: $('#np-title')?.value?.trim() || '',
      desc: $('#np-desc')?.value?.trim() || '',
      id: $('#np-id')?.value?.trim() || undefined,
    };
    if (!name) { toast('请先选择 Mod', 'warn'); return; }
    const res = await api('/api/personality/create', { method: 'POST', body });
    closeModal();
    toast(`人格 ${res.personality.id} 已创建`, 'ok');
    await loadPersonalities(name);
    S.vanillaList = S.vanilla?.personalities || [];
    await loadPersonality(name, res.personality.id);
    render();
  },
  'save-personality': () => saveCurrent(),
  undo: () => doUndo(),
  redo: () => doRedo(),
  'open-skill': (el) => openSkill(el.dataset.id),
  'skill-tab': (el) => { S.skillTab = el.dataset.tab; render(); },
  'new-skill': () => openCreateSkill(),
  'import-skill': () => openImportSkill(),
  'submit-create-skill': () => submitCreateSkill(),
  'import-kind': (el) => { S.imp.kind = el.dataset.kind; renderImportBody(); },
  'import-pick-sinner': (el) => { S.imp.characterId = el.value; loadImportPersonalities(el.value); },
  'import-pick-personality': (el) => { S.imp.personalityId = el.value; loadImportSkillsVanilla(el.value); },
  'import-pick-mod': (el) => { S.imp.mod = el.value; loadImportSkillsMod(el.value); },
  'submit-import-skill': () => submitImportSkill(),
  'remove-placed': (el) => removePlaced(el.dataset.zone, el.dataset.index, el.dataset.mid),
  'risk-save-skill': () => riskSave(),
  'search-skill': (el) => { S.skillSearch = el.value; render(); refocus(el.id, el.value.length); },
  'search-module': (el) => { S.moduleSearch = el.value; render(); refocus(el.id, el.value.length); },
  'save-settings': async () => {
    const editorName = $('#set-editor')?.value || '但丁';
    const theme = $('#set-theme')?.value || 'dark';
    const res = await api('/api/config', { method: 'POST', body: { editorName, theme } });
    S.status = { ...S.status, editorName, theme };
    document.documentElement.dataset.theme = theme;
    closeModal();
    await loadHome();
    render();
    toast('设置已保存', 'ok');
  },
  'apply-root': async () => {
    const path = $('#set-root')?.value?.trim();
    if (!path) { toast('请填写路径', 'warn'); return; }
    try {
      await api('/api/root', { method: 'POST', body: { path } });
      closeModal();
      await bootData();
      toast('已切换私服目录', 'ok');
    } catch (e) { toast(e.message, 'error'); }
  },
  'locate-quick': () => locateAction({ quick: true }),
  'locate-deep': () => locateAction({ quick: false }),
  'recover-mod': async (el) => {
    const name = el.dataset.name;
    await api('/api/recover', { method: 'POST', body: { name } });
    closeModal();
    toast(`已从快照恢复：${name}`, 'ok');
    await bootData();
  },
  'autosave-now': async () => {
    const res = await api('/api/autosave/now', { method: 'POST', body: { name: S.selected } });
    if (res.ok) toast(`已自动快照：${res.result.files} 文件`, 'ok');
    else toast(res.result?.reason === 'clean' ? '当前没有未保存改动' : '快照未执行', 'warn');
  },
};

/* ------------------------------ 数据刷新辅助 ------------------------------ */

async function refreshModsAndDetail() {
  await loadMods();
  S.selected = S.selected || S.mods[0]?.name || null;
  if (S.selected) await loadModDetail(S.selected);
  await refreshSession(S.selected);
  render();
}

async function refreshDlls() {
  await loadDlls();
  if (S.selectedDll) S.dllDetail = S.dlls.find((d) => d.name === S.selectedDll) || null;
  render();
}

async function locateAction({ quick }) {
  S.locating = true;
  render();
  try {
    const res = await api('/api/locate', { method: 'POST', body: { quick } });
    S.autoLocated = true;
    if (!res.ok) { toast('没有找到私服，请在设置里手动指定', 'warn', 6000); }
    else toast(`已定位：${res.best.letheRoot}`, 'ok');
    await bootData();
  } catch (e) {
    toast(e.message, 'error');
    S.locating = false;
    render();
  }
}

async function bootData() {
  try {
    await loadStatus();
    if (!S.status.letheRoot) { S.locating = false; render(); return; }
    S.autoLocated = true;
    await Promise.all([loadHome(), loadMods(), loadDlls()]);
    await loadModDetail(S.selected);
    await refreshSession(S.selected);
    S.loading = false;
    S.locating = false;
    render();
  } catch (e) {
    S.loading = false;
    S.locating = false;
    render();
    toast(e.message, 'error', 6000);
  }
}

async function pollAutosave() {
  setInterval(async () => {
    if (!S.status?.letheRoot || !S.selected) return;
    try {
      const res = await api(`/api/autosave?name=${encodeURIComponent(S.selected)}`);
      const at = res.slot?.at;
      if (at && at !== S.autoAt && at !== S.lastSeenAuto) {
        S.lastSeenAuto = at;
        S.autoAt = at;
        toast(`已自动快照 ${S.selected}（${res.slot.files} 文件 · ${fmtBytes(res.slot.bytes)}）`, 'info', 6000);
        updateDock();
      }
    } catch { /* ignore */ }
  }, 20000);
}

async function checkRecover() {
  try {
    const res = await api('/api/recover-check');
    if (res.unclean && (res.mods || []).length) openRecover(res);
  } catch { /* ignore */ }
}

/* --------------------------------- 事件绑定 -------------------------------- */

document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-view]');
  if (nav && (nav.classList.contains('dock-item') || nav.classList.contains('nav-key'))) {
    S.view = nav.dataset.view;
    if (S.view === 'mods' && S.status?.letheRoot) loadModDetail(S.selected).then(() => render()).catch(() => render());
    else render();
    return;
  }
  const el = e.target.closest('[data-act]');
  if (el) {
    const fn = actions[el.dataset.act];
    if (fn) { Promise.resolve(fn(el)).catch((err) => toast(err.message, 'error')); }
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.closest('#personality-form')) { schedulePatch(); return; }
  if (t.id === 'skill-desc') { scheduleDesc(); return; }
  if (t.classList && t.classList.contains('coin-desc')) { scheduleCoinDesc(Number(t.dataset.index) || 0); return; }
  if (t.id === 'skill-search') { S.skillSearch = t.value; render(); refocus('skill-search', t.value.length); return; }
  if (t.id === 'module-search') { S.moduleSearch = t.value; render(); refocus('module-search', t.value.length); return; }
  if (t.id === 'passive-desc') { schedulePDesc(); return; }
  if (t.id === 'buff-desc') { scheduleBDesc(); return; }
  if (t.id === 'passive-search') { S.passiveSearch = t.value; render(); refocus('passive-search', t.value.length); return; }
  if (t.id === 'buff-search') { S.buffSearch = t.value; render(); refocus('buff-search', t.value.length); return; }
  if (t.id === 'module-search2') { S.moduleSearch2 = t.value; render(); refocus('module-search2', t.value.length); return; }
  if (t.dataset && t.dataset.pinfo) { schedulePInfo(); return; }
  if (t.dataset && t.dataset.binfo) { scheduleBInfo(); return; }
  if (t.dataset && t.dataset.info) { scheduleInfo(); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.info) { scheduleInfo(); return; }
  if (t.dataset && t.dataset.pinfo) { schedulePInfo(); return; }
  if (t.dataset && t.dataset.binfo) { scheduleBInfo(); return; }
  if (t.dataset && t.dataset.coin !== undefined && t.dataset.key) {
    const i = Number(t.dataset.coin);
    const c = (S.skill?.code?.coins || [])[i];
    if (!c) return;
    if (t.dataset.key === 'value') c.value = Number(t.value) || 0;
    if (t.dataset.key === 'color') c.color = t.value;
    saveCode().catch((err) => toast(err.message, 'error'));
  }
});

/* 拖拽置入（模块 → 技能区 / 硬币区） */

/* 指针拖拽：WebView2 里 HTML5 拖放不可靠，改用鼠标事件实现（模块列表 → 置入区） */
let pdrag = null;
let dragEndedAt = 0;
function clearDragVisual() {
  document.body.classList.remove('drag-active');
  document.querySelectorAll('.drop-zone.drop-hot').forEach((z) => z.classList.remove('drop-hot'));
  const g = document.getElementById('drag-ghost');
  if (g) g.remove();
  document.querySelectorAll('.module-item.selected').forEach((x) => x.classList.remove('selected'));
}
document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const it = e.target.closest('.module-item');
  if (!it) return;
  pdrag = { id: it.dataset.module, x0: e.clientX, y0: e.clientY, started: false, el: it };
});
document.addEventListener('mousemove', (e) => {
  if (!pdrag) return;
  if (!pdrag.started) {
    if (Math.hypot(e.clientX - pdrag.x0, e.clientY - pdrag.y0) < 5) return;
    pdrag.started = true;
    S.dragging = pdrag.id;
    document.body.classList.add('drag-active');
    pdrag.el.classList.add('selected');
    const g = document.createElement('div');
    g.id = 'drag-ghost';
    g.className = 'drag-ghost';
    g.textContent = (pdrag.el.querySelector('strong') || {}).textContent || '\u6a21\u5757';
    document.body.appendChild(g);
  }
  e.preventDefault();
  const g = document.getElementById('drag-ghost');
  if (g) { g.style.left = (e.clientX + 14) + 'px'; g.style.top = (e.clientY + 10) + 'px'; }
  const hit = document.elementFromPoint(e.clientX, e.clientY);
  const zone = hit && hit.closest ? hit.closest('.drop-zone') : null;
  document.querySelectorAll('.drop-zone.drop-hot').forEach((z) => { if (z !== zone) z.classList.remove('drop-hot'); });
  if (zone) zone.classList.add('drop-hot');
});
document.addEventListener('mouseup', (e) => {
  if (!pdrag) return;
  const st = pdrag;
  pdrag = null;
  const hit = document.elementFromPoint(e.clientX, e.clientY);
  const zone = hit && hit.closest ? hit.closest('.drop-zone') : null;
  clearDragVisual();
  if (!st.started) { if (S.dragging === st.id) S.dragging = null; return; }
  dragEndedAt = Date.now();
  S.dragging = null;
  if (zone) placeModule(st.id, zone.dataset.drop, zone.dataset.index);
});
document.addEventListener('click', (e) => {
  if (Date.now() - dragEndedAt < 300) return;
  const it = e.target.closest('.module-item');
  if (it) {
    const id = it.dataset.module;
    const on = S.dragging !== id;
    document.querySelectorAll('.module-item.selected').forEach((x) => x.classList.remove('selected'));
    S.dragging = on ? id : null;
    if (on) { it.classList.add('selected'); toast('\u5df2\u9009\u4e2d\u6a21\u5757\uff0c\u70b9\u51fb\u7f6e\u5165\u533a\u653e\u5165', 'ok'); }
    return;
  }
  const z = e.target.closest('.drop-zone');
  if (z && S.dragging) {
    const id = S.dragging;
    S.dragging = null;
    clearDragVisual();
    placeModule(id, z.dataset.drop, z.dataset.index);
  }
});

document.addEventListener('dragstart', (e) => {
  const it = e.target.closest('.module-item');
  if (!it) return;
  S.dragging = it.dataset.module;
  try { e.dataTransfer.setData('text/plain', S.dragging); e.dataTransfer.effectAllowed = 'copy'; } catch { /* ignore */ }
});
document.addEventListener('dragover', (e) => {
  const z = e.target.closest('.drop-zone');
  if (!z || !S.dragging) return;
  e.preventDefault();
  z.classList.add('drop-hot');
});
document.addEventListener('dragleave', (e) => {
  const z = e.target.closest('.drop-zone');
  if (z) z.classList.remove('drop-hot');
});
document.addEventListener('drop', (e) => {
  const z = e.target.closest('.drop-zone');
  if (!z) return;
  e.preventDefault();
  z.classList.remove('drop-hot');
  const mid = S.dragging || e.dataTransfer.getData('text/plain');
  S.dragging = null;
  if (!mid) return;
  placeModule(mid, z.dataset.drop, z.dataset.index);
});

document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  const editing = Boolean(S.personality)
    || Boolean(S.editKind === 'skill' && S.skill)
    || Boolean(S.editKind === 'passive' && S.passive)
    || Boolean(S.editKind === 'buff' && S.buff)
    || Boolean(S.editKind === 'module');
  if (k === 's' && editing) { e.preventDefault(); saveCurrent(); }
  else if (k === 'z' && editing) { e.preventDefault(); (e.shiftKey ? doRedo : doUndo)(); }
  else if (k === 'y' && editing) { e.preventDefault(); doRedo(); }
});

window.addEventListener('beforeunload', (e) => {
  if (S.session?.dirty) { e.preventDefault(); e.returnValue = '您有已执行的操作未保存，是否保存该改动？'; }
});

$('#btn-locate')?.addEventListener('click', () => locateAction({ quick: true }));
$('#btn-settings')?.addEventListener('click', () => openSettings());
window.addEventListener('resize', () => syncDockHeight());
window.addEventListener('load', () => syncDockHeight());

/* ---------------------------------- 启动 ---------------------------------- */

async function boot() {
  try {
    await loadStatus();
    document.documentElement.dataset.theme = S.status.theme || 'dark';
    if (!S.status.letheRoot) {
      S.autoLocated = true;
      S.locating = true;
      render();
      const res = await api('/api/locate', { method: 'POST', body: { quick: false } });
      if (!res.ok) { S.locating = false; S.autoLocated = true; render(); toast('没有自动找到私服，请在设置里手动指定', 'warn', 6000); return; }
      await bootData();
    } else {
      await bootData();
    }
    await checkRecover();
    pollAutosave();
  } catch (e) {
    toast(e.message, 'error', 8000);
    S.loading = false;
    render();
  }
}

boot();

/* ============================ v0.3 技能编辑 ============================ */

function refocus(id, pos) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(pos, pos); } catch { /* number 输入不支持选区 */ }
}

async function ensureKeywords() {
  if (S.keywords) return S.keywords;
  try { S.keywords = await api('/api/keywords'); }
  catch { S.keywords = { timings: [], tags: [], buffs: [], keywords: [], physical: [], sin: [], coinColors: [] }; }
  return S.keywords;
}

async function loadSkillList(name = S.selected) {
  if (!name) return;
  const res = await api('/api/skills?name=' + encodeURIComponent(name));
  S.skills = res.skills || [];
  S.modules = res.modules || [];
  S.skillDefaults = res.defaults || S.skillDefaults;
}

async function reloadSkill() {
  if (!S.selected || !S.skillId) return;
  const res = await api('/api/skill?name=' + encodeURIComponent(S.selected) + '&id=' + encodeURIComponent(S.skillId));
  S.skill = res.skill;
  await refreshSession(S.selected);
  await checkDesc();
}

async function openSkill(id) {
  const res = await api('/api/skill?name=' + encodeURIComponent(S.selected) + '&id=' + encodeURIComponent(id));
  S.skill = res.skill;
  S.skillId = String(id);
  S.sessionKey = 'skill:' + id;
  S.descCheck = null;
  S.descChecks = null;
  await refreshSession(S.selected);
  await checkDesc();
  render();
}

function filteredModules() {
  const q = (S.moduleSearch || '').trim().toLowerCase();
  return (S.modules || []).filter((m) => !q
    || String(m.description || '').toLowerCase().includes(q)
    || String(m.name || '').toLowerCase().includes(q)
    || String(m.id || '').toLowerCase().includes(q));
}

function moduleName(id) {
  const m = (S.modules || []).find((x) => x.id === id);
  return m ? (m.name || m.id) : id;
}

function renderSkillArea(back) {
  const skills = S.skills || [];
  const q = (S.skillSearch || '').trim().toLowerCase();
  const shown = skills.filter((sk) => !q || String(sk.id).includes(q) || String(sk.name || '').toLowerCase().includes(q));
  const rows = shown.map((sk) => '<button class="item skill-item ' + (S.skillId === String(sk.id) ? 'active' : '') + '" data-act="open-skill" data-id="' + esc(sk.id) + '">'
    + '<div class="item-main"><strong>' + esc(sk.name || sk.id) + '</strong><small>' + esc(sk.id)
    + (sk.override ? ' · 原版覆盖' : '') + (sk.coins ? ' · ' + sk.coins + ' 硬币' : '') + '</small></div>'
    + '<span class="state-dot ' + (sk.updatedAt ? 'on' : '') + '"></span></button>').join('');
  const mods = filteredModules().map((m) => '<div class="module-item" data-module="' + esc(m.id) + '">'
    + '<div class="m-head"><span class="tag ' + (m.test ? 'warn' : '') + '">' + (m.test ? '测试' : '模块') + '</span><strong>' + esc(m.name || m.id) + '</strong></div>'
    + '<p class="m-desc">' + esc(m.description || '') + '</p></div>').join('');
  const disabled = S.mods.find((m) => m.name === S.selected)?.enabled === false;
  return '<div class="pane-head">' + back
    + '<div><h2>技能编辑</h2><p class="muted">' + esc(S.selected || '') + '</p></div></div>'
    + (disabled ? '<div class="banner red">该 Mod 正在被禁用的状态 · 修改仍会保存到磁盘，但不会在游戏中生效</div>' : '')
    + '<div class="skill-wrap">'
    + '<section class="panel skill-list"><div class="panel-head">技能 <span class="count">' + skills.length + '</span></div>'
    + '<div class="panel-search"><input id="skill-search" class="search" placeholder="搜索 id / 名称" value="' + esc(S.skillSearch) + '"></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">还没有自定义技能</div>') + '</div>'
    + '<div class="panel-foot two"><button class="btn ghost sm" data-act="new-skill">＋ 新建</button><button class="btn ghost sm" data-act="import-skill">⇩ 导入</button></div></section>'
    + renderSkillMain()
    + '<section class="panel module-list"><div class="panel-head">模块列表 <span class="count">' + (S.modules || []).length + '</span></div>'
    + '<div class="panel-search"><input id="module-search" class="search" placeholder="搜索 [命中时] / 描述" value="' + esc(S.moduleSearch) + '"></div>'
    + '<div class="panel-body mods">' + (mods || '<div class="list-empty">没有模块</div>') + '</div>'
    + '<div class="panel-foot"><span class="hint muted">模块编辑尚未开放 · 3 个测试模块仅供拖拽演示，不产生实际效果</span></div></section>'
    + '</div>';
}

function renderSkillMain() {
  if (!S.skill) {
    return '<section class="panel skill-main"><div class="panel-head">技能</div><div class="panel-body">'
      + '<div class="empty-state"><div class="empty-mark">✦</div><p>从左侧选一个技能</p><small class="muted">或新建 / 从原版人格导入</small></div></div></section>';
  }
  const sk = S.skill;
  const info = sk.info || {};
  const code = sk.code || {};
  const sess = S.session || {};
  const optList = (arr, v) => (arr || []).map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  const field = (label, key, type, extra) => '<label class="field"><span>' + label + '</span><input type="' + (type || 'number') + '" data-info="' + key + '" value="' + esc(info[key]) + '" ' + (extra || '') + '></label>';
  const sel = (label, key, arr) => '<label class="field"><span>' + label + '</span><select data-info="' + key + '">' + optList(arr, info[key]) + '</select></label>';
  return '<section class="panel skill-main"><div class="panel-head skill-head">'
    + '<div class="skill-title"><strong>' + esc(sk.name || sk.id) + '</strong><small>' + esc(sk.id) + (sk.override ? ' · 原版覆盖' : '') + '</small></div>'
    + '<span class="spacer"></span>'
    + '<button class="btn ghost sm" data-act="undo"' + (sess.undo ? '' : ' disabled') + '>撤销</button>'
    + '<button class="btn ghost sm" data-act="redo"' + (sess.redo ? '' : ' disabled') + '>重做</button>'
    + '<button class="btn primary sm" data-act="save-personality">保存</button>'
    + '<span class="session-state ' + (sess.dirty ? 'dirty' : '') + '" id="session-state">' + (sess.dirty ? '有未保存改动' : '已保存') + '</span></div>'
    + '<div class="skill-body"><div class="info-card skill-info"><div class="col-title">基础信息</div><div class="grid-2">'
    + field('基础威力', 'basePower') + field('硬币数量', 'coinCount', 'number', 'min="1" max="12"')
    + field('攻击修正值', 'atkCorrection') + field('攻击容量', 'targetNum')
    + sel('物理属性', 'physical', S.keywords?.physical || []) + sel('罪孽属性', 'sin', S.keywords?.sin || [])
    + sel('正负硬币技能', 'sign', [{ id: 'positive', zh: '正面硬币' }, { id: 'negative', zh: '反面硬币' }])
    + '</div><div class="hint muted">技能名与 id 在创建时确定；名称本地化维护在后续版本提供。</div></div>'
    + '<div class="editor-card"><div class="tabs">'
    + '<button class="tab ' + (S.skillTab === 'code' ? 'active' : '') + '" data-act="skill-tab" data-tab="code">代码</button>'
    + '<button class="tab ' + (S.skillTab === 'desc' ? 'active' : '') + '" data-act="skill-tab" data-tab="desc">描述</button></div>'
    + (S.skillTab === 'desc' ? renderSkillDesc(sk) : renderSkillCode(code))
    + '</div></div></section>';
}

function chipHtml(arr, zone, idx) {
  return (arr || []).map((mid) => '<span class="chip">' + esc(moduleName(mid))
    + '<button class="chip-x" data-act="remove-placed" data-zone="' + zone + '" data-index="' + idx + '" data-mid="' + esc(mid) + '">×</button></span>').join('');
}

function renderSkillCode(code) {
  const colors = S.keywords?.coinColors || [{ id: 'GREY', zh: '灰' }];
  const skillZone = '<div class="drop-zone skill-zone" data-drop="skill">'
    + (chipHtml(code.skill, 'skill', -1) || '<span class="dz-hint">把模块拖到这里：作用于技能本身</span>') + '</div>';
  const coins = (code.coins || []).map((c, i) => '<div class="coin-card"><div class="coin-head"><strong>硬币 ' + (i + 1) + '</strong>'
    + '<select data-coin="' + i + '" data-key="color">'
    + colors.map((x) => '<option value="' + esc(x.id) + '"' + (String(c.color) === String(x.id) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('')
    + '</select><label class="inline-field">变动值 <input type="number" data-coin="' + i + '" data-key="value" value="' + esc(c.value ?? 0) + '"></label></div>'
    + '<div class="drop-zone coin-zone" data-drop="coin" data-index="' + i + '">'
    + (chipHtml(c.modules, 'coin', i) || '<span class="dz-hint">拖入模块：作用于这枚硬币</span>') + '</div></div>').join('');
  return '<div class="code-wrap"><div class="code-col"><div class="col-title">技能置入区</div>' + skillZone + '</div>'
    + '<div class="coin-col"><div class="col-title">硬币置入区 <span class="muted">（数量由「硬币数量」决定）</span></div>'
    + (coins || '<div class="list-empty">硬币数量至少为 1</div>') + '</div></div>'
    + '<div class="hint muted">从右侧模块列表拖入。硬币颜色与变动值目前是占位数据，编辑器↔游戏映射留待后续版本。</div>';
}

function highlightText(text, tokens) {
  if (!tokens || !tokens.length) return esc(text);
  let out = '';
  let idx = 0;
  for (const t of tokens) {
    const at = text.indexOf(t.raw, idx);
    if (at < 0) continue;
    out += esc(text.slice(idx, at));
    const cls = t.kind === 'unknown' ? 'kw-bad'
      : t.kind === 'timing' ? 'kw-timing'
        : t.kind === 'tag' ? 'kw-tag'
          : t.kind === 'keyword' ? 'kw-kw' : 'kw-buff';
    out += '<span class="' + cls + '" title="' + esc(t.id || '未识别') + '">' + esc(t.raw) + '</span>';
    idx = at + t.raw.length;
  }
  return out + esc(text.slice(idx));
}

function descTextOf(sk) {
  if (!sk) return '';
  return typeof sk.description === 'string' ? sk.description : '';
}
function coinDescOf(sk, i) {
  const arr = (sk && Array.isArray(sk.coinDescs)) ? sk.coinDescs : [];
  return typeof arr[i] === 'string' ? arr[i] : '';
}
function coinDescCount(sk) {
  const n = (sk && sk.code && Array.isArray(sk.code.coins)) ? sk.code.coins.length : 0;
  return Math.max(0, n);
}
function descStateOf(kind, i) {
  const all = S.descChecks || {};
  if (kind === 'skill') return all.skill || { tokens: [], unknown: [], game: '' };
  return (all.coins && all.coins[i]) || { tokens: [], unknown: [], game: '' };
}
function descCheckHtml(st) {
  const unk = st.unknown || [];
  const okCount = (st.tokens || []).filter((t) => t.kind !== 'unknown').length;
  return '<div class="desc-check ' + (unk.length ? 'bad' : 'ok') + '">'
    + (unk.length ? '⚠ 有 ' + unk.length + ' 个关键词未识别：' + unk.map((u) => '[' + u + ']').join(' ')
      : '✓ 关键词检查通过（' + okCount + ' 个）')
    + '</div>';
}
function renderSkillDesc(sk) {
  const text = descTextOf(sk);
  const st = descStateOf('skill');
  const n = coinDescCount(sk);
  const coins = [];
  for (let i = 0; i < n; i += 1) {
    const ct = coinDescOf(sk, i);
    const cst = descStateOf('coin', i);
    coins.push('<div class="coin-desc-card">'
      + '<div class="coin-desc-head"><span class="cd-tag">硬币 ' + (i + 1) + '</span><span class="muted">这一枚硬币命中/使用时显示的描述</span></div>'
      + '<textarea id="coin-desc-' + i + '" class="desc-input coin-desc" data-index="' + i + '" spellcheck="false" rows="3" placeholder="例如：[命中时]对目标施加1层[烧伤]">' + esc(ct) + '</textarea>'
      + '<div class="desc-preview" id="coin-preview-' + i + '">' + highlightText(ct, cst.tokens || []) + '</div>'
      + '<div class="coin-check" id="coin-check-' + i + '">' + descCheckHtml(cst) + '</div>'
      + '</div>');
  }
  const gameAll = [st.game || '', ...Array.from({ length: n }, (_, i) => descStateOf('coin', i).game || '')].filter(Boolean).join('\n');
  return '<div class="desc-wrap">'
    + '<div class="desc-block"><div class="desc-block-head"><strong>技能描述</strong><span class="muted">技能本体（非硬币）的说明文本，用 [关键词] 书写</span></div>'
    + '<textarea id="skill-desc" class="desc-input" spellcheck="false" rows="6" placeholder="例如：[使用时]使本技能的硬币威力+1">' + esc(text) + '</textarea>'
    + '<div class="desc-preview" id="desc-preview">' + highlightText(text, st.tokens || []) + '</div>'
    + '<div id="desc-check">' + descCheckHtml(st) + '</div></div>'
    + '<div class="desc-block"><div class="desc-block-head"><strong>硬币描述</strong><span class="muted">数量跟随「硬币数量」，每枚硬币一段</span></div>'
    + '<div class="coin-desc-grid">' + (coins.join('') || '<div class="muted" style="padding:8px 2px">当前技能还没有硬币；把「硬币数量」调到 1 以上即可</div>') + '</div></div>'
    + '<details class="game-text"><summary>游戏内文本预览（关键词已转为英文 id）</summary><pre id="game-text">' + esc(gameAll) + '</pre></details>'
    + '<div class="hint muted">描述改动在停止输入后写入磁盘并记入撤销历史；代码区（拖拽）不进撤销。</div></div>';
}
let descTimer = null;
let coinTimer = null;
let infoTimer = null;

function scheduleDesc() {
  clearTimeout(descTimer);
  descTimer = setTimeout(() => flushDesc().catch((e) => toast(e.message, 'error')), 700);
}

async function flushDesc() {
  if (!S.skill) return;
  const ta = $('#skill-desc');
  const text = ta ? ta.value : descTextOf(S.skill);
  if (ta && text === descTextOf(S.skill)) return;
  const res = await api('/api/skill/meta', { method: 'POST', body: { name: S.selected, id: S.skillId, description: text } });
  S.skill = { ...S.skill, description: text, coinDescs: res.meta.coinDescs || S.skill.coinDescs };
  S.session = res.session;
  await analyzeAll();
  updateSkillDom();
}

function scheduleCoinDesc(index) {
  clearTimeout(coinTimer);
  coinTimer = setTimeout(() => flushCoinDesc(index).catch((e) => toast(e.message, 'error')), 700);
}

async function flushCoinDesc(index) {
  if (!S.skill) return;
  const all = Array.from({ length: coinDescCount(S.skill) }, (_, i) => {
    const ta = document.getElementById('coin-desc-' + i);
    return ta ? ta.value : coinDescOf(S.skill, i);
  });
  const res = await api('/api/skill/meta', { method: 'POST', body: { name: S.selected, id: S.skillId, coinDescs: all } });
  S.skill = { ...S.skill, coinDescs: res.meta.coinDescs || all };
  S.session = res.session;
  await analyzeAll();
  updateSkillDom(index);
}

async function checkText(text) {
  if (!text) return { tokens: [], unknown: [], game: '' };
  const res = await api('/api/description/check', { method: 'POST', body: { text } });
  return { tokens: res.tokens || [], unknown: res.unknown || [], game: res.game || '' };
}

async function analyzeAll() {
  if (!S.skill) return;
  const skillText = descTextOf(S.skill);
  const n = coinDescCount(S.skill);
  const [skillState, ...coinStates] = await Promise.all([
    checkText(skillText),
    ...Array.from({ length: n }, (_, i) => checkText(coinDescOf(S.skill, i))),
  ]);
  S.descChecks = { skill: skillState, coins: coinStates };
  S.descCheck = skillState;
}

function checkDesc() { return analyzeAll(); }

function scheduleInfo() {
  clearTimeout(infoTimer);
  infoTimer = setTimeout(() => flushInfo().catch((e) => toast(e.message, 'error')), 400);
}

async function flushInfo() {
  if (!S.skill) return;
  const card = $('.skill-info');
  if (!card) return;
  const info = {};
  $$('[data-info]', card).forEach((el) => {
    const k = el.dataset.info;
    info[k] = el.tagName === 'SELECT' ? el.value : Number(el.value);
  });
  const res = await api('/api/skill/meta', { method: 'POST', body: { name: S.selected, id: S.skillId, info } });
  const oldCount = (S.skill.code?.coins || []).length;
  S.skill = { ...S.skill, info: res.meta.info, code: res.meta.code, coinDescs: res.meta.coinDescs || S.skill.coinDescs };
  S.session = res.session;
  updateSkillDom();
  if ((res.meta.code?.coins || []).length !== oldCount) render();
}

function updateSkillDom() {
  const sess = S.session || {};
  const hint = $('#session-state');
  if (hint) {
    hint.textContent = sess.dirty ? '有未保存改动' : '已保存';
    hint.className = 'session-state ' + (sess.dirty ? 'dirty' : '');
  }
  const undoBtn = $('[data-act="undo"]');
  const redoBtn = $('[data-act="redo"]');
  if (undoBtn) undoBtn.disabled = !(Number(sess.undo) > 0);
  if (redoBtn) redoBtn.disabled = !(Number(sess.redo) > 0);
  const prev = $('#desc-preview');
  if (prev && S.skill) prev.innerHTML = highlightText(descTextOf(S.skill), descStateOf('skill').tokens || []);
  const chk = $('#desc-check');
  if (chk) chk.innerHTML = descCheckHtml(descStateOf('skill'));
  const n = S.skill ? coinDescCount(S.skill) : 0;
  for (let i = 0; i < n; i += 1) {
    const pv = document.getElementById('coin-preview-' + i);
    if (pv) pv.innerHTML = highlightText(coinDescOf(S.skill, i), descStateOf('coin', i).tokens || []);
    const ck = document.getElementById('coin-check-' + i);
    if (ck) ck.innerHTML = descCheckHtml(descStateOf('coin', i));
  }
  const game = $('#game-text');
  if (game) {
    const all = [descStateOf('skill').game || '', ...Array.from({ length: n }, (_, i) => descStateOf('coin', i).game || '')].filter(Boolean);
    game.textContent = all.join('\n');
  }
  updateDock();
}

function placeModule(mid, zone, index) {
  if (zone === 'passive') return placeModuleSimple(mid, 'passive');
  if (zone === 'buff') return placeModuleSimple(mid, 'buff');
  if (!S.skill) { toast('请先选择一个技能', 'warn'); return; }
  const code = S.skill.code || (S.skill.code = { skill: [], coins: [] });
  if (zone === 'skill') {
    code.skill = code.skill || [];
    if (code.skill.includes(mid)) { toast('这个模块已经在技能区了', 'warn'); return; }
    code.skill.push(mid);
  } else {
    const c = (code.coins || [])[Number(index)];
    if (!c) return;
    c.modules = c.modules || [];
    if (c.modules.includes(mid)) { toast('这个模块已经在这枚硬币里了', 'warn'); return; }
    c.modules.push(mid);
  }
  toast('已置入：' + moduleName(mid), 'ok');
  saveCode().catch((e) => toast(e.message, 'error'));
}

function removePlaced(zone, index, mid) {
  if (zone === 'passive' || zone === 'buff') {
    const doc = zone === 'passive' ? S.passive : S.buff;
    if (!doc) return;
    doc.code = doc.code || { modules: [] };
    doc.code.modules = (doc.code.modules || []).filter((x) => x !== mid);
    saveSimpleCode(zone).catch((e) => toast(e.message, 'error'));
    return;
  }
  if (!S.skill) return;
  const code = S.skill.code || {};
  if (zone === 'skill') code.skill = (code.skill || []).filter((x) => x !== mid);
  else {
    const c = (code.coins || [])[Number(index)];
    if (c) c.modules = (c.modules || []).filter((x) => x !== mid);
  }
  saveCode().catch((e) => toast(e.message, 'error'));
}

async function saveCode() {
  if (!S.skill) return;
  const code = S.skill.code || {};
  const res = await api('/api/skill/code', {
    method: 'POST',
    body: { name: S.selected, id: S.skillId, code: { skill: code.skill || [], coins: code.coins || [] } },
  });
  S.skill = { ...S.skill, code: res.meta.code, info: res.meta.info };
  render();
}

async function saveCurrent() {
  if (S.editKind === 'passive' && S.passive) { await savePassiveCurrent(); return; }
  if (S.editKind === 'buff' && S.buff) { await saveBuffCurrent(); return; }
  if (S.editKind === 'skill' && S.skill) {
    await flushDesc();
    await checkDesc();
    const unknownAll = collectUnknown();
    if (unknownAll.length) { openRiskSave(unknownAll); return; }
    await commitSkill();
    return;
  }
  if (!S.personality) return;
  await flushPatch();
  const res = await api('/api/personality/save', { method: 'POST', body: { name: S.selected, id: S.personalityId } });
  S.session = res.session;
  toast('已保存，撤销历史已清空', 'ok');
  render();
}

async function commitSkill() {
  const res = await api('/api/skill/save', { method: 'POST', body: { name: S.selected, id: S.skillId } });
  S.session = res.session;
  toast('已保存，撤销历史已清空', 'ok');
  render();
}

function collectUnknown() {
  const out = [];
  const ds = S.descChecks || {};
  (ds.skill && ds.skill.unknown ? ds.skill.unknown : []).forEach((u) => out.push({ where: '技能描述', word: u }));
  (ds.coins || []).forEach((c, i) => (c && c.unknown ? c.unknown : []).forEach((u) => out.push({ where: '硬币 ' + (i + 1) + ' 描述', word: u })));
  return out;
}

function openRiskSave(items) {
  const unk = items || collectUnknown();
  modal({
    title: '保存检查',
    body: '<p><strong>有错误的关键词输入，请检查拼写。</strong></p>'
      + '<div class="person-list">' + unk.map((u) => '<div class="check-row"><span class="kw-bad">[' + esc(u.word) + ']</span><small>' + esc(u.where) + ' · 未在时点表 / Buff 表中找到</small></div>').join('') + '</div>'
      + '<div class="hint muted">无视风险保存后，未命中的关键词不做翻译处理，游戏内会按原文显示。</div>',
    footer: '<button class="btn ghost" data-act="close-modal">返回修改</button><button class="btn warn" data-act="risk-save-skill">无视风险保存</button>',
  });
}

async function riskSave() {
  closeModal();
  await commitSkill();
}

async function doUndo() {
  if (!S.selected || !S.sessionKey) return;
  try {
    await api('/api/undo', { method: 'POST', body: { name: S.selected, key: S.sessionKey } });
    if (S.editKind === 'skill' && S.skill) await reloadSkill();
    else if (S.editKind === 'passive' && S.passive) await reloadPassive();
    else if (S.editKind === 'buff' && S.buff) await reloadBuff();
    else if (S.personality) await loadPersonality(S.selected, S.personalityId);
    toast('已撤销', 'info');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

async function doRedo() {
  if (!S.selected || !S.sessionKey) return;
  try {
    await api('/api/redo', { method: 'POST', body: { name: S.selected, key: S.sessionKey } });
    if (S.editKind === 'skill' && S.skill) await reloadSkill();
    else if (S.editKind === 'passive' && S.passive) await reloadPassive();
    else if (S.editKind === 'buff' && S.buff) await reloadBuff();
    else if (S.personality) await loadPersonality(S.selected, S.personalityId);
    toast('已重做', 'info');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

function openCreateSkill() {
  modal({
    title: '新建技能',
    body: '<div class="form">'
      + '<label class="field"><span>技能 id（必填，编辑器会与游戏内全部技能查重）</span><input id="ns-id" placeholder="例如 2090111" autocomplete="off"></label>'
      + '<label class="field"><span>技能名（显示名）</span><input id="ns-name" placeholder="例如 灼热斩击" autocomplete="off"></label>'
      + '<div class="hint muted">写入 ' + esc(S.selected || '') + ' 的 custom_limbus_data/skill 与 custom_limbus_locale/EN/skillList。要修改原版技能请用「导入」而不是新建同 id 技能。</div>'
      + '</div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-create-skill">创建</button>',
  });
}

async function submitCreateSkill() {
  const id = ($('#ns-id')?.value || '').trim();
  const displayName = ($('#ns-name')?.value || '').trim();
  if (!id) { toast('请填写技能 id', 'warn'); return; }
  const res = await api('/api/skill/create', { method: 'POST', body: { name: S.selected, id, displayName } });
  closeModal();
  toast('技能 ' + id + ' 已创建', 'ok');
  await loadSkillList();
  await openSkill(id);
}

async function openImportSkill() {
  if (!S.vanilla?.characters) { try { await loadVanilla(1); } catch { /* ignore */ } }
  S.imp = { kind: 'vanilla', characterId: 1, personalityId: '', mod: '', personalities: [], skills: [] };
  modal({
    title: '导入技能',
    wide: true,
    body: '<div class="tabs import-tabs">'
      + '<button class="tab active" data-act="import-kind" data-kind="vanilla" id="imp-tab-vanilla">从原版人格导入</button>'
      + '<button class="tab" data-act="import-kind" data-kind="mod" id="imp-tab-mod">从自定义文件导入</button>'
      + '</div><div id="import-body">加载中…</div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-import-skill">导入所选</button>',
  });
  renderImportBody();
  await loadImportPersonalities(1);
}

function renderImportBody() {
  const imp = S.imp;
  const el = $('#import-body');
  if (!imp || !el) return;
  if (imp.kind === 'vanilla') {
    const chars = (S.vanilla?.characters || []).filter((c) => Number(c.id) >= 1 && Number(c.id) <= 12);
    el.innerHTML = '<div class="grid-2">'
      + '<label class="field"><span>罪人</span><select id="imp-sinner">'
      + chars.map((c) => '<option value="' + c.id + '"' + (Number(imp.characterId) === Number(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('')
      + '</select></label><label class="field"><span>人格</span><select id="imp-personality">'
      + ((imp.personalities || []).map((p) => '<option value="' + esc(p.id) + '"' + (String(imp.personalityId) === String(p.id) ? ' selected' : '') + '>' + esc(p.name || p.id) + '</option>').join('') || '<option value="">（先选罪人）</option>')
      + '</select></label></div><div class="person-list">'
      + ((imp.skills || []).map((sk) => '<label class="check-row"><input type="checkbox" data-import-id="' + esc(sk.id) + '"><strong>' + esc(sk.name || sk.id) + '</strong><small>' + esc(sk.id) + '</small></label>').join('') || '<div class="list-empty">没有可选技能</div>')
      + '</div><div class="hint muted">原版技能导入后保持原 id，在游戏中会覆盖原版技能。</div>';
  } else {
    const others = (S.mods || []).filter((m) => m.name !== S.selected);
    el.innerHTML = '<label class="field"><span>来源 Mod</span><select id="imp-mod">'
      + (others.map((m) => '<option value="' + esc(m.name) + '"' + (imp.mod === m.name ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') || '<option value="">（没有其他 Mod）</option>')
      + '</select></label><div class="person-list">'
      + ((imp.skills || []).map((sk) => '<label class="check-row"><input type="checkbox" data-import-id="' + esc(sk.id) + '"><strong>' + esc(sk.name || sk.id) + '</strong><small>' + esc(sk.id) + (sk.override ? ' · 原版覆盖' : '') + '</small></label>').join('') || '<div class="list-empty">没有可选技能</div>')
      + '</div><div class="hint muted">从其他 Mod 复制技能实体与本地化条目；id 保持不变。</div>';
  }
  const tv = $('#imp-tab-vanilla');
  const tm = $('#imp-tab-mod');
  if (tv) tv.className = 'tab' + (imp.kind === 'vanilla' ? ' active' : '');
  if (tm) tm.className = 'tab' + (imp.kind === 'mod' ? ' active' : '');
}

async function loadImportPersonalities(characterId) {
  const res = await api('/api/vanilla?characterId=' + encodeURIComponent(characterId));
  S.imp.characterId = Number(characterId);
  S.imp.personalities = res.personalities || [];
  S.imp.personalityId = S.imp.personalities[0]?.id || '';
  renderImportBody();
  if (S.imp.personalityId) await loadImportSkillsVanilla(S.imp.personalityId);
}

async function loadImportSkillsVanilla(personalityId) {
  const res = await api('/api/vanilla-skills?personalityId=' + encodeURIComponent(personalityId));
  S.imp.personalityId = String(personalityId);
  S.imp.skills = res.skills || [];
  renderImportBody();
}

async function loadImportSkillsMod(mod) {
  if (!mod) { S.imp.skills = []; renderImportBody(); return; }
  const res = await api('/api/skills?name=' + encodeURIComponent(mod));
  S.imp.mod = mod;
  S.imp.skills = res.skills || [];
  renderImportBody();
}

async function submitImportSkill() {
  const ids = $$('[data-import-id]').filter((el) => el.checked).map((el) => el.dataset.importId);
  if (!ids.length) { toast('请先勾选要导入的技能', 'warn'); return; }
  const src = { kind: S.imp.kind, mod: S.imp.kind === 'mod' ? S.imp.mod : undefined };
  if (S.imp.kind === 'vanilla' && !(await confirmOverwrite(ids))) return;
  const res = await api('/api/skill/import', { method: 'POST', body: { name: S.selected, ids, source: src } });
  closeModal();
  toast('已导入 ' + (res.imported?.length || ids.length) + ' 个技能', 'ok');
  await loadSkillList();
  const first = res.imported && res.imported[0];
  if (first) await openSkill(first);
}

function confirmOverwrite(ids) {
  return new Promise((resolve) => {
    const m = modal({
      title: '覆盖原版技能',
      body: '<p>以下技能会以原 id 写入当前 Mod，游戏内将<strong>覆盖原版技能</strong>：</p><div class="person-list">'
        + ids.map((id) => '<div class="check-row"><strong>' + esc(id) + '</strong></div>').join('') + '</div>'
        + '<div class="hint muted">导入不改变原版 id。</div>',
      footer: '<button class="btn ghost" data-act="cancel-import">取消</button><button class="btn primary" data-act="confirm-import">确认导入</button>',
    });
    void m;
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      if (el.dataset.act === 'confirm-import') { closeModal(); resolve(true); }
      else if (el.dataset.act === 'cancel-import' || el.dataset.act === 'close-modal') { closeModal(); resolve(false); }
    }, { once: false });
  });
}

document.addEventListener('change', (e) => {
  const t = e.target;
  if (!S.imp || !t.id) return;
  if (t.id === 'imp-sinner') { S.imp.characterId = Number(t.value); loadImportPersonalities(Number(t.value)).catch((err) => toast(err.message, 'error')); }
  else if (t.id === 'imp-personality') { S.imp.personalityId = t.value; loadImportSkillsVanilla(t.value).catch((err) => toast(err.message, 'error')); }
  else if (t.id === 'imp-mod') { S.imp.mod = t.value; loadImportSkillsMod(t.value).catch((err) => toast(err.message, 'error')); }
});
/* ====================== v0.4 模块 / 被动 / Buff 编辑 ====================== */

Object.assign(S, {
  modulesLoaded: false,
  moduleEditing: null,
  moduleSearch2: '',
  passives: [], passive: null, passiveId: null, passiveTab: 'code', passiveSearch: '',
  passiveDefaults: null, pDescCheck: null,
  buffs: [], buff: null, buffId: null, buffTab: 'code', buffSearch: '',
  buffDefaults: null, bDescCheck: null,
});

async function loadModules(force = false) {
  if (S.modulesLoaded && !force) return;
  const res = await api('/api/modules');
  S.modules = res.modules || [];
  S.modulesLoaded = true;
}

async function loadPassiveList(name = S.selected) {
  if (!name) return;
  const res = await api('/api/passives?name=' + encodeURIComponent(name));
  S.passives = res.passives || [];
  S.modules = res.modules || [];
  S.passiveDefaults = res.defaults || S.passiveDefaults;
  S.modulesLoaded = true;
}

async function loadBuffList(name = S.selected) {
  if (!name) return;
  const res = await api('/api/buffs?name=' + encodeURIComponent(name));
  S.buffs = res.buffs || [];
  S.modules = res.modules || [];
  S.buffDefaults = res.defaults || S.buffDefaults;
  S.modulesLoaded = true;
}

async function openPassive(id) {
  const res = await api('/api/passive?name=' + encodeURIComponent(S.selected) + '&id=' + encodeURIComponent(id));
  S.passive = res.passive;
  S.passiveId = String(id);
  S.sessionKey = 'passive:' + id;
  S.pDescCheck = null;
  await refreshSession(S.selected);
  await checkPDesc();
  render();
}

async function reloadPassive() {
  if (!S.selected || !S.passiveId) return;
  const res = await api('/api/passive?name=' + encodeURIComponent(S.selected) + '&id=' + encodeURIComponent(S.passiveId));
  S.passive = res.passive;
  await refreshSession(S.selected);
  await checkPDesc();
}

async function openBuff(id) {
  const res = await api('/api/buff?name=' + encodeURIComponent(S.selected) + '&id=' + encodeURIComponent(id));
  S.buff = res.buff;
  S.buffId = String(id);
  S.sessionKey = 'buff:' + id;
  S.bDescCheck = null;
  await refreshSession(S.selected);
  await checkBDesc();
  render();
}

async function reloadBuff() {
  if (!S.selected || !S.buffId) return;
  const res = await api('/api/buff?name=' + encodeURIComponent(S.selected) + '&id=' + encodeURIComponent(S.buffId));
  S.buff = res.buff;
  await refreshSession(S.selected);
  await checkBDesc();
}

function filteredModules2() {
  const q = (S.moduleSearch2 || '').trim().toLowerCase();
  return (S.modules || []).filter((m) => !q
    || String(m.description || '').toLowerCase().includes(q)
    || String(m.name || '').toLowerCase().includes(q)
    || String(m.id || '').toLowerCase().includes(q));
}

function renderModulePanel(searchId, value) {
  const mods = filteredModules2().map((m) => '<div class="module-item" data-module="' + esc(m.id) + '">'
    + '<div class="m-head"><span class="tag ' + (m.test ? 'warn' : '') + '">' + (m.test ? '测试' : '模块') + '</span><strong>' + esc(m.name || m.id) + '</strong></div>'
    + '<p class="m-desc">' + esc(m.description || '') + '</p></div>').join('');
  return '<section class="panel module-list"><div class="panel-head">模块列表 <span class="count">' + (S.modules || []).length + '</span></div>'
    + '<div class="panel-search"><input id="' + searchId + '" class="search" placeholder="搜索 [命中时] / 描述" value="' + esc(value) + '"></div>'
    + '<div class="panel-body mods">' + (mods || '<div class="list-empty">没有模块</div>') + '</div>'
    + '<div class="panel-foot"><span class="hint muted">模块由「模块编辑」制作；测试模块仅供拖拽演示，不产生实际效果</span></div></section>';
}

/* ------------------------------ 模块编辑 ------------------------------ */

function renderModuleArea(back) {
  const rows = (S.modules || []).map((m) => '<button class="item ' + (S.moduleEditing === m.id ? 'active' : '') + '" data-act="open-module" data-id="' + esc(m.id) + '">'
    + '<div class="item-main"><strong>' + esc(m.name || m.id) + '</strong><small>' + esc(m.id) + (m.test ? ' · 测试' : '') + '</small></div></button>').join('');
  return '<div class="pane-head">' + back + '<div><h2>模块编辑</h2><p class="muted">可执行词条块 · 由技能 / 被动 / Buff 引用</p></div></div>'
    + '<div class="module-wrap"><section class="panel"><div class="panel-head">模块 <span class="count">' + (S.modules || []).length + '</span></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">还没有模块</div>') + '</div>'
    + '<div class="panel-foot"><button class="btn ghost block" data-act="new-module">＋ 新建模块</button></div></section>'
    + renderModuleForm() + '</div>';
}

function renderModuleForm() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m) {
    return '<section class="panel"><div class="panel-body"><div class="empty-state"><div class="empty-mark">▤</div><p>从左侧选一个模块</p><small class="muted">或新建模块</small></div></div></section>';
  }
  const timings = S.keywords?.timings || [];
  const kinds = S.keywords?.moduleKinds || [{ id: 'skill', zh: '技能' }, { id: 'passive', zh: '被动' }, { id: 'buff', zh: 'Buff' }];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  const ro = m.test ? ' disabled' : '';
  return '<section class="panel module-form"><div class="panel-head"><strong>' + esc(m.name || m.id) + '</strong><span class="spacer"></span>'
    + (m.test ? '<span class="tag warn">测试模块 · 只读</span>' : '<button class="btn ok sm" data-act="save-module">保存</button><button class="btn danger sm" data-act="delete-module">删除</button>')
    + '</div><div class="panel-body"><div class="form">'
    + '<label class="field"><span>模块名称</span><input id="mod-name" value="' + esc(m.name || '') + '"' + ro + '></label>'
    + '<div class="grid-2">'
    + '<label class="field"><span>所属前缀（时点）</span><select id="mod-prefix"' + ro + '><option value="">（未指定）</option>' + opt(timings, m.prefix) + '</select></label>'
    + '<label class="field"><span>适用类型</span><select id="mod-kind"' + ro + '>' + opt(kinds, m.kind) + '</select></label>'
    + '</div>'
    + '<label class="field"><span>模块描述（可执行词条）</span><textarea id="mod-desc" class="desc-input" rows="6" spellcheck="false"' + ro + ' placeholder="例如：[使用时]若目标的[烧伤]强度与[震颤]强度之和不低于6级，则使本技能的硬币威力+1">' + esc(m.desc || '') + '</textarea></label>'
    + '<div class="hint muted">改动点「保存」后写入模块库；测试模块不可修改与删除。</div>'
    + '</div></div></section>';
}

/* ------------------------------ 被动编辑 ------------------------------ */

function renderPassiveArea(back) {
  const q = (S.passiveSearch || '').trim().toLowerCase();
  const rows = (S.passives || []).filter((p) => !q || String(p.id).includes(q) || String(p.name || '').toLowerCase().includes(q))
    .map((p) => '<button class="item ' + (S.passiveId === String(p.id) ? 'active' : '') + '" data-act="open-passive" data-id="' + esc(p.id) + '">'
      + '<div class="item-main"><strong>' + esc(p.name || p.id) + '</strong><small>' + esc(p.id)
      + (p.override ? ' · 原版覆盖' : '') + (p.scripts ? ' · ' + p.scripts + ' 模块' : '') + '</small></div>'
      + '<span class="state-dot ' + (p.updatedAt ? 'on' : '') + '"></span></button>').join('');
  const disabled = S.mods.find((m) => m.name === S.selected)?.enabled === false;
  return '<div class="pane-head">' + back + '<div><h2>被动编辑</h2><p class="muted">' + esc(S.selected || '') + '</p></div></div>'
    + (disabled ? '<div class="banner red">该 Mod 正在被禁用的状态 · 修改仍会保存到磁盘，但不会在游戏中生效</div>' : '')
    + '<div class="skill-wrap">'
    + '<section class="panel"><div class="panel-head">被动 <span class="count">' + (S.passives || []).length + '</span></div>'
    + '<div class="panel-search"><input id="passive-search" class="search" placeholder="搜索 id / 被动名" value="' + esc(S.passiveSearch) + '"></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">还没有自定义被动</div>') + '</div>'
    + '<div class="panel-foot two"><button class="btn ghost sm" data-act="new-passive">＋ 新建</button><button class="btn ghost sm" data-act="import-passive">⇩ 导入</button></div></section>'
    + renderPassiveMain()
    + renderModulePanel('module-search2', S.moduleSearch2)
    + '</div>';
}

function renderPassiveMain() {
  if (!S.passive) {
    return '<section class="panel skill-main"><div class="panel-head">被动</div><div class="panel-body">'
      + '<div class="empty-state"><div class="empty-mark">◇</div><p>从左侧选一个被动</p><small class="muted">或新建 / 导入</small></div></div></section>';
  }
  const p = S.passive;
  const info = p.info || {};
  const sess = S.session || {};
  const sins = S.keywords?.sin || [];
  const cts = S.keywords?.passiveConditions || [{ id: 'have', zh: '拥有' }, { id: 'resonance', zh: '共鸣' }];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  return '<section class="panel skill-main"><div class="panel-head skill-head">'
    + '<div class="skill-title"><strong>' + esc(p.name || p.id) + '</strong><small>' + esc(p.id) + (p.override ? ' · 原版覆盖' : '') + '</small></div>'
    + '<span class="spacer"></span>'
    + '<button class="btn ghost sm" data-act="undo"' + (sess.undo ? '' : ' disabled') + '>撤销</button>'
    + '<button class="btn ghost sm" data-act="redo"' + (sess.redo ? '' : ' disabled') + '>重做</button>'
    + '<button class="btn primary sm" data-act="save-passive">保存</button>'
    + '<span class="session-state ' + (sess.dirty ? 'dirty' : '') + '" id="session-state">' + (sess.dirty ? '有未保存改动' : '已保存') + '</span></div>'
    + '<div class="skill-body"><div class="info-card"><div class="col-title">被动基础信息</div>'
    + '<label class="field check"><input type="checkbox" data-pinfo="needCondition"' + (info.needCondition ? ' checked' : '') + '><span>需要罪孽条件启动</span></label>'
    + (info.needCondition
      ? '<div class="grid-2"><label class="field"><span>数量</span><input type="number" data-pinfo="count" value="' + esc(info.count ?? 3) + '"></label>'
        + '<label class="field"><span>罪孽</span><select data-pinfo="sin">' + opt(sins, info.sin) + '</select></label>'
        + '<label class="field"><span>条件类型</span><select data-pinfo="conditionType">' + opt(cts, info.conditionType) + '</select></label></div>'
      : '')
    + '<div class="hint muted">' + (info.needCondition ? (Number(info.count) || 3) + ' 个 ' + esc(info.sin || '罪孽') + ' 罪孽' + (info.conditionType === 'resonance' ? '共鸣' : '拥有') : '不需要罪孽条件，被动常驻生效') + '</div>'
    + '</div><div class="editor-card"><div class="tabs">'
    + '<button class="tab ' + (S.passiveTab === 'code' ? 'active' : '') + '" data-act="passive-tab" data-tab="code">代码</button>'
    + '<button class="tab ' + (S.passiveTab === 'desc' ? 'active' : '') + '" data-act="passive-tab" data-tab="desc">描述</button></div>'
    + (S.passiveTab === 'desc' ? renderSimpleDesc('passive', p) : renderSimpleCode('passive', p))
    + '</div></div></section>';
}

/* ------------------------------ Buff 编辑 ------------------------------ */

function renderBuffArea(back) {
  const q = (S.buffSearch || '').trim().toLowerCase();
  const rows = (S.buffs || []).filter((b) => !q || String(b.id).toLowerCase().includes(q) || String(b.name || '').toLowerCase().includes(q))
    .map((b) => '<button class="item ' + (S.buffId === String(b.id) ? 'active' : '') + '" data-act="open-buff" data-id="' + esc(b.id) + '">'
      + '<div class="item-main"><strong>' + esc(b.name || b.id) + '</strong><small>' + esc(b.id)
      + (b.override ? ' · 原版覆盖' : '') + (b.maxStack ? ' · ' + b.maxStack + ' 层' : '') + '</small></div>'
      + '<span class="state-dot ' + (b.updatedAt ? 'on' : '') + '"></span></button>').join('');
  const disabled = S.mods.find((m) => m.name === S.selected)?.enabled === false;
  return '<div class="pane-head">' + back + '<div><h2>Buff 编辑</h2><p class="muted">' + esc(S.selected || '') + '</p></div></div>'
    + (disabled ? '<div class="banner red">该 Mod 正在被禁用的状态 · 修改仍会保存到磁盘，但不会在游戏中生效</div>' : '')
    + '<div class="skill-wrap">'
    + '<section class="panel"><div class="panel-head">Buff <span class="count">' + (S.buffs || []).length + '</span></div>'
    + '<div class="panel-search"><input id="buff-search" class="search" placeholder="搜索 id / Buff 名" value="' + esc(S.buffSearch) + '"></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">还没有自定义 Buff</div>') + '</div>'
    + '<div class="panel-foot two"><button class="btn ghost sm" data-act="new-buff">＋ 新建</button><button class="btn ghost sm" data-act="import-buff">⇩ 导入</button></div></section>'
    + renderBuffMain()
    + renderModulePanel('module-search2', S.moduleSearch2)
    + '</div>';
}

function renderBuffMain() {
  if (!S.buff) {
    return '<section class="panel skill-main"><div class="panel-head">Buff</div><div class="panel-body">'
      + '<div class="empty-state"><div class="empty-mark">❖</div><p>从左侧选一个 Buff</p><small class="muted">或新建 / 导入</small></div></div></section>';
  }
  const b = S.buff;
  const info = b.info || {};
  const sess = S.session || {};
  const classes = S.keywords?.buffClasses || [{ id: 'NonvolatileBuff', zh: '常驻（NonvolatileBuff）' }, { id: 'VolatileBuff', zh: '挥发（VolatileBuff）' }];
  const types = S.keywords?.buffTypes || [{ id: 'Positive', zh: '增益' }, { id: 'Negative', zh: '减益' }, { id: 'Neutral', zh: '中性' }];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  const field = (label, key, type, extra) => '<label class="field"><span>' + label + '</span><input type="' + (type || 'number') + '" data-binfo="' + key + '" value="' + esc(info[key] ?? '') + '" ' + (extra || '') + '></label>';
  const sel = (label, key, arr) => '<label class="field"><span>' + label + '</span><select data-binfo="' + key + '">' + opt(arr, info[key]) + '</select></label>';
  return '<section class="panel skill-main"><div class="panel-head skill-head">'
    + '<div class="skill-title"><strong>' + esc(b.name || b.id) + '</strong><small>' + esc(b.id) + (b.override ? ' · 原版覆盖' : '') + '</small></div>'
    + '<span class="spacer"></span>'
    + '<button class="btn ghost sm" data-act="undo"' + (sess.undo ? '' : ' disabled') + '>撤销</button>'
    + '<button class="btn ghost sm" data-act="redo"' + (sess.redo ? '' : ' disabled') + '>重做</button>'
    + '<button class="btn primary sm" data-act="save-buff">保存</button>'
    + '<span class="session-state ' + (sess.dirty ? 'dirty' : '') + '" id="session-state">' + (sess.dirty ? '有未保存改动' : '已保存') + '</span></div>'
    + '<div class="skill-body"><div class="info-card"><div class="col-title">Buff 基础信息</div><div class="grid-2">'
    + sel('Buff 种类', 'buffClass', classes) + sel('正负 Buff', 'buffType', types)
    + field('最大强度', 'maxStack') + field('最大层数', 'maxTurn', 'number')
    + field('Buff 图像', 'iconId', 'text') + field('所属', 'special', 'text')
    + '</div><label class="field check"><input type="checkbox" data-binfo="canBeDespelled"' + (info.canBeDespelled !== false ? ' checked' : '') + '><span>可被净化</span></label>'
    + '<div class="hint muted">「所属」留空表示普通 Buff；填关键词表示该 Buff 的特殊归属。</div></div>'
    + '<div class="editor-card"><div class="tabs">'
    + '<button class="tab ' + (S.buffTab === 'code' ? 'active' : '') + '" data-act="buff-tab" data-tab="code">代码</button>'
    + '<button class="tab ' + (S.buffTab === 'desc' ? 'active' : '') + '" data-act="buff-tab" data-tab="desc">描述</button></div>'
    + (S.buffTab === 'desc' ? renderSimpleDesc('buff', b) : renderSimpleCode('buff', b))
    + '</div></div></section>';
}

/* --------------------------- 被动 / Buff 共用块 --------------------------- */

function renderSimpleCode(kind, doc) {
  const code = doc.code || { modules: [] };
  const chips = chipHtml(code.modules, kind, -1);
  return '<div class="code-wrap code-simple"><div class="code-col"><div class="col-title">' + (kind === 'passive' ? '被动' : 'Buff') + '置入区</div>'
    + '<div class="drop-zone ' + kind + '-zone" data-drop="' + kind + '">'
    + (chips || '<span class="dz-hint">把右侧模块拖到这里</span>') + '</div></div>'
    + '<div class="hint muted">从右侧模块列表拖入；这里只记录排布，尚未落到游戏脚本（映射留待后续版本）。</div></div>';
}

function renderSimpleDesc(kind, doc) {
  const id = kind === 'passive' ? 'passive-desc' : 'buff-desc';
  const text = typeof doc.description === 'string' ? doc.description : '';
  const st = kind === 'passive' ? (S.pDescCheck || { tokens: [], unknown: [] }) : (S.bDescCheck || { tokens: [], unknown: [] });
  return '<div class="desc-wrap"><div class="desc-block"><div class="desc-block-head"><strong>描述</strong><span class="muted">用 [关键词] 书写，保存时转游戏格式</span></div>'
    + '<textarea id="' + id + '" class="desc-input" spellcheck="false" rows="10" placeholder="例如：[回合开始时]获得1层[烧伤]">' + esc(text) + '</textarea>'
    + '<div class="desc-preview" id="' + id + '-preview">' + highlightText(text, st.tokens || []) + '</div>'
    + '<div class="desc-check ' + ((st.unknown || []).length ? 'bad' : 'ok') + '" id="' + id + '-check">'
    + ((st.unknown || []).length ? '⚠ 有 ' + st.unknown.length + ' 个关键词未识别：' + st.unknown.map((u) => '[' + u + ']').join(' ') : '✓ 关键词检查通过')
    + '</div></div></div>';
}

let pDescTimer = null;
let bDescTimer = null;
let pInfoTimer = null;
let bInfoTimer = null;

function schedulePDesc() { clearTimeout(pDescTimer); pDescTimer = setTimeout(() => flushPDesc().catch((e) => toast(e.message, 'error')), 700); }
function scheduleBDesc() { clearTimeout(bDescTimer); bDescTimer = setTimeout(() => flushBDesc().catch((e) => toast(e.message, 'error')), 700); }
function schedulePInfo() { clearTimeout(pInfoTimer); pInfoTimer = setTimeout(() => flushPInfo().catch((e) => toast(e.message, 'error')), 400); }
function scheduleBInfo() { clearTimeout(bInfoTimer); bInfoTimer = setTimeout(() => flushBInfo().catch((e) => toast(e.message, 'error')), 400); }

async function checkPDesc() {
  if (!S.passive) return;
  S.pDescCheck = await checkText(S.passive.description || '');
}
async function checkBDesc() {
  if (!S.buff) return;
  S.bDescCheck = await checkText(S.buff.description || '');
}

async function flushPDesc() {
  if (!S.passive) return;
  const ta = document.getElementById('passive-desc');
  if (!ta || ta.value === (S.passive.description || '')) return;
  const res = await api('/api/passive/meta', { method: 'POST', body: { name: S.selected, id: S.passiveId, description: ta.value } });
  S.passive = { ...S.passive, description: ta.value };
  S.session = res.session;
  await checkPDesc();
  render();
}

async function flushBDesc() {
  if (!S.buff) return;
  const ta = document.getElementById('buff-desc');
  if (!ta || ta.value === (S.buff.description || '')) return;
  const res = await api('/api/buff/meta', { method: 'POST', body: { name: S.selected, id: S.buffId, description: ta.value } });
  S.buff = { ...S.buff, description: ta.value };
  S.session = res.session;
  await checkBDesc();
  render();
}

function readPInfo() {
  const info = { ...(S.passive?.info || {}) };
  document.querySelectorAll('[data-pinfo]').forEach((el) => {
    const k = el.dataset.pinfo;
    if (el.type === 'checkbox') info[k] = el.checked;
    else if (el.type === 'number') info[k] = Number(el.value) || 0;
    else info[k] = el.value;
  });
  return info;
}

function readBInfo() {
  const info = { ...(S.buff?.info || {}) };
  document.querySelectorAll('[data-binfo]').forEach((el) => {
    const k = el.dataset.binfo;
    if (el.type === 'checkbox') info[k] = el.checked;
    else if (el.type === 'number') info[k] = Number(el.value) || 0;
    else info[k] = el.value;
  });
  return info;
}

async function flushPInfo() {
  if (!S.passive) return;
  const info = readPInfo();
  const res = await api('/api/passive/meta', { method: 'POST', body: { name: S.selected, id: S.passiveId, info } });
  S.passive = { ...S.passive, info: res.meta.info };
  S.session = res.session;
  render();
}

async function flushBInfo() {
  if (!S.buff) return;
  const info = readBInfo();
  const res = await api('/api/buff/meta', { method: 'POST', body: { name: S.selected, id: S.buffId, info } });
  S.buff = { ...S.buff, info: res.meta.info };
  S.session = res.session;
  render();
}

async function placeModuleSimple(mid, kind) {
  const doc = kind === 'passive' ? S.passive : S.buff;
  if (!doc) { toast('请先在左侧选一个对象', 'warn'); return; }
  const code = doc.code || (doc.code = { modules: [] });
  code.modules = code.modules || [];
  if (code.modules.includes(mid)) { toast('这个模块已经放进去了', 'warn'); return; }
  code.modules.push(mid);
  await saveSimpleCode(kind);
  toast('已置入：' + moduleName(mid), 'ok');
}

async function saveSimpleCode(kind) {
  const doc = kind === 'passive' ? S.passive : S.buff;
  if (!doc) return;
  const id = kind === 'passive' ? S.passiveId : S.buffId;
  const res = await api(kind === 'passive' ? '/api/passive/code' : '/api/buff/code', {
    method: 'POST',
    body: { name: S.selected, id, code: { modules: doc.code?.modules || [] } },
  });
  if (kind === 'passive') S.passive = { ...S.passive, code: res.meta.code, info: res.meta.info };
  else S.buff = { ...S.buff, code: res.meta.code, info: res.meta.info };
  render();
}

async function savePassiveCurrent() {
  await flushPDesc();
  await checkPDesc();
  const unk = (S.pDescCheck?.unknown || []).map((u) => ({ where: '被动描述', word: u }));
  if (unk.length) { openRiskGeneric(unk, commitPassive); return; }
  await commitPassive();
}

async function commitPassive() {
  await flushPInfo();
  const res = await api('/api/passive/save', { method: 'POST', body: { name: S.selected, id: S.passiveId } });
  S.session = res.session;
  toast('已保存，撤销历史已清空', 'ok');
  render();
}

async function saveBuffCurrent() {
  await flushBDesc();
  await checkBDesc();
  const unk = (S.bDescCheck?.unknown || []).map((u) => ({ where: 'Buff 描述', word: u }));
  if (unk.length) { openRiskGeneric(unk, commitBuff); return; }
  await commitBuff();
}

async function commitBuff() {
  await flushBInfo();
  const res = await api('/api/buff/save', { method: 'POST', body: { name: S.selected, id: S.buffId } });
  S.session = res.session;
  toast('已保存，撤销历史已清空', 'ok');
  render();
}

function openRiskGeneric(items, commit) {
  modal({
    title: '保存检查',
    body: '<p><strong>有错误的关键词输入，请检查拼写。</strong></p>'
      + '<div class="person-list">' + items.map((u) => '<div class="check-row"><span class="kw-bad">[' + esc(u.word) + ']</span><small>' + esc(u.where) + ' · 未在时点表 / Buff 表中找到</small></div>').join('') + '</div>'
      + '<div class="hint muted">无视风险保存后，未命中的关键词不做翻译处理。</div>',
    footer: '<button class="btn ghost" data-act="close-modal">返回修改</button><button class="btn warn" data-act="risk-save-ok">无视风险保存</button>',
  });
  actions['risk-save-ok'] = async () => { closeModal(); await commit(); };
}

/* --------------------------- 模块 / 被动 / Buff 创建 --------------------------- */

function openNewModule() {
  const timings = S.keywords?.timings || [];
  const kinds = S.keywords?.moduleKinds || [];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  modal({
    title: '新建模块',
    body: '<div class="form">'
      + '<label class="field"><span>类型</span><select id="nm-kind">' + opt(kinds, 'skill') + '</select></label>'
      + '<label class="field"><span>名称</span><input id="nm-name" placeholder="例如：施加烧伤" autocomplete="off"></label>'
      + '<label class="field"><span>描述（可执行词条）</span><textarea id="nm-desc" class="desc-input" rows="4" placeholder="例如：[使用时]对目标施加2层[烧伤]"></textarea></label>'
      + '<div class="hint muted">模块目前只存在于编辑器内，不落到游戏脚本。</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-create-module">创建</button>',
  });
}

async function submitCreateModule() {
  const name = document.getElementById('nm-name')?.value?.trim() || '';
  const desc = document.getElementById('nm-desc')?.value || '';
  const kind = document.getElementById('nm-kind')?.value || 'skill';
  if (!name) { toast('请填模块名称', 'warn'); return; }
  try {
    const res = await api('/api/module/create', { method: 'POST', body: { name, desc, kind } });
    closeModal();
    S.modulesLoaded = false;
    await loadModules(true);
    S.moduleEditing = res.module.id;
    toast('模块已创建', 'ok');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

async function saveModule() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m || m.test) return;
  const name = document.getElementById('mod-name')?.value?.trim() || '';
  const desc = document.getElementById('mod-desc')?.value || '';
  const prefix = document.getElementById('mod-prefix')?.value || '';
  const kind = document.getElementById('mod-kind')?.value || 'skill';
  try {
    await api('/api/module/save', { method: 'POST', body: { id: m.id, name, desc, prefix, kind } });
    await loadModules(true);
    toast('模块已保存', 'ok');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteModule() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m || m.test) return;
  modal({
    title: '删除模块',
    body: '<p>确定删除模块「' + esc(m.name || m.id) + '」？</p><div class="hint muted">已引用它的技能 / 被动 / Buff 会显示成一个空引用。</div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn danger" data-act="confirm-delete-module" data-id="' + esc(m.id) + '">删除</button>',
  });
}

async function confirmDeleteModule(el) {
  await api('/api/module/delete', { method: 'POST', body: { id: el.dataset.id } });
  closeModal();
  S.moduleEditing = null;
  await loadModules(true);
  toast('模块已删除', 'ok');
  render();
}

function openNewPassive() {
  modal({
    title: '新建被动',
    body: '<div class="form">'
      + '<label class="field"><span>被动 id（必填，4–10 位数字，编辑器会查重）</span><input id="np-id" placeholder="例如 2090111" autocomplete="off"></label>'
      + '<label class="field"><span>被动名</span><input id="np-name" placeholder="例如 灼热抗性" autocomplete="off"></label>'
      + '<label class="field"><span>描述</span><textarea id="np-desc" class="desc-input" rows="3" placeholder="例如：[回合开始时]获得1层[烧伤]"></textarea></label>'
      + '</div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-create-passive">创建</button>',
  });
}

async function submitCreatePassive() {
  const id = document.getElementById('np-id')?.value?.trim() || '';
  const displayName = document.getElementById('np-name')?.value?.trim() || '';
  const desc = document.getElementById('np-desc')?.value || '';
  try {
    const res = await api('/api/passive/create', { method: 'POST', body: { name: S.selected, id, displayName, desc } });
    closeModal();
    await loadPassiveList(S.selected);
    S.passive = null;
    await openPassive(res.passive.id);
    toast('被动 ' + res.passive.id + ' 已创建', 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

function openNewBuff() {
  const classes = S.keywords?.buffClasses || [];
  const types = S.keywords?.buffTypes || [];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  modal({
    title: '新建 Buff',
    body: '<div class="form">'
      + '<label class="field"><span>Buff id（必填，英文字母开头）</span><input id="nb-id" placeholder="例如 TestBurn" autocomplete="off"></label>'
      + '<label class="field"><span>Buff 名</span><input id="nb-name" placeholder="例如 测试烧伤" autocomplete="off"></label>'
      + '<div class="grid-2"><label class="field"><span>种类</span><select id="nb-class">' + opt(classes, 'NonvolatileBuff') + '</select></label>'
      + '<label class="field"><span>正负</span><select id="nb-type">' + opt(types, 'Negative') + '</select></label></div>'
      + '<label class="field"><span>描述</span><textarea id="nb-desc" class="desc-input" rows="3" placeholder="例如：[回合结束时]受到 1 点伤害"></textarea></label>'
      + '<div class="hint muted">创建会同时写入实体、本地化与 0 字节关键词文件（custom_buffs/&lt;id&gt;.txt）。</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-create-buff">创建</button>',
  });
}

async function submitCreateBuff() {
  const id = document.getElementById('nb-id')?.value?.trim() || '';
  const displayName = document.getElementById('nb-name')?.value?.trim() || '';
  const desc = document.getElementById('nb-desc')?.value || '';
  const info = {
    buffClass: document.getElementById('nb-class')?.value || 'NonvolatileBuff',
    buffType: document.getElementById('nb-type')?.value || 'Negative',
  };
  try {
    const res = await api('/api/buff/create', { method: 'POST', body: { name: S.selected, id, displayName, desc, info } });
    closeModal();
    await loadBuffList(S.selected);
    S.buff = null;
    await openBuff(res.buff.id);
    toast('Buff ' + res.buff.id + ' 已创建', 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

/* --------------------------------- 导入 --------------------------------- */

function openImportPassive() {
  modal({
    title: '导入被动',
    body: '<div class="form"><label class="field"><span>搜索 id 或名称</span><input id="ip-q" class="search" placeholder="例如 90001 / 虫" autocomplete="off"></label>'
      + '<div class="import-list" id="ip-list"><div class="muted" style="padding:8px">输入关键词后回车搜索</div></div>'
      + '<div class="hint muted">导入保持原 id（原版被动会在游戏内覆盖原版）。</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">关闭</button>',
  });
  const q = document.getElementById('ip-q');
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchImportPassive(q.value.trim()); });
  q.focus();
}

async function searchImportPassive(q) {
  const box = document.getElementById('ip-list');
  if (!box) return;
  if (!q) return;
  const res = await api('/api/passive-search?q=' + encodeURIComponent(q));
  const rows = (res.results || []).map((r) => '<button class="import-row" data-act="pick-import-passive" data-id="' + esc(r.id) + '">'
    + '<strong>' + esc(r.name || r.id) + '</strong><small>' + esc(r.id) + (r.source === 'vanilla' ? ' · 原版' : ' · ' + esc(r.mod || 'Mod')) + '</small></button>').join('');
  box.innerHTML = rows || '<div class="muted" style="padding:8px">没有匹配结果</div>';
}

async function pickImportPassive(el) {
  const id = el.dataset.id;
  try {
    const res = await api('/api/passive/import', { method: 'POST', body: { name: S.selected, ids: [id], source: { kind: 'vanilla' } } });
    closeModal();
    await loadPassiveList(S.selected);
    S.passive = null;
    await openPassive(id);
    toast('已导入被动 ' + id + (res && res.overridden ? '（覆盖原版）' : ''), 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

function openImportBuff() {
  modal({
    title: '导入 Buff',
    body: '<div class="form"><label class="field"><span>搜索 id 或名称</span><input id="ib-q" class="search" placeholder="例如 Burn / 烧伤" autocomplete="off"></label>'
      + '<div class="import-list" id="ib-list"><div class="muted" style="padding:8px">输入关键词后回车搜索</div></div>'
      + '<div class="hint muted">导入保持原 id（原版 Buff 会在游戏内覆盖原版）。</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">关闭</button>',
  });
  const q = document.getElementById('ib-q');
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchImportBuff(q.value.trim()); });
  q.focus();
}

async function searchImportBuff(q) {
  const box = document.getElementById('ib-list');
  if (!box || !q) return;
  const res = await api('/api/buff-search?q=' + encodeURIComponent(q));
  const rows = (res.results || []).map((r) => '<button class="import-row" data-act="pick-import-buff" data-id="' + esc(r.id) + '">'
    + '<strong>' + esc(r.name || r.id) + '</strong><small>' + esc(r.id) + (r.source === 'vanilla' ? ' · 原版' : ' · ' + esc(r.mod || 'Mod')) + '</small></button>').join('');
  box.innerHTML = rows || '<div class="muted" style="padding:8px">没有匹配结果</div>';
}

async function pickImportBuff(el) {
  const id = el.dataset.id;
  try {
    const res = await api('/api/buff/import', { method: 'POST', body: { name: S.selected, ids: [id], source: { kind: 'vanilla' } } });
    closeModal();
    await loadBuffList(S.selected);
    S.buff = null;
    await openBuff(id);
    toast('已导入 Buff ' + id + (res && res.overridden ? '（覆盖原版）' : ''), 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

/* --------------------------------- 动作注册 --------------------------------- */

Object.assign(actions, {
  'open-module': (el) => { S.moduleEditing = el.dataset.id; render(); },
  'new-module': () => openNewModule(),
  'submit-create-module': () => submitCreateModule(),
  'save-module': () => saveModule(),
  'delete-module': () => deleteModule(),
  'confirm-delete-module': (el) => confirmDeleteModule(el),

  'open-passive': (el) => openPassive(el.dataset.id).catch((e) => toast(e.message, 'error')),
  'passive-tab': (el) => { S.passiveTab = el.dataset.tab; render(); },
  'new-passive': () => openNewPassive(),
  'submit-create-passive': () => submitCreatePassive(),
  'save-passive': () => savePassiveCurrent().catch((e) => toast(e.message, 'error')),
  'import-passive': () => openImportPassive(),
  'pick-import-passive': (el) => pickImportPassive(el),

  'open-buff': (el) => openBuff(el.dataset.id).catch((e) => toast(e.message, 'error')),
  'buff-tab': (el) => { S.buffTab = el.dataset.tab; render(); },
  'new-buff': () => openNewBuff(),
  'submit-create-buff': () => submitCreateBuff(),
  'save-buff': () => saveBuffCurrent().catch((e) => toast(e.message, 'error')),
  'import-buff': () => openImportBuff(),
  'pick-import-buff': (el) => pickImportBuff(el),
});
