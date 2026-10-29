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
    if (mbIsDirty() || mbPendingMissing().list.length) { mbLeaveGuard(() => { S.view = nav.dataset.view; S.moduleEditing = null; S.mb = null; S.mbDoc = null; render(); }); return; }
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
  if (t.id === 'mb-search') { S.mb.search = t.value; render(); refocus('mb-search', t.value.length); return; }
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
function descKwListHtml() {
  const timings = (S.keywords && S.keywords.timings) || [];
  const buffs = (S.keywords && S.keywords.buffs) || [];
  const items = timings.map((t) => String(t.zh || '').trim()).filter(Boolean)
    .concat(buffs.map((b) => String(b.zh || '').trim()).filter(Boolean));
  const uniq = Array.from(new Set(items));
  return '<datalist id="desc-kw-list">' + uniq.map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist>';
}
function descKwToolsHtml() {
  return '<div class="desc-tools"><input id="desc-kw" list="desc-kw-list" class="mb-logic" placeholder="关键词中文名（时点 / Buff）"><button class="btn ghost sm" data-act="desc-kw-insert">插入到光标处</button><span class="muted">插入后会写成 [关键词]，保存时转成游戏英文 id</span></div>';
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
    + descKwToolsHtml()
    + '<textarea id="skill-desc" class="desc-input" spellcheck="false" rows="6" placeholder="例如：[使用时]使本技能的硬币威力+1">' + esc(text) + '</textarea>'
    + '<div class="desc-preview" id="desc-preview">' + highlightText(text, st.tokens || []) + '</div>'
    + '<div id="desc-check">' + descCheckHtml(st) + '</div></div>'
    + '<div class="desc-block"><div class="desc-block-head"><strong>硬币描述</strong><span class="muted">数量跟随「硬币数量」，每枚硬币一段</span></div>'
    + '<div class="coin-desc-grid">' + (coins.join('') || '<div class="muted" style="padding:8px 2px">当前技能还没有硬币；把「硬币数量」调到 1 以上即可</div>') + '</div></div>'
    + '<details class="game-text"><summary>游戏内文本预览（关键词已转为英文 id）</summary><pre id="game-text">' + esc(gameAll) + '</pre></details>'
    + '<div class="hint muted">描述改动在停止输入后写入磁盘并记入撤销历史；代码区（拖拽）不进撤销。</div></div>' + descKwListHtml();
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
  const applied = await api('/api/skill/apply', { method: 'POST', body: { name: S.selected, id: S.skillId } });
  toast('已保存并写入游戏文件（' + (applied.applied || 0) + ' 条脚本' + ((applied.missing || []).length ? '，缺 ' + applied.missing.length + ' 个模块' : '') + '）', 'ok');
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
  if (S.moduleEditing && S.mb && S.mbDoc) return renderModuleEditor(back);
  const scopes = (S.scopeTables && S.scopeTables.list) || [];
  const scopeLabel = (id) => {
    const hit = scopes.find((x) => x.id === (id || 'common'));
    return hit ? hit.zh : (id || '通用');
  };
  const rows = (S.modules || []).map((m) => '<div class="module-row' + (m.test ? ' test' : '') + '">'
    + '<button class="mod-open" data-act="open-module" data-id="' + esc(m.id) + '">'
    + '<span class="mod-name">' + esc(m.name || m.id) + '</span>'
    + '<span class="mod-meta"><span class="tag">' + esc(scopeLabel(m.scope)) + '</span>'
    + (m.test ? '<span class="tag warn">测试</span>' : '')
    + '<span class="muted">' + (m.blockCount || 0) + ' 块</span></span>'
    + '</button>'
    + '<button class="mod-gear" data-act="mb-props" data-id="' + esc(m.id) + '" title="模块信息 / 删除">⚙</button>'
    + '</div>').join('');
  const count = (S.modules || []).length;
  return '<div class="pane-head">' + back + '<div><h2>模块编辑</h2><p class="muted">积木式脚本 · 由技能 / 被动 / Buff 引用</p></div></div>'
    + '<div class="module-wrap"><section class="panel"><div class="panel-head">模块 <span class="count">' + count + '</span></div>'
    + '<div class="panel-body list module-list">' + (rows || '<div class="list-empty">还没有模块</div>') + '</div>'
    + '<div class="panel-foot"><button class="btn ghost block" data-act="new-module">＋ 新建</button></div></section></div>';
}

async function openModuleProps(id) {
  const mid = String(id || (S.mbDoc && S.mbDoc.id) || '');
  if (!mid) return;
  let m = (S.modules || []).find((x) => x.id === mid) || null;
  if (!m) {
    const d = await api('/api/module?id=' + encodeURIComponent(mid));
    m = d.module;
  }
  const scopes = (S.scopeTables && S.scopeTables.list) || [{ id: 'common', zh: '通用', desc: '' }];
  const ro = m.test ? ' disabled' : '';
  modal({
    title: '模块信息',
    body: '<div class="form">'
      + '<label class="field"><span>模块名称</span><input id="mp-name" value="' + esc(m.name || '') + '"' + ro + '></label>'
      + '<label class="field"><span>用途</span><select id="mp-scope"' + ro + '>' + scopes.map((k) => '<option value="' + esc(k.id) + '"' + (String(k.id) === String(m.scope || 'common') ? ' selected' : '') + '>' + esc(k.zh) + (k.desc ? ' · ' + esc(k.desc) : '') + '</option>').join('') + '</select></label>'
      + '<label class="field"><span>描述（可执行词条）</span><textarea id="mp-desc" rows="4" class="desc-input">' + esc(m.desc || '') + '</textarea></label>'
      + '<div class="hint muted">模块 id：' + esc(m.id) + ' · 积木 ' + (m.blockCount || 0) + ' 块</div>'
      + '</div>',
    footer: '<button class="btn ghost" data-act="close-modal">关闭</button>'
      + (m.test ? '<button class="btn danger" data-act="mb-props-delete" data-id="' + esc(m.id) + '" data-test="1">删除测试模块</button>' : '<button class="btn danger" data-act="mb-props-delete" data-id="' + esc(m.id) + '">删除模块</button><button class="btn ok" data-act="mb-props-save" data-id="' + esc(m.id) + '">保存</button>'),
  });
}

function renderModuleForm() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m) {
    return '<section class="panel"><div class="panel-body"><div class="empty-state"><div class="empty-mark">▤</div><p>从左侧选一个模块</p><small class="muted">或新建模块</small></div></div></section>';
  }
  const timings = S.keywords?.timings || [];
  const scopes = (S.scopeTables && S.scopeTables.list) || [{ id: 'common', zh: '通用', desc: '' }];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  const timingValue = (v) => {
    const raw = String(v || '');
    if (!raw) return '';
    const byId = timings.find((x) => String(x.id) === raw);
    return byId ? byId.en : raw;
  };
  const timingOpt = timings.map((x) => {
    const val = x.en || String(x.id);
    const sel = val.toLowerCase() === timingValue(m.prefix).toLowerCase() ? ' selected' : '';
    const label = x.zh ? x.zh + ' · ' + x.en : x.en;
    return '<option value="' + esc(val) + '"' + sel + '>' + esc(label) + '</option>';
  }).join('');
  const ro = m.test ? ' disabled' : '';
  return '<section class="panel module-form"><div class="panel-head"><strong>' + esc(m.name || m.id) + '</strong><span class="spacer"></span>'
    + (m.test ? '<span class="tag warn">测试模块 · 只读</span><button class="btn danger sm" data-act="delete-module">删除测试模块</button>' : '<button class="btn ok sm" data-act="save-module">保存</button><button class="btn danger sm" data-act="delete-module">删除</button>')
    + '</div><div class="panel-body"><div class="form">'
    + '<label class="field"><span>模块名称</span><input id="mod-name" value="' + esc(m.name || '') + '"' + ro + '></label>'
    + '<div class="grid-2">'
    + '<label class="field"><span>所属前缀（时点）</span><select id="mod-prefix"' + ro + '><option value="">（未指定）</option>' + timingOpt + '</select></label>'
    + '<label class="field"><span>用途</span><select id="mod-scope"' + ro + '>' + scopes.map((k) => '<option value="' + esc(k.id) + '"' + (String(k.id) === String(m.scope || 'common') ? ' selected' : '') + '>' + esc(k.zh) + '</option>').join('') + '</select></label>'
    + '</div>'
    + '<label class="field"><span>模块描述（可执行词条）</span><textarea id="mod-desc" class="desc-input" rows="6" spellcheck="false"' + ro + ' placeholder="例如：[使用时]若目标的[烧伤]强度与[震颤]强度之和不低于6级，则使本技能的硬币威力+1">' + esc(m.desc || '') + '</textarea></label>'
    + '<div class="hint muted">改动点「保存」后写入模块库；测试模块不可修改与删除。</div>'
    + '</div></div></section>';
}

/* ============================ 模块积木编辑器（Scratch 式） ============================ */

const MB_TARGETS = [
  // 单目标（教程「目标参数 / 单目标」）
  { n: 'Self', zh: '自身', g: 'single' },
  { n: 'SelfCore', zh: '自身核心（部位取其本体）', g: 'single' },
  { n: 'Target', zh: '当前目标', g: 'single' },
  { n: 'TargetCore', zh: '当前目标的核心', g: 'single' },
  { n: 'MainTarget', zh: '主目标', g: 'single' },
  { n: 'Victim', zh: '受害者', g: 'single' },
  { n: 'Killer', zh: '击杀者', g: 'single' },
  { n: 'adjLeft', zh: '左侧相邻单位', g: 'single' },
  { n: 'adjRight', zh: '右侧相邻单位', g: 'single' },
  // 多目标
  { n: 'EveryTarget', zh: '所有目标', g: 'multi' },
  { n: 'SubTarget', zh: '副目标（技能命中列表）', g: 'multi' },
  { n: 'EveryAlly', zh: '所有友方', g: 'multi' },
  { n: 'EveryEnemy', zh: '所有敌方', g: 'multi' },
  { n: 'EveryCoreAlly', zh: '所有友方（含本体）', g: 'multi' },
  { n: 'EveryCoreEnemy', zh: '所有敌方（含本体）', g: 'multi' },
  { n: 'EveryAbnoCoreAlly', zh: '所有友方异想体', g: 'multi' },
  { n: 'EveryAbnoCoreEnemy', zh: '所有敌方异想体', g: 'multi' },
  { n: 'All', zh: '所有上场单位', g: 'multi' },
  { n: 'SkillTargets', zh: '本技能的目标列表', g: 'multi' },
  { n: 'SkillSubTargets', zh: '本技能的副目标列表', g: 'multi' },
  // 修饰标签（用 + 连接到基础选择器后）
  { n: 'Ally', zh: '仅友方', g: 'tag' },
  { n: 'Enemy', zh: '仅敌方', g: 'tag' },
  { n: 'NoAbnos', zh: '排除异想体', g: 'tag' },
  { n: 'AbnoOnly', zh: '只要异想体', g: 'tag' },
  { n: 'NoCores', zh: '排除核心', g: 'tag' },
  { n: 'NoParts', zh: '排除部位', g: 'tag' },
  { n: 'Assist', zh: '包含支援单位', g: 'tag' },
  { n: 'ExceptSelf', zh: '排除自身', g: 'tag' },
  { n: 'ExceptTarget', zh: '排除当前目标', g: 'tag' },
  { n: 'Random', zh: '随机排序', g: 'tag' },
  { n: 'Deploy', zh: '按上场顺序排序', g: 'tag' },
  { n: 'Reversedeploy', zh: '按登场逆序排序', g: 'tag' },
  { n: 'Slowest', zh: '最慢优先', g: 'tag' },
  { n: 'Fastest', zh: '最快优先', g: 'tag' },
  { n: 'HighestHPRatio', zh: 'HP 比例最高优先', g: 'tag' },
  { n: 'LowestHPRatio', zh: 'HP 比例最低优先', g: 'tag' },
  { n: 'HighestHP', zh: 'HP 最高优先', g: 'tag' },
  { n: 'LowestHP', zh: 'HP 最低优先', g: 'tag' },
  { n: 'HighestMaxHP', zh: '最大 HP 最高优先', g: 'tag' },
  { n: 'LowestMaxHP', zh: '最大 HP 最低优先', g: 'tag' },
  { n: 'HighestMP', zh: 'SP 最高优先', g: 'tag' },
  { n: 'LowestMP', zh: 'SP 最低优先', g: 'tag' },
  { n: 'Deads', zh: '只取已阵亡单位', g: 'tag' },
  { n: 'Retreats', zh: '只取已撤退单位', g: 'tag' },
];
const MB_TARGET_TAGS = MB_TARGETS.filter((t) => t.g === 'tag');
const MB_TAG_SET = new Set(MB_TARGET_TAGS.map((t) => t.n));
const MB_TYPE_ZH = { target: '目标', buff: 'Buff 关键词', num: '整数', var: 'VALUE 寄存器', op: '运算符', text: '文本', any: '任意' };
// 常见函数的参数类型（下标从 0 起）；未列出的按文档关键词推断
const MB_ARG_OVERRIDES = {
  'consequence:buff': ['target', 'buff', 'num', 'num', 'num', 'text'],
  'consequence:healhp': ['target', 'num'],
  'consequence:healsp': ['target', 'num'],
  'consequence:gainshield': ['target', 'num'],
  'consequence:consume-buff': ['target', 'buff', 'num'],
  'consequence:modify-power': ['target', 'num'],
  'consequence:modify-damage': ['target', 'num'],
  'consequence:scale': ['num', 'op', 'num'],
  'consequence:base': ['num'],
  'consequence:final': ['num'],
  'consequence:clash': ['num'],
  'consequence:dmgadd': ['num'],
  'consequence:skillreuse': ['target'],
  'consequence:insertskill': ['target', 'text'],
  'consequence:setmaxhp': ['target', 'num'],
  'consequence:changecolor': ['target', 'text', 'text', 'text'],
  'acquirer:getbuff': ['target', 'buff', 'text', 'text', 'text'],
  'acquirer:getbuffcount': ['target', 'buff'],
  'acquirer:resource': ['num', 'num', 'num'],
  'acquirer:gbturn': ['target', 'buff'],
  'acquirer:stack': ['target', 'buff'],
  'acquirer:turn': ['target', 'buff'],
  'acquirer:getskillid': [],
  'acquirer:gbstack': ['text'],
};

function mbArgType(kind, name, i) {
  const ov = MB_ARG_OVERRIDES[kind + ':' + name];
  if (ov && ov[i]) return ov[i];
  const row = (S.mbTables || []).find((r) => r.kind === kind && r.name === name);
  const doc = row && row.params && row.params[i] ? String(row.params[i].doc || '') : '';
  if (/目标|多目标/.test(doc)) return 'target';
  if (/[Bb]uff\s*关键词|关键词/.test(doc)) return 'buff';
  if (/\bADD\b|\bSUB\b|\bMUL\b/.test(doc)) return 'op';
  if (/\buse\b|文本|名称|字符串/.test(doc)) return 'text';
  if (/整数|数值|数量|层数|强度|回合|倍率|%/.test(doc)) return 'num';
  return 'any';
}

function mbValueType(node) {
  if (!node) return 'empty';
  if (node.t === 'target') return 'target';
  if (node.t === 'var') return 'var';
  if (node.t === 'n') return 'num';
  if (node.t === 's') return 'text';
  if (node.t === 'acq') return 'acq';
  if (node.t === 'math') return 'num';
  return 'any';
}

function mbCompatible(slotType, valueType) {
  const t = slotType || 'any';
  if (t === 'any') return true;
  if (t === 'num') return valueType === 'num' || valueType === 'var' || valueType === 'acq';
  if (t === 'target') return valueType === 'target';
  if (t === 'buff') return valueType === 'text' || valueType === 'any';
  if (t === 'op') return valueType === 'text';
  if (t === 'text') return valueType === 'text' || valueType === 'num';
  return true;
}

function mbSlotType(chain) {
  const all = String(chain || '').split(':');
  const stmt = mbStmt(all[0]);
  if (!stmt) return 'any';
  const last = all[all.length - 1];
  const prev = all[all.length - 2] || '';
  if (/^a(\d+)$/.test(last)) return mbArgType('consequence', stmt.n, Number(RegExp.$1));
  if (last === 'val') return 'num';
  if (last === 'loop') return 'target';
  if (last === 'left' || last === 'right') return 'num';
  if (last === 'op') return 'op';
  if (/^c\d+$/.test(last)) return 'any';
  return 'any';
}
const MB_VARS = Array.from({ length: 10 }, (_, i) => 'VALUE_' + i);
const MB_MATH_OPS = [['+', '加 +'], ['-', '减 -'], ['*', '乘 *'], ['%', '除 %'], ['!', '取小 !'], ['¡', '取大 ¡'], ['?', '取余 ?']];

function mbTargetZh(n) { return (MB_TARGETS.find((t) => t.n === n) || {}).zh || n; }
function mbTargetLabel(v) {
  if (!v) return '';
  const c = v.c === null || v.c === undefined || v.c === '' ? '' : String(v.c);
  const parts = String(v.n || '').split('+');
  const label = parts.map((x) => mbTargetZh(x) || x).join(' + ');
  return label + (c ? ' × ' + c : '');
}

async function loadModularTables() {
  if (S.mbTablesReady) return S.mbTables;
  const res = await api('/api/modular-tables');
  S.mbTables = res.rows || [];
  S.mbTablesReady = true;
  return S.mbTables;
}

function mbRows(kind) { return (S.mbTables || []).filter((r) => r.kind === kind); }

async function ensureScopes() {
  if (S.scopeTables) return S.scopeTables;
  try {
    const res = await api('/api/scopes');
    S.scopeTables = { list: res.scopes || [], timing: res.timingContainers || {}, command: res.commandContainers || {}, timingScope: res.timingScope || {}, commandScope: res.commandScope || {} };
  } catch (e) {
    S.scopeTables = { list: [{ id: 'common', zh: '通用' }], timing: {}, command: {} };
  }
  return S.scopeTables;
}

function curScope() {
  return (S.mbDoc && S.mbDoc.scope) || 'common';
}

function scopeAllowsOne(map, key) {
  const set = map ? map[String(key)] : undefined;
  if (!set || !set.length) return true;
  const has = (k) => set.includes(k) || set.includes("unit");
  const scope = curScope();
  if (scope === "common") return ["buff", "passive", "skill"].every(has);
  return has(scope);
}

function scopeAllowsTiming(en) {
  return scopeAllowsOne(S.scopeTables && S.scopeTables.timing, en);
}

function scopeAllowsCommand(name) {
  return scopeAllowsOne(S.scopeTables && S.scopeTables.command, name);
}

function scopeZhOf(id) {
  const one = (S.scopeTables && S.scopeTables.list ? S.scopeTables.list : []).find((x) => x.id === id);
  return one ? one.zh : '通用';
}

async function openModuleEditor(id) {
  await ensureScopes();
  await ensureKeywords();
  const res = await api('/api/module?id=' + encodeURIComponent(id));
  await loadModularTables();
  const doc = res.module;
  S.moduleEditing = id;
  S.mbDoc = doc;
  S.mb = {
    program: { version: 1, blocks: mbMigrateLegacy(mbNestFlat(doc.program && Array.isArray(doc.program.blocks) ? doc.program.blocks : [])) }, sel: null,
    search: '', cat: 'timing', carry: null, drag: null, showProps: false, showScript: false,
    showMissing: false, missingIds: null,
    hist: [], redo: [], savedAt: doc.updatedAt || '', forceSave: false,
  };
  render();
}

/* ---------------- 取路径 ---------------- */

function selCls(idStr) {
  return S.mb && S.mb.sel === idStr ? ' sel' : '';
}

function mbDeepHost(list) {
  let host = null;
  let cur = list;
  while (cur && cur.length) {
    const last = cur[cur.length - 1];
    if (!last || (last.k !== 'timing' && last.k !== 'loop')) break;
    host = last;
    cur = last.body;
  }
  return host;
}

function mbMigrateLegacy(list) {
  const out = [];
  for (const raw of list || []) {
    if (!raw) continue;
    const b = raw;
    if (b.k === 'loop') {
      const host = out.length ? out[out.length - 1] : null;
      const body = Array.isArray(b.body) ? mbMigrateLegacy(b.body) : [];
      if (host && host.k === 'timing') {
        host.loop = { t: 'target', n: String(b.v || 'Target'), c: null };
        host.body = (host.body || []).concat(body);
      } else if (body.length) {
        out.push(...body);
      }
      continue;
    }
    if (b.k === 'if' || b.k === 'ifnot' || b.k === 'continueif') {
      if (!Array.isArray(b.conds) || !b.conds.length) b.conds = [{ left: b.left || null, op: b.op || '>', right: b.right || null }];
      delete b.left; delete b.right; delete b.op;
      if (!['none', 'and', 'or', 'xor'].includes(b.logic)) b.logic = 'none';
    }
    if (Array.isArray(b.body)) b.body = mbMigrateLegacy(b.body);
    out.push(b);
  }
  return out;
}
function mbNestFlat(list) {
  const out = [];
  for (const raw of list || []) {
    const b = JSON.parse(JSON.stringify(raw));
    if (b.k === 'timing') {
      b.body = mbNestFlat(Array.isArray(b.body) ? b.body : []);
      out.push(b);
      continue;
    }
    if (b.k === 'loop' || b.k === 'if') {
      b.body = mbNestFlat(Array.isArray(b.body) ? b.body : []);
      const h = mbDeepHost(out);
      if (h) h.body.push(b); else out.push(b);
      continue;
    }
    const host = mbDeepHost(out);
    if (host) host.body.push(b); else out.push(b);
  }
  return out;
}

function mbBackspace() {
  const sel = S.mb && S.mb.sel;
  if (!sel) return;
  const p = String(sel).split('.').map(Number);
  const parent = mbStackAt(p.slice(0, -1));
  if (!parent || !parent[p[p.length - 1]]) { S.mb.sel = null; render(); return; }
  if (p.length === 1) {
    parent.splice(p[0], 1);
    S.mb.sel = null;
    render();
    toast('\u5df2\u5220\u9664\u8be5\u4ee3\u7801\u5757', 'warn');
    return;
  }
  const node = parent.splice(p[p.length - 1], 1)[0];
  const hatPath = p.slice(0, -2);
  const hatIdx = p[p.length - 2];
  const hatStack = mbStackAt(hatPath);
  if (!hatStack) { render(); return; }
  hatStack.splice(hatIdx + 1, 0, node);
  S.mb.sel = (hatPath.length ? hatPath.join('.') + '.' : '') + (hatIdx + 1);
  render();
  toast('\u5df2\u53d6\u6d88\u4e00\u7ea7\u7f29\u8fdb', 'info');
}

function mbStackAt(pathArr) {
  let list = S.mb.program.blocks;
  for (const idx of pathArr) {
    const node = list && list[idx];
    if (!node) return null;
    if (!Array.isArray(node.body)) {
      if (node.k === 'if' || node.k === 'timing' || node.k === 'loop') node.body = [];
      else return null;
    }
    list = node.body;
  }
  return list;
}
function mbStmt(idStr) {
  const p = String(idStr || '').split('.').filter((x) => x !== '').map(Number);
  if (!p.length) return null;
  return mbStackAt(p.slice(0, -1))?.[p[p.length - 1]] || null;
}

/* ---------------- 渲染 ---------------- */

function mbValHtml(v, chain, slotType, opt) {
  const st = slotType || 'any';
  const stAttr = ' data-slot-type="' + esc(st) + '" title="' + esc((MB_TYPE_ZH[st] || MB_TYPE_ZH.any) + (opt ? ' · 可选参数，可留空' : '')) + '"';
  if (!v) return '<span class="slot' + (opt ? ' slot-opt' : ' slot-req') + ' slot-t-' + esc(st) + '"' + stAttr + ' data-mb-empty="1" data-mb-slot="' + esc(chain) + '"><i><b class="' + (opt ? 'slot-flag-opt">可选' : 'slot-flag-req">必填') + '</b>' + esc(MB_TYPE_ZH[st] || '.') + '</i></span>';
  const inner = (() => {
    if (v.t === 'target') return esc(mbTargetLabel(v));
    if (v.t === 'var') return esc(v.n);
    if (v.t === 'n') return esc(String(v.v));
    if (v.t === 's') return '"' + esc(String(v.v)) + '"';
    if (v.t === 'acq') {
      const args = (v.a || []).map((x, i) => mbArgHtml(x, chain + '>' + i, mbArgType('acquirer', v.n, i), 'acquirer', v.n, i)).join('<span class="vb-comma">,</span>');
      return esc(v.n) + '(' + args + ')';
    }
    if (v.t === 'math') {
      let html = '<span class="vb-math-op">math(</span>' + mbValHtml(v.first, chain + '>f', 'num');
      for (let i = 0; i < (v.tail || []).length; i++) {
        const t = v.tail[i];
        html += '<select class="mb-mathop" data-mb-mathop="' + esc(chain) + '" data-mb-idx="' + i + '">'
          + MB_MATH_OPS.map(([o, label]) => '<option value="' + o + '"' + (o === (t.op || '+') ? ' selected' : '') + '>' + esc(label) + '</option>').join('')
          + '</select>' + mbValHtml(t.val, chain + '>t' + i, 'num');
      }
      html += '<span class="vb-math-op">)</span>'
        + '<button class="vb-edit" data-mb-mathadd="' + esc(chain) + '" title="加一项">＋</button>'
        + '<button class="vb-edit" data-mb-mathdel="' + esc(chain) + '" title="去掉最后一项">－</button>';
      return html;
    }
    return esc(JSON.stringify(v));
  })();
  const edit = v.t === 'n' ? '<button class="vb-edit" data-mb-edit="' + esc(chain) + '" title="修改数字">✎</button>' : '';
  const vt = mbValueType(v);
  return '<span class="vb vb-' + esc(v.t) + ' vb-t-' + esc(vt) + '" data-chain="' + esc(chain) + '" data-mb-slot="' + esc(chain) + '"' + stAttr + '>' + inner + edit + '</span>';
}

function mbCondsOf(b) {
  if (b && Array.isArray(b.conds) && b.conds.length) return b.conds;
  if (b && (b.left !== undefined || b.right !== undefined)) return [{ left: b.left || null, op: b.op || '>', right: b.right || null }];
  return [{ left: null, op: '>', right: null }];
}

function mbIfHint(logic) {
  if (logic === 'and') return '所有条件都成立，才执行下方积木';
  if (logic === 'or') return '任意一个条件成立，就执行下方积木';
  if (logic === 'xor') return 'XOR 的引擎实现较特殊：2 个条件时只看第 2 个；3 个以上要求后续条件与第 2 个结果一致。建议改用 AND / OR，或拆成两条 IF';
  return '只判断这一个条件';
}

function mbCondRow(c, idStr, i, total) {
  const op = (c && c.op) || '>';
  const opHtml = ['>', '<', '='].map((o) => '<option value="' + o + '"' + (o === op ? ' selected' : '') + '>' + (o === '>' ? '&gt;' : o === '<' ? '&lt;' : '=') + '</option>').join('');
  return '<div class="if-cond">'
    + mbValHtml(c && c.left, idStr + ':c' + i + ':left', 'num')
    + '<select class="mb-op" data-mb-op="' + esc(idStr) + ':c' + i + '">' + opHtml + '</select>'
    + mbValHtml(c && c.right, idStr + ':c' + i + ':right', 'num')
    + '<span class="if-cond-idx">条件 ' + (i + 1) + '</span>'
    + (total > 1 ? '<button class="if-cond-x" data-act="mb-cond-del" data-chain="' + esc(idStr) + ':' + i + '" title="删除这条条件">×</button>' : '')
    + '</div>';
}

function mbSetLoop(idStr, node) {
  const st = mbStmt(idStr);
  if (!st) return false;
  mbSnapshot();
  st.loop = node || null;
  return true;
}

function mbStmtHtml(b, idStr) {
  if (!b) return '';
  if (b.k === 'timing') {
    const t = (S.keywords?.timings || []).find((x) => x.en === b.v || String(x.id) === String(b.v));
    const zh = t?.zh || b.v;
    const args = (S.keywords && S.keywords.timingArgs && S.keywords.timingArgs[b.v]) || [];
    const sel = (attr, cur, opts) => '<select class="mb-hat-sel" ' + attr + '="' + esc(idStr) + '">'
      + opts.map(([v, label]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + label + '</option>').join('')
      + '</select>';
    let argHtml = '';
    if (args.includes('face')) argHtml += sel('data-mb-face', b.face || 'None', [['None', '不限面'], ['Head', '正面'], ['Tail', '反面']]);
    if (args.includes('crit')) argHtml += sel('data-mb-crit', b.crit || 'None', [['None', '不限暴击'], ['Crit', '暴击'], ['NoCrit', '非暴击']]);
    if (args.includes('keyword')) argHtml += '<input class="mb-hat-sel" data-mb-kw="' + esc(idStr) + '" list="mb-kw-list" placeholder="关键词" value="' + esc(b.kw || '') + '">';
    if (args.includes('key')) argHtml += '<input class="mb-hat-sel" data-mb-key="' + esc(idStr) + '" list="mb-key-list" placeholder="按键" value="' + esc(b.key || '') + '">';
    const kids = (b.body || []).map((x, i) => mbStmtHtml(x, idStr + '.' + i)).join('');
    const loopNode = b.loop && (b.loop.t === 'target' || b.loop.v) ? b.loop : null;
    const loopLabel = loopNode ? (mbTargetLabel(loopNode) + (loopNode.c ? ' · 数量 ' + loopNode.c : '')) : '无';
    const locked = mbIsLocked(idStr);
    return '<div class="bk hat bk-timing' + selCls(idStr) + (locked ? ' locked' : '') + '" data-mb-bk="' + esc(idStr) + '"' + (locked ? ' title="这一行已被手动改写：积木已锁定，只能整块移动或删除"' : '') + '>' + mbDotHtml(idStr)
      + (locked ? '<span class="bk-lock" title="已被手改锁定">🔒</span>' : '')
      + '<div class="bk-hat-head"><span class="bk-hat-ico">⚑</span><span class="bk-hat-name">' + esc(zh) + '</span>'
      + '<span class="mb-loop-wrap"><span class="mb-loop-label">遍历</span>'
      + '<button class="mb-loop-slot' + (loopNode ? ' on' : '') + '" data-act="mb-loop-slot" data-mb-loop="' + esc(idStr) + ':loop" data-chain="' + esc(idStr) + ':loop" title="本行整段脚本的 Target 会被逐个替换（引擎的 LOOP 是整条脚本级）；点一下清空">' + esc(loopLabel) + '</button></span>'
      + '<span class="bk-tag">TIMING</span></div>'
      + (argHtml ? '<div class="mb-hat-args">' + argHtml + '</div>' : '')
      + '<div class="bk-body" data-stack="' + esc(idStr) + '">' + (kids || '<div class="mb-stack-empty">把积木拖到这里（与此时点同属一段代码）</div>') + '</div></div>';
  }
  if (b.k === 'if' || b.k === 'ifnot') {
    const isNot = b.k === 'ifnot';
    const logic = ['none', 'and', 'or', 'xor'].includes(b.logic) ? b.logic : 'none';
    const conds = mbCondsOf(b);
    const logicSel = '<select class="mb-logic" data-mb-logic="' + esc(idStr) + '">'
      + [['none', '无'], ['and', 'AND'], ['or', 'OR'], ['xor', 'XOR']].map(([v, l]) => '<option value="' + v + '"' + (v === logic ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>';
    const rows = conds.map((c, i) => mbCondRow(c, idStr, i, conds.length)).join('');
    const add = (logic !== 'none' && conds.length < 8) ? '<button class="btn ghost sm if-add" data-act="mb-cond-add" data-chain="' + esc(idStr) + '">＋ 条件</button>' : '';
    const kids = (b.body || []).map((x, i) => mbStmtHtml(x, idStr + '.' + i)).join('') || '<div class="mb-stack-empty">拖动效果函数到这里</div>';
    return '<div class="bk bk-if' + (isNot ? ' bk-ifnot' : '') + selCls(idStr) + '" data-mb-bk="' + esc(idStr) + '">' + mbDotHtml(idStr)
      + '<div class="bk-if-head"><span class="bk-if-label">' + (isNot ? '如果不' : '如果') + '</span>' + logicSel
      + '<span class="bk-tag">' + (isNot ? 'IFNOT' : 'IF') + '</span></div>'
      + '<div class="bk-if-conds">' + rows + add + '</div>'
      + '<div class="bk-if-hint">' + esc(mbIfHint(logic)) + '</div>'
      + '<div class="bk-body" data-stack="' + esc(idStr) + '">' + kids + '</div></div>';
  }
  if (b.k === 'continueif') {
    const logic = ['none', 'and', 'or', 'xor'].includes(b.logic) ? b.logic : 'none';
    const conds = mbCondsOf(b);
    const logicSel = '<select class="mb-logic" data-mb-logic="' + esc(idStr) + '">'
      + [['none', '无'], ['and', 'AND'], ['or', 'OR'], ['xor', 'XOR']].map(([v, l]) => '<option value="' + v + '"' + (v === logic ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>';
    const rows = conds.map((c, i) => mbCondRow(c, idStr, i, conds.length)).join('');
    const add = (logic !== 'none' && conds.length < 8) ? '<button class="btn ghost sm if-add" data-act="mb-cond-add" data-chain="' + esc(idStr) + '">＋ 条件</button>' : '';
    return '<div class="bk bk-if bk-continueif' + selCls(idStr) + '" data-mb-bk="' + esc(idStr) + '">' + mbDotHtml(idStr)
      + '<div class="bk-if-head"><span class="bk-if-label">继续如果</span>' + logicSel + '<span class="bk-tag">CONTINUEIF</span></div>'
      + '<div class="bk-if-conds">' + rows + add + '</div>'
      + '<div class="bk-if-hint">条件不成立时停止本条脚本的后续指令；有遍历时跳到下一个目标</div></div>';
  }
  if (b.k === 'assign') {
    const vars = MB_VARS.map((v) => '<option value="' + v + '"' + (v === (b.var || 'VALUE_0') ? ' selected' : '') + '>' + v + '</option>').join('');
    return '<div class="bk bk-assign' + selCls(idStr) + '" data-mb-bk="' + esc(idStr) + '">' + mbDotHtml(idStr)
      + '<span class="bk-name">把</span><select class="mb-var" data-mb-var="' + esc(idStr) + '">' + vars + '</select>'
      + '<span class="bk-name">设为</span>' + mbValHtml(b.val, idStr + ':val', 'num')
      + '<span class="bk-tag">SET</span></div>';
  }
  const row = (S.mbTables || []).find((r) => r.kind === 'consequence' && r.name === b.n);
  const label = row ? row.summary || b.n : b.n;
  const argsHtml = (b.a || []).map((v, i) => mbArgHtml(v, idStr + ':a:' + i, mbArgType('consequence', b.n, i), 'consequence', b.n, i)).join('<span class="vb-comma">,</span>');
  return '<div class="bk bk-cons' + selCls(idStr) + '" data-mb-bk="' + esc(idStr) + '" title="' + esc(label) + '">' + mbDotHtml(idStr)
    + '<span class="bk-name">' + esc(b.n) + '</span><span class="bk-paren">(</span>' + argsHtml + '<span class="bk-paren">)</span>'
    + '</div>';
}

function mbStackHtml(pathId) {
  const list = mbStackAt(pathId === 'root' ? [] : pathId.split('.').map(Number));
  if (!list) return '';
  return list.map((x, i) => mbStmtHtml(x, (pathId === 'root' ? '' : pathId + '.') + i)).join('');
}

function mbPaletteHtml() {
  const q = (S.mb.search || '').trim().toLowerCase();
  const cat = S.mb.cat;
  const chips = { timing: '时点', target: '目标', action: '效果', acq: '获取', cond: 'IF', var: 'VALUE', buff: 'Buff' };
  const tabs = Object.entries(chips).map(([k, label]) => '<button class="mb-cat' + (cat === k ? ' active' : '') + '" data-act="mb-cat" data-cat="' + k + '">' + label + '</button>').join('');
  let items = [];
  const match = (s) => !q || String(s || '').toLowerCase().includes(q);
  if (cat === 'timing') {
    items = (S.keywords?.timings || []).filter((t) => scopeAllowsTiming(t.en) && (match(t.en) || match(t.zh)))
      .map((t) => '<button class="mb-item mi-timing" data-mb-drag="stmt" data-mb-kind="timing" data-mb-val="' + esc(t.en) + '"><b>' + esc(t.zh || t.en) + '</b><small>' + esc(t.en) + '</small></button>');
  } else if (cat === 'target') {
    const groups = [['single', '单目标'], ['multi', '多目标'], ['tag', '修饰标签（可多选，用 + 连接）']];
    for (const [g, label] of groups) {
      const rows = MB_TARGETS.filter((t) => t.g === g && (match(t.n) || match(t.zh)));
      if (!rows.length) continue;
      items.push('<div class="mb-group">' + label + '</div>');
      for (const t of rows) {
        items.push('<button class="mb-item mi-target" data-mb-drag="value" data-mb-kind="target" data-mb-val="' + esc(t.n) + '"><b>' + esc(t.zh) + '</b><small>' + esc(t.n) + '</small></button>');
      }
    }
    items.push('<button class="mb-item mi-target" data-act="mb-custom-target"><b>自定义目标…</b><small>基础选择器 + 排序 / 队伍 / 排除 / 数量</small></button>');
    const lt = S.mb.loopTarget;
    const ltHtml = lt ? esc(mbTargetLabel(lt)) : '<i><b class="slot-flag-req">必填</b>目标</i>';
    items.unshift('<div class="mb-item mi-loop' + (lt ? ' has-target' : '') + '" data-mb-drag="value" data-mb-kind="loop" role="button" tabindex="0">'
      + '<div class="mi-loop-head"><b>遍历（自定义目标）</b><small>拖到时点右侧「遍历」槽 · 目标拖进下面空位</small></div>'
      + '<span class="slot slot-req slot-loop-card" data-mb-slot="palette:loop" title="拖一个目标积木到这里">' + ltHtml + '</span></div>');
  } else if (cat === 'var') {
    items = MB_VARS.filter((v) => match(v))
      .map((v) => '<button class="mb-item mi-var" data-mb-drag="value" data-mb-kind="var" data-mb-val="' + esc(v) + '"><b>' + esc(v) + '</b><small>通用数值寄存器</small></button>');
    items.unshift('<button class="mb-item mi-math" data-mb-drag="value" data-mb-kind="math"><b>运算 math( )</b><small>加减乘除 / 取小取大取余</small></button>');
    items.unshift('<button class="mb-item mi-assign" data-mb-drag="stmt" data-mb-kind="assign"><b>赋值：VALUE_x 设为 …</b><small>把结果存进寄存器</small></button>');
    items.push('<button class="mb-item mi-var" data-mb-drag="value" data-mb-kind="s" data-mb-val=""><b>文本</b><small>放进去后再点文字修改</small></button>');
  } else if (cat === 'action') {
    items = mbRows('consequence').filter((r) => scopeAllowsCommand(r.name) && (match(r.name) || match(r.summary) || (r.aliasOf || []).some((a) => match(a))))
      .map((r) => '<button class="mb-item mi-cons" data-mb-drag="stmt" data-mb-kind="cons" data-mb-val="' + esc(r.name) + '"><b>' + esc(r.name) + '</b><small>' + esc((r.summary || '（英文原文档未收录说明）') + ((r.aliasOf && r.aliasOf.length) ? '（旧称：' + r.aliasOf.join(' / ') + '）' : '')) + '</small></button>');
  } else if (cat === 'cond') {
    items = [];
    if (match('if') || match('如果') || match('条件')) items.push('<button class="mb-item mi-cond" data-mb-drag="stmt" data-mb-kind="if"><b>如果 … 则</b><small>IF(条件)：成立时执行里面的块</small></button>');
    if (match('ifnot') || match('如果否') || match('条件')) items.push('<button class="mb-item mi-cond" data-mb-drag="stmt" data-mb-kind="ifnot"><b>如果 … 则不</b><small>IFNOT(条件)：不成立时执行里面的块</small></button>');
    if (match('continueif') || match('继续') || match('条件')) items.push('<button class="mb-item mi-cond" data-mb-drag="stmt" data-mb-kind="continueif"><b>继续如果</b><small>CONTINUEIF(条件)：不成立时停止本条脚本后续指令</small></button>');
  } else if (cat === 'buff') {
    const all = (S.keywords?.buffs || []).flatMap((b) => (Array.isArray(b.ids) ? b.ids : [b.id]).map((id) => ({ id: String(id || ''), zh: b.zh || '', native: b.native || '', source: b.source || 'vanilla', panic: !!b.panic, icon: b.icon || null })));
    const seen = new Set();
    const uniq = all.filter((b) => { if (!b.id || b.panic || seen.has(b.id)) return false; seen.add(b.id); return true; });
    const iconHtml = (b) => b.icon
      ? '<img class="mb-bicon" loading="lazy" alt="" src="/api/sprite?mod=' + encodeURIComponent(b.icon.mod) + '&file=' + encodeURIComponent(b.icon.file) + '&t=' + encodeURIComponent(window.__WB_TOKEN__ || '') + '">'
      : '<span class="mb-bicon ph">' + esc(String(b.zh || b.native || b.id || '?').slice(0, 1)) + '</span>';
    const pick = (b) => '<button class="mb-item mi-buff" data-mb-drag="value" data-mb-kind="s" data-mb-val="' + esc(b.id) + '">' + iconHtml(b) + '<span class="mb-btxt"><b>' + esc(b.zh || b.native || b.id) + '</b><small>' + esc(b.id + (b.source === 'mod' ? ' · 本 Mod' : '')) + '</small></span></button>';
    const vis = uniq.filter((b) => match(b.id) || match(b.zh) || match(b.native));
    const mine = vis.filter((b) => b.source === 'mod');
    const vanilla = vis.filter((b) => b.source !== 'mod');
    const fold = (label, list, open) => list.length
      ? '<details class="mb-fold"' + (open ? ' open' : '') + '><summary>' + label + '（' + list.length + '）</summary>' + list.map(pick).join('') + '</details>'
      : '';
    items = [fold('本 MOD 的 Buff', mine, true), fold('原版 Buff', vanilla, false)];
    if (!mine.length && !vanilla.length) items = ['<div class="mb-empty2">没有匹配的 Buff</div>'];
  } else {
    items = mbRows('acquirer').filter((r) => r.name !== 'math' && scopeAllowsCommand(r.name) && (match(r.name) || match(r.summary) || (r.aliasOf || []).some((a) => match(a))))
      .map((r) => '<button class="mb-item mi-acq" data-mb-drag="value" data-mb-kind="acq" data-mb-val="' + esc(r.name) + '"><b>' + esc(r.name) + '()</b><small>' + esc((r.summary || '（英文原文档未收录说明）') + ((r.aliasOf && r.aliasOf.length) ? '（旧称：' + r.aliasOf.join(' / ') + '）' : '')) + '</small></button>');
  }
  const carry = S.mb.carry ? '<div class="mb-carry">拿着：' + (S.mb.carry.type === 'value' ? '数值块' : '语句块') + ' · 点击画布或空位放下（Esc 取消）</div>' : '';
  return '<div class="mb-pal-body">'
    + '<nav class="mb-cats" aria-label="积木分类">' + tabs + '</nav>'
    + '<div class="mb-pal-main"><div class="mb-legend">金色=必填参数；灰色虚线=可选（可留空，游戏按默认处理）</div>'
    + '<div class="mb-pal-head"><input id="mb-search" class="search" placeholder="搜索函数 / 时点" value="' + esc(S.mb.search) + '"></div>' + carry
    + '<div class="mb-items" id="mb-items">' + (items.join('') || '<div class="mb-empty2">没有匹配项</div>') + '</div>'
    + '</div></div>';
}

function mbToolbarHtml() {
  const m = S.mbDoc || {};
  return '<div class="pane-head mb-h"><div class="mb-crumb"><button class="btn ghost sm" data-act="close-module">← 返回</button>'
    + '<h2>' + esc(m.name || m.id) + '</h2>'
    + '<span class="tag">用途：' + esc(scopeZhOf(m.scope || 'common')) + '</span>'
    + (m.test ? '<span class="tag warn">测试模块 · 只读</span>' : '')
    + '</div><span class="spacer"></span>'
    + '<button class="btn ghost sm" data-act="mb-code">查看输出代码</button>'
    + '<button class="btn ghost sm" data-act="mb-undo"' + ((S.mb.hist || []).length ? '' : ' disabled') + ' title="撤销 (Ctrl+Z)">↶ 撤销</button>'
    + '<button class="btn ghost sm" data-act="mb-redo"' + ((S.mb.redo || []).length ? '' : ' disabled') + ' title="重做 (Ctrl+Y)">↷ 重做</button>'
    + '<button class="btn ghost sm" data-act="mb-clear">清空</button>'
    + '<button class="btn primary sm" data-act="mb-save"' + (m.test ? ' disabled' : '') + '>保存模块</button></div>';
}

function mbPropsHtml() {
  const m = S.mbDoc || {};
  const timings = S.keywords?.timings || [];
  const scopes = (S.scopeTables && S.scopeTables.list) || [{ id: 'common', zh: '通用', desc: '' }];
  const opts = timings.map((t) => '<option value="' + esc(t.en) + '"' + (t.en === m.prefix ? ' selected' : '') + '>' + esc((t.zh ? t.zh + ' · ' : '') + t.en) + '</option>').join('');
  return '<div class="mb-props"><label class="field"><span>名称</span><input id="mb-name" value="' + esc(m.name || '') + '"></label>'
    + '<label class="field"><span>前缀（时点）</span><select id="mb-prefix"><option value="">（未指定）</option>' + opts + '</select></label>'
    + '<label class="field"><span>用途</span><select id="mod-scope">' + scopes.map((k) => '<option value="' + esc(k.id) + '"' + (k.id === (m.scope || 'common') ? ' selected' : '') + '>' + esc(k.zh) + (k.desc ? ' · ' + esc(k.desc) : '') + '</option>').join('') + '</select></label>'
    + '<label class="field"><span>描述（可执行词条）</span><textarea id="mb-desc" rows="3" class="desc-input">' + esc(m.desc || '') + '</textarea></label></div>';
}

function mbMissingInfo() {
  const list = [];
  const ids = new Set();
  const push = (idStr, text) => { list.push(text); if (idStr !== null && idStr !== undefined && idStr !== '') ids.add(String(idStr)); };
  const checkVal = (v, idStr) => {
    if (!v || !v.a) return;
    for (let k = 0; k < v.a.length; k++) { if (!v.a[k] && !mbArgOptional('acquirer', v.n, k)) push(idStr, v.n + ' 第 ' + (k + 1) + ' 个参数'); }
  };
  const walk = (blocks, prefix) => {
    (blocks || []).forEach((b, i) => {
      if (!b) return;
      const idStr = prefix ? prefix + '.' + i : String(i);
      if (b.k === 'cons') {
        for (let k = 0; k < (b.a || []).length; k++) {
          const v = b.a[k];
          if (!v && !mbArgOptional('consequence', b.n, k)) push(idStr, b.n + ' 第 ' + (k + 1) + ' 个参数');
          else if (v && v.t === 'acq') checkVal(v, idStr);
        }
      }
      if (b.k === 'if' || b.k === 'ifnot' || b.k === 'continueif') {
        (b.conds || []).forEach((c, ci) => {
          if (!c || !c.left) push(idStr, '第 ' + (ci + 1) + ' 个条件的左侧');
          if (!c || !c.right) push(idStr, '第 ' + (ci + 1) + ' 个条件的右侧');
        });
      }
      if (b.k === 'assign' && !b.val) push(idStr, '赋值的结果值');
      if (b.body) walk(b.body, idStr);
    });
  };
  walk((S.mb && S.mb.program && S.mb.program.blocks) || [], '');
  return { list, ids };
}
function mbMissingRequired() { return mbMissingInfo().list; }
function mbPendingMissing() {
  try { return mbMissingInfo(); } catch (e) { return { list: [], ids: new Set() }; }
}
function mbDotHtml(idStr) {
  const ids = S.mb && S.mb.missingIds;
  if (!ids || !ids.size) return '';
  if (!ids.has(String(idStr))) return '';
  return '<i class="bk-dot" title="该控件未填写必填参数，很可能无法正确执行"></i>';
}
let mbFlashTimer = 0;
function mbFlashMissing() {
  const stage = document.getElementById('mb-stage') || document;
  const slots = Array.from(stage.querySelectorAll('.slot[data-mb-empty="1"]:not(.slot-opt)'));
  if (mbFlashTimer) { clearTimeout(mbFlashTimer); mbFlashTimer = 0; }
  for (const el of slots) el.classList.remove('flash');
  void (stage.offsetWidth || 0);
  for (const el of slots) el.classList.add('flash');
  mbFlashTimer = setTimeout(() => { for (const el of slots) el.classList.remove('flash'); mbFlashTimer = 0; }, 1600);
}

const MB_HIST_MAX = 80;
function mbSnapshot() {
  if (!S.mb) return;
  const now = JSON.stringify(S.mb.program);
  S.mb.hist = S.mb.hist || [];
  const top = S.mb.hist.length ? S.mb.hist[S.mb.hist.length - 1] : null;
  if (top === now) return;
  S.mb.hist.push(now);
  if (S.mb.hist.length > MB_HIST_MAX) S.mb.hist.shift();
  S.mb.redo = [];
}
function mbUndo() {
  if (!S.mb) return;
  if (!S.mb.hist || !S.mb.hist.length) { toast('没有可撤销的操作', 'warn'); return; }
  S.mb.redo = S.mb.redo || [];
  S.mb.redo.push(JSON.stringify(S.mb.program));
  S.mb.program = JSON.parse(S.mb.hist.pop());
  S.mb.sel = null;
  render();
  toast('已撤销');
}
function mbRedo() {
  if (!S.mb) return;
  if (!S.mb.redo || !S.mb.redo.length) { toast('没有可重做的操作', 'warn'); return; }
  S.mb.hist = S.mb.hist || [];
  S.mb.hist.push(JSON.stringify(S.mb.program));
  S.mb.program = JSON.parse(S.mb.redo.pop());
  S.mb.sel = null;
  render();
  toast('已重做');
}
function mbLoopRowCount() {
  return ((S.mb && S.mb.program && S.mb.program.blocks) || []).filter((b) => b && b.k === 'timing' && b.loop && b.loop.n).length;
}

function mbCompileRows() {
  const val = (v, nested) => {
    if (!v) return '_';
    if (v.t === 'target') {
      const tn = String(v.n || '');
      const cnt = v.c === null || v.c === undefined || v.c === '' ? '' : String(v.c);
      if (!cnt) return tn;
      const k = tn.indexOf('$');
      return k < 0 ? tn + cnt : tn.slice(0, k) + cnt + tn.slice(k);
    }
    if (v.t === 'var') return v.n;
    if (v.t === 'n') return String(v.v);
    if (v.t === 's') return String(v.v);
    if (v.t === 'acq') {
      const list = (v.a || []).map((x) => (x ? val(x, true) : ''));
      while (list.length && (list[list.length - 1] === '' || list[list.length - 1] === '_')) list.pop();
      return nested ? 'G' + v.n + '{' + list.join('-') + '}' : v.n + '(' + list.join(',') + ')';
    }
    if (v.t === 'math') {
      const head = v.first ? val(v.first, true) : '0';
      const rest = (v.tail || []).map((t) => (t.op || '+') + (t.val ? val(t.val, true) : '0')).join('');
      return 'math(' + head + rest + ')';
    }
    return '_';
  };
  const logicOf = (b) => (['and', 'or', 'xor'].includes(b.logic) ? b.logic : 'none');
  const condText = (c) => (c && c.left ? val(c.left, true) : 'VALUE_0') + ((c && c.op) || '>') + (c && c.right ? val(c.right, true) : 'VALUE_0');
  const condsText = (b) => {
    const list = Array.isArray(b.conds) && b.conds.length ? b.conds : [{ left: b.left, op: b.op, right: b.right }];
    const head = logicOf(b) === 'none' ? '' : logicOf(b).toUpperCase() + ',';
    return head + list.map(condText).join(',');
  };
  const stmt = (b) => {
    if (!b) return '';
    if (b.k === 'cons') {
      const list = (b.a || []).map((x) => (x ? val(x, true) : ''));
      while (list.length && (list[list.length - 1] === '' || list[list.length - 1] === '_')) list.pop();
      return b.n + '(' + list.join(',') + ')';
    }
    if (b.k === 'assign') return (b.var || 'VALUE_0') + ':' + val(b.val);
    if (b.k === 'if' || b.k === 'ifnot') {
      const kw = b.k === 'ifnot' ? 'IFNOT' : 'IF';
      const kids = (b.body || []).map(stmt).filter(Boolean).join(':');
      return kw + '(' + condsText(b) + ')' + (kids ? ':' + kids : '');
    }
    if (b.k === 'continueif') return 'CONTINUEIF(' + condsText(b) + ')';
    return '';
  };
  const hatText = (b) => {
    const args = (S.keywords && S.keywords.timingArgs && S.keywords.timingArgs[b.v]) || [];
    const parts = [];
    if (args.includes('face') || args.includes('crit')) {
      parts.push(args.includes('face') ? (b.face || 'None') : 'None');
      parts.push(args.includes('crit') ? (b.crit || 'None') : 'None');
    }
    if (args.includes('keyword') && b.kw) parts.push(b.kw);
    if (args.includes('key') && b.key) parts.push(b.key);
    const nonEmpty = parts.filter((x) => x && x !== 'None').length > 0;
    return 'TIMING:' + b.v + (nonEmpty ? '(' + parts.join(',') + ')' : '');
  };
  const groups = [];
  const blocks = (S.mb.program && S.mb.program.blocks) || [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    if (!b) continue;
    if (b.k === 'timing') { groups.push({ key: String(bi), hat: b, items: (b.body || []).slice() }); continue; }
    if (!groups.length) groups.push({ key: null, hat: null, items: [] });
    groups[groups.length - 1].items.push(b);
  }
  const manual = (S.mb.program && S.mb.program.manual) || {};
  const out = [];
  for (const r of groups) {
    const override = r.key !== null && manual[r.key] !== undefined ? String(manual[r.key]) : '';
    if (override) { out.push({ key: r.key, text: override, manual: true }); continue; }
    const parts = [];
    if (r.hat) {
      parts.push(hatText(r.hat));
      if (r.hat.loop && r.hat.loop.n) parts.push('LOOP:' + val(r.hat.loop, true));
    }
    for (const it of r.items) { const t = stmt(it); if (t) parts.push(t); }
    if (!parts.length) continue;
    out.push({ key: r.key, text: 'Modular/' + parts.join('/'), manual: false });
  }
  return out;
}

/** 兼容旧调用：把每行脚本用换行拼起来（每行都是一条完整脚本） */
function mbCompileScript() {
  const rows = mbCompileRows();
  return rows.length ? rows.map((r) => r.text).join('\n') : '// 还没有积木';
}

/** 该行（根层时点块）是否已被手改锁定 */
function mbIsLocked(idStr) {
  const key = String(idStr || '');
  if (!/^\d+$/.test(key)) return false;
  const manual = (S.mb && S.mb.program && S.mb.program.manual) || {};
  return manual[key] !== undefined && manual[key] !== '';
}

function mbLockRow(key) {
  const row = mbCompileRows().find((r) => String(r.key) === String(key));
  if (!row) return;
  mbSnapshot();
  const manual = { ...(S.mb.program.manual || {}) };
  manual[String(key)] = row.text;
  S.mb.program = { ...S.mb.program, manual };
  render();
  toast('这一行已改为手改模式，对应积木已锁定', 'warn');
}

async function saveModuleProgram(quiet) {
  const info = mbMissingInfo();
  let res = null;
  const body = { id: S.moduleEditing, program: S.mb.program, expectUpdatedAt: S.mb.savedAt || '', force: !!S.mb.forceSave };
  try { res = await api('/api/module/program', { method: 'POST', body }); }
  catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (/已被修改/.test(msg) && !S.mb.forceSave) {
      if (!confirm('模块文件在磁盘上已被修改（可能别的窗口/别的程序动过）。要用当前画布覆盖吗？')) return false;
      S.mb.forceSave = true;
      return saveModuleProgram(quiet);
    }
    toast(msg, 'bad');
    return false;
  }
  S.mb.forceSave = false;
  S.mb.savedAt = (res.module && res.module.updatedAt) || '';
  S.mb.saved = JSON.stringify(S.mb.program);
  S.mb.hist = [];
  S.mb.redo = [];
  S.modules = (await api('/api/modules')).modules;
  if (!quiet) {
    if (info.list.length) {
      S.mb.showMissing = true;
      toast('已保存；有 ' + info.list.length + ' 处必填参数未填，可能无法正确执行', 'warn');
      mbFlashMissing();
    } else {
      S.mb.showMissing = false;
      toast('模块已保存', 'ok');
    }
  }
  render();
  return true;
}

function renderMbCodePage() {
  const rows = mbCompileRows();
  const manual = (S.mb.program && S.mb.program.manual) || {};
  const body = rows.map((r, i) => {
    const key = r.key === null || r.key === undefined ? '' : String(r.key);
    const locked = key !== '' && manual[key] !== undefined;
    return '<div class="code-row">'
      + '<div class="code-row-head"><span class="code-row-idx">第 ' + (i + 1) + ' 行</span>'
      + (locked
        ? '<span class="tag warn">已手改 · 积木已锁定</span>'
        : '<button class="btn ghost sm" data-act="mb-code-lock" data-key="' + esc(key) + '">手动修改</button>')
      + '</div>'
      + '<textarea class="code-text" data-key="' + esc(key) + '" rows="2" spellcheck="false"' + (locked ? '' : ' readonly') + '>' + esc(r.text) + '</textarea>'
      + '</div>';
  }).join('') || '<div class="list-empty">还没有积木</div>';
  return '<div class="pane-head mb-h"><div class="mb-crumb"><button class="btn ghost sm" data-act="mb-code-back">← 返回积木</button><h2>输出代码</h2></div><span class="spacer"></span>'
    + '<button class="btn primary sm" data-act="mb-code-save">保存代码</button></div>'
    + '<div class="code-page"><div class="code-hint">每行是一条独立脚本（可直接核对游戏里看到的样子）。点「手动修改」后该行对应的时点积木会被锁定，只能在积木页整块移动或删除。</div>'
    + body + '</div>';
}

function renderModuleEditor(back) {
  if (S.mb && S.mb.codePage) return renderMbCodePage();
  return renderModuleEditorInner(back);
}

function renderModuleEditorInner(back) {
  if (!S.mb || !S.mbDoc) {
    return '<div class="pane-head">' + back + '<div><h2>模块编辑</h2></div></div><div class="mb-loading">正在载入模块…</div>';
  }
  if (S.mb && S.mb.saved === undefined) S.mb.saved = JSON.stringify(S.mb.program);
  S.mb.missingIds = S.mb.showMissing ? mbMissingInfo().ids : null;
  const kwList = (S.keywords?.buffs || []).map((b) => String(b.id || (b.ids && b.ids[0]) || '')).filter(Boolean);
  const keyList = ['LeftControl', 'LeftShift', 'LeftAlt', 'Space', 'Tab', 'E', 'Q', 'R', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
  const datalists = '<datalist id="mb-kw-list">' + kwList.map((k) => '<option value="' + esc(k) + '">').join('') + '</datalist>'
    + '<datalist id="mb-key-list">' + keyList.map((k) => '<option value="' + k + '">').join('') + '</datalist>';
  const script = S.mb.showScript ? '<pre class="mb-script" id="mb-script">' + esc(mbCompileScript()) + '</pre>' : '';
  const loopRows = mbLoopRowCount();
  const loopWarn = loopRows > 1
    ? '<div class="mb-warn">有 ' + loopRows + ' 行都设置了遍历：引擎的 LOOP 是模块级字段，同一模块只会应用最后一段，请只保留一行。</div>'
    : '';
  return mbToolbarHtml() + loopWarn
    + (S.mb.showProps ? mbPropsHtml() : '')
    + '<div class="mb-body"><aside class="mb-pal">' + mbPaletteHtml() + '</aside>'
    + '<section class="mb-stage"><div class="mb-stage-head"><span>积木画布</span><span class="muted">从上到下拼接；带括号的块可以往括号里拖数值块</span></div>'
    + '<div class="mb-canvas" id="mb-canvas"><div class="mb-stack" data-stack="root">' + mbStackHtml('root') + '</div>'
    + (S.mb.program.blocks.length ? '' : '<div class="mb-empty">拖一个「时点」积木进来开始</div>') + '</div>' + '<div class="mb-trash" id="mb-trash" title="拖到这里删除"><span>🗑</span><small>拖此删除</small></div>' + script + '</section></div>' + datalists;
}
/* ---------------- 程序变更 ---------------- */

function mbRowByName(name) { return (S.mbTables || []).find((r) => r.name === name); }
function mbArgEnum(kind, name, i) {
  const m = (S.keywords && S.keywords.argEnums) || {};
  return m[kind + ':' + name + ':' + i] || null;
}

// 固定取值集合 → 下拉；其余仍走积木槽
function mbArgHtml(v, chain, slotType, kind, name, i) {
  const en = mbArgEnum(kind, name, i);
  const opt = mbArgOptional(kind, name, i);
  if (!en) return mbValHtml(v, chain, slotType, opt);
  const scalar = !v || v.t === 's' || v.t === 'n' || v.t === 'var';
  if (!scalar) return mbValHtml(v, chain, slotType, opt);
  let cur = '';
  if (v) cur = v.t === 'var' ? String(v.n) : String(v.v);
  const has = en.values.some(([val]) => String(val) === cur);
  const extra = cur && !has ? '<option value="' + esc(cur) + '" selected>（原值）' + esc(cur) + '</option>' : '';
  const opts = en.values.map(([val, label]) => '<option value="' + esc(val) + '"' + (String(val) === cur ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
  return '<select class="mb-arg-enum" data-mb-arg="' + esc(chain) + '" title="' + esc(en.zh || '') + '">'
    + '<option value=""' + (cur ? '' : ' selected') + '>（空）</option>' + extra + opts + '</select>';
}

function mbArgOptional(kind, name, i) {
  const map = S.keywords && S.keywords.argOptional && S.keywords.argOptional[kind];
  const list = map && map[name];
  if (Array.isArray(list) && list.includes(i)) return true;
  const r = (S.mbTables || []).find((x) => x.kind === kind && x.name === name);
  const p = r && Array.isArray(r.params) ? r.params[i] : null;
  return /^opt/i.test(String((p && p.name) || ''));
}
function mbArgCount(kind, name) {
  const ac = S.keywords && S.keywords.argCounts && S.keywords.argCounts[kind];
  if (ac && typeof ac[name] === 'number') return ac[name];
  const r = (S.mbTables || []).find((x) => x.kind === kind && x.name === name);
  return r && Array.isArray(r.args) ? r.args.length : 0;
}

function mbPayloadFrom(el) {
  const kind = el.dataset.mbKind;
  const val = el.dataset.mbVal || '';
  if (el.dataset.mbDrag === 'stmt') {
    if (kind === 'timing') return { type: 'stmt', node: { k: 'timing', v: val, body: [], loop: null } };
    if (kind === 'if') return { type: 'stmt', node: { k: 'if', logic: 'none', conds: [{ left: null, op: '>', right: null }], body: [] } };
    if (kind === 'ifnot') return { type: 'stmt', node: { k: 'ifnot', logic: 'none', conds: [{ left: null, op: '>', right: null }], body: [] } };
    if (kind === 'continueif') return { type: 'stmt', node: { k: 'continueif', logic: 'none', conds: [{ left: null, op: '>', right: null }] } };
    if (kind === 'cons') return { type: 'stmt', node: { k: 'cons', n: val, a: new Array(mbArgCount('consequence', val)).fill(null) } };
    if (kind === 'assign') return { type: 'stmt', node: { k: 'assign', var: 'VALUE_0', val: null } };
  } else {
    if (kind === 'loop') return { type: 'value', loop: true, node: (S.mb && S.mb.loopTarget) ? S.mb.loopTarget : null };
    if (kind === 'target') return { type: 'value', node: { t: 'target', n: val, c: null } };
    if (kind === 'var') return { type: 'value', node: { t: 'var', n: val } };
    if (kind === 'n') return { type: 'value', node: { t: 'n', v: Number(val) || 0 } };
    if (kind === 's') return { type: 'value', node: { t: 's', v: String(val || '') } };
    if (kind === 'acq') return { type: 'value', node: { t: 'acq', n: val, a: new Array(mbArgCount('acquirer', val)).fill(null) } };
    if (kind === 'math') return { type: 'value', node: { t: 'math', first: null, tail: [{ op: '+', val: null }] } };
  }
  return null;
}

function mbAccess(chain) {
  // 兼容两种链式写法：`0:a:3`（参数槽）与 `0:a3`、`0:c0:left`（条件槽）
  const parts = String(chain || '').split(':');
  const all = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'a' && /^\d+$/.test(parts[i + 1] || '')) { all.push('a' + parts[i + 1]); i++; }
    else all.push(parts[i]);
  }
  if (all.length < 2) return null;
  const stmt = mbStmt(all[0]);
  if (!stmt) return null;
  const steps = [];
  for (let i = 1; i < all.length; i++) {
    const raw = all[i];
    const pieces = raw.split('>');
    const head = pieces[0];
    const rest = pieces.slice(1).map((x) => Number(x)).filter((x) => !isNaN(x));
    let arr = null, idx = null, field = null;
    let m = /^a(\d+)$/.exec(head);
    if (m) { arr = 'a'; idx = Number(m[1]); }
    else if ((m = /^c(\d+)$/.exec(head))) { arr = 'conds'; idx = Number(m[1]); }
    else if ((m = /^t(\d+)$/.exec(head))) { arr = 'tail'; idx = Number(m[1]); }
    else if (['loop', 'val', 'left', 'right', 'op', 'f'].includes(head)) field = head;
    else return null;
    steps.push({ arr, idx, field, rest });
  }
  const readStep = (node, st) => {
    if (!node) return null;
    if (st.field === 'f') return node.first || null;
    if (st.arr === 'conds') { const c = (node.conds || [])[st.idx] || null; return c; }
    if (st.arr === 'a') return (node.a || [])[st.idx] || null;
    if (st.arr === 'tail') { const e = (node.tail || [])[st.idx] || null; return e ? e.val || null : null; }
    return node[st.field] === undefined ? null : node[st.field];
  };
  const writeStep = (node, st, v) => {
    if (!node) return false;
    if (st.field === 'f') { node.first = v; return true; }
    if (st.arr === 'conds') { node.conds = node.conds || []; const c = node.conds[st.idx]; if (!c) return false; return true; }
    if (st.arr === 'a') { node.a = node.a || []; node.a[st.idx] = v; return true; }
    if (st.arr === 'tail') { node.tail = node.tail || []; const e = node.tail[st.idx]; if (!e) return false; e.val = v; return true; }
    node[st.field] = v; return true;
  };
  const lastSt = steps[steps.length - 1];
  const descend = (v, idxs) => { let cur = v; for (const k of idxs) { if (!cur) return null; cur = (cur.a || [])[k] || null; } return cur; };
  const get = () => {
    let cur = stmt;
    for (let i = 0; i < steps.length - 1; i++) { cur = readStep(cur, steps[i]); if (!cur) return null; }
    const v = readStep(cur, lastSt);
    return lastSt.rest.length ? descend(v, lastSt.rest) : v;
  };
  const set = (v) => {
    let cur = stmt;
    for (let i = 0; i < steps.length - 1; i++) { cur = readStep(cur, steps[i]); if (!cur) return false; }
    if (lastSt.rest.length) {
      let holder = readStep(cur, lastSt);
      for (let k = 0; k < lastSt.rest.length - 1; k++) holder = (holder && holder.a ? holder.a[lastSt.rest[k]] : null);
      if (!holder) return false;
      holder.a = holder.a || [];
      holder.a[lastSt.rest[lastSt.rest.length - 1]] = v;
      return true;
    }
    return writeStep(cur, lastSt, v);
  };
  return { get, set };
}

function mbIsDirty() {
  if (!S.mb || S.mb.saved === undefined) return false;
  try { return JSON.stringify(S.mb.program) !== S.mb.saved; } catch { return false; }
}
function mbLeaveGuard(then) {
  const info = mbPendingMissing();
  if (info.list.length) {
    S.mb.leave = then;
    const sample = info.list.slice(0, 3).join('、');
    modal({
      title: '有未填的必填参数',
      body: '<p>还有 <b>' + info.list.length + '</b> 处必填参数没有填：' + esc(sample) + (info.list.length > 3 ? ' 等' : '') + '。</p>'
        + '<p class="muted">现在退出仍会把当前改动保存下来，但保存后这些控件右上角会出现红点，游戏里很可能无法正确执行。</p>',
      footer: '<button class="btn ghost" data-act="close-modal">返回修改</button><button class="btn danger" data-act="mb-leave-missing-ok">仍然退出</button>',
    });
    return;
  }
  mbGuardDirty(then);
}
function mbGuardDirty(then) {
  if (!mbIsDirty()) { then(); return; }
  S.mb.leave = then;
  modal({ title: '模块尚未保存', body: '<p>当前模块有未保存的改动。</p>', footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn danger" data-act="mb-leave-discard">放弃更改</button><button class="btn primary" data-act="mb-leave-save">保存并离开</button>' });
}
function mbSetSlot(chain, value) { const ref = mbAccess(chain); if (!ref) return false; ref.set(value); return true; }
function mbClearSlot(chain) { const ref = mbAccess(chain); if (!ref) return; mbSnapshot(); ref.set(null); }
function mbInsideLoop(stackId) {
  const p = String(stackId || 'root');
  if (p === 'root') return false;
  let list = S.mb.program.blocks;
  for (const k of p.split(".").map(Number)) {
    const n = list && list[k];
    if (!n) return false;
    if (n.k === 'loop') return true;
    list = n.body;
  }
  return false;
}
function mbKindName(node) {
  const k = node && node.k;
  return k === 'if' ? '如果' : k === 'ifnot' ? '如果否' : k === 'continueif' ? '继续如果' : k === 'assign' ? '赋值' : '效果块';
}
function mbHasTimingAncestor(stackId) {
  const p = String(stackId || 'root');
  if (!p || p === 'root') return false;
  let list = (S.mb && S.mb.program && S.mb.program.blocks) || [];
  for (const seg of p.split('.')) {
    const node = list[Number(seg)];
    if (!node) return false;
    if (node.k === 'timing') return true;
    list = node.body || [];
  }
  return false;
}
function mbAllowsPlace(stackId, index, node) {
  if (!node) return { ok: false, msg: '' };
  const root = String(stackId || 'root') === 'root';
  if (node.k === 'timing') {
    if (!root) return { ok: false, msg: '时点块只能放在最外层' };
    return { ok: true, msg: '' };
  }
  if (root) return { ok: false, msg: mbKindName(node) + '必须放进某个时点块里面（最外层只放时点）' };
  if (!mbHasTimingAncestor(stackId)) return { ok: false, msg: '只能放在时点块内部' };
  return { ok: true, msg: '' };
}
function mbInsert(stackId, index, node) {
  try {
    const host = document.querySelector('[data-stack="' + String(stackId) + '"]');
    if (host && host.closest('.bk.locked')) { toast('这一行已被手改锁定：只能整块移动或删除', 'warn'); return false; }
  } catch (e) {}
  if (!node) return false;
  const root = String(stackId || 'root') === 'root';
  const list = root ? ((S.mb && S.mb.program && S.mb.program.blocks) || []) : mbStackAt(String(stackId).split('.').map(Number));
  if (!list) return false;
  const i = Math.max(0, Math.min(Number(index) || 0, list.length));
  const gate = mbAllowsPlace(stackId, i, node);
  if (!gate.ok) { toast(gate.msg, 'warn'); return false; }
  mbSnapshot();
  list.splice(i, 0, node);
  return true;
}
function mbRemove(idStr) {
  const p = String(idStr).split('.').map(Number);
  const list = mbStackAt(p.slice(0, -1));
  if (!list) return;
  mbSnapshot();
  list.splice(p[p.length - 1], 1);
}

function mbIndexAt(stackEl, y) {
  const kids = [...stackEl.children].filter((c) => c.classList && c.classList.contains('bk'));
  for (let i = 0; i < kids.length; i++) {
    const r = kids[i].getBoundingClientRect();
    if (y < r.top + r.height / 2) return i;
  }
  return kids.length;
}

/* ---------------- 拖拽与点选 ---------------- */

function mbGhost(text, x, y) {
  let g = document.getElementById('mb-ghost');
  if (!g) { g = document.createElement('div'); g.id = 'mb-ghost'; document.body.appendChild(g); }
  g.textContent = text;
  g.style.left = x + 12 + 'px';
  g.style.top = y + 10 + 'px';
  g.hidden = false;
}

function mbClearHighlight() {
  document.querySelectorAll('.mb-hot').forEach((el) => el.classList.remove('mb-hot'));
}

function mbInlineEdit(el, chain, type, cur) {
  if (!el || el.querySelector('input.mb-inline')) return;
  const isNum = type === 'num';
  const original = el.innerHTML;
  const inp = document.createElement('input');
  inp.className = 'mb-inline';
  inp.type = isNum ? 'number' : 'text';
  inp.value = cur === null || cur === undefined ? '' : String(cur);
  el.innerHTML = '';
  el.appendChild(inp);
  inp.focus();
  try { inp.select(); } catch {}
  let done = false;
  // 空输入 = 取消：只把本槽恢复原样，不做整页重绘（否则会顺手把另一个正在编辑的输入框重建掉）
  const finishEmpty = () => {
    if (el.isConnected) el.innerHTML = original;
    if (!document.querySelector('input.mb-inline')) setTimeout(() => { if (!document.querySelector('input.mb-inline')) render(); }, 0);
  };
  const commit = () => {
    if (done) return;
    done = true;
    const raw = String(inp.value == null ? '' : inp.value).trim();
    if (raw === '') { finishEmpty(); return; }
    mbSnapshot();
    if (isNum) {
      const num = Number(raw);
      if (!Number.isFinite(num)) { finishEmpty(); return; }
      mbSetSlot(chain, { t: 'n', v: Math.trunc(num) });
    } else {
      mbSetSlot(chain, { t: 's', v: raw });
    }
    // 若还有别的槽在编辑，先不重绘（等它结束时的重绘一起显示新值）
    if (document.querySelectorAll('input.mb-inline').length > 1) { if (el.isConnected) el.innerHTML = original; return; }
    setTimeout(render, 0);
  };
  const cancel = () => {
    if (done) return;
    done = true;
    finishEmpty();
  };
  inp.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
  });
  inp.addEventListener('blur', commit);
}
function mbSlotChain(el) {
  if (!el) return '';
  return el.dataset.mbSlot || el.dataset.chain || '';
}

function mbSlotAt(x, y) {
  for (const el of document.querySelectorAll('.slot, [data-mb-slot]')) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el;
  }
  return null;
}

function mbDropResolve(x, y, payload) {
  const el = document.elementFromPoint(x, y);
  if (!el) return false;
  const geoSlot = mbSlotAt(x, y);
  if (payload.loop) {
    if (!payload.node) { toast('先往「遍历（自定义目标）」卡片里拖一个目标，再把它拖进时点右侧的遍历槽', 'warn'); return false; }
    const slotEl = el.closest('[data-mb-loop]') || (geoSlot && geoSlot.closest('[data-mb-loop]'));
    if (!slotEl) { toast('遍历块只能放到时点块右侧的「遍历」槽里', 'warn'); return false; }
    return mbSetSlot(slotEl.dataset.mbLoop, payload.node);
  }
  const slot = el.closest('.slot') || el.closest('[data-mb-slot]') || geoSlot;
  if (slot && mbSlotChain(slot) === 'palette:loop') {
    const node = payload && payload.node ? payload.node : null;
    if (!node || mbValueType(node) !== 'target') { toast('这里只能放目标积木（把「目标」里的任意一个拖进来）', 'warn'); return false; }
    S.mb.loopTarget = node;
    render();
    toast('遍历目标已设为 ' + mbTargetLabel(node), 'ok');
    return true;
  }
  if (payload.type === 'value') {
    if (!slot) return false;
    const want = slot.dataset.slotType || 'any';
    if (!mbCompatible(want, mbValueType(payload.node))) { toast('这个位置只能放「' + (MB_TYPE_ZH[want] || want) + '」', 'warn'); return false; }
    return mbSetSlot(mbSlotChain(slot), payload.node);
  }
  const stackEl = el.closest('[data-stack]');
  if (slot && !stackEl) return false;
  if (stackEl) return mbInsert(stackEl.dataset.stack, mbIndexAt(stackEl, y), payload.node);
  if (el.closest('.mb-canvas')) {
    const root = document.querySelector('.mb-canvas .mb-stack');
    if (root) { mbInsert('root', mbIndexAt(root, y), payload.node); return true; }
  }
  return false;
}

function mbOverTrash(x, y) {
  const t = document.getElementById('mb-trash');
  if (!t) return false;
  const r = t.getBoundingClientRect();
  return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
}

function mbBindDrag() {
  document.addEventListener('mousedown', (e) => {
    if (!S.mb || !S.mbDoc) return;
    if (e.button !== 0) return;
    // 原生控件（下拉、输入框）优先处理，绝不能被拖拽拦截（否则 preventDefault 会吃掉下拉与聚焦）
    if (e.target.closest('input, select, textarea, option, [contenteditable="true"], label')) {
      if (!e.target.closest('[data-mb-drag]')) return;
    }
    if (e.target.closest('.bk-x, .vb-x, .vb-edit, .no-drag')) return;
    if (e.target.closest('button') && !e.target.closest('[data-mb-drag]')) return;
    const pal = e.target.closest('[data-mb-drag]');
    const bk = e.target.closest('[data-mb-bk]');
    const vb = e.target.closest('.vb');
    if (!pal && !bk && !vb) return;
    if (!pal && !vb && e.target.closest('.slot')) return;
    let payload = null; let label = '';
    if (pal) { payload = mbPayloadFrom(pal); label = (pal.querySelector('b') || {}).textContent || '积木'; if (payload) payload.fromPalette = true; }
    else if (vb) { const chain = vb.dataset.chain || (vb.parentElement && vb.parentElement.closest('[data-mb-slot]')?.dataset.mbSlot) || ''; if (!chain) return; const ref = mbAccess(chain); if (!ref || !ref.get()) return; payload = { type: 'value', node: JSON.parse(JSON.stringify(ref.get())), fromChain: chain }; label = '数值块'; }
    else if (bk) { const id = bk.dataset.mbBk; const cur = mbStmt(id); if (!cur) return; payload = { type: 'stmt', node: JSON.parse(JSON.stringify(cur)), fromId: id }; label = cur.k === 'if' ? '如果' : (cur.n || cur.k); }
    if (!payload) return;
    S.mb.drag = { payload, label, x0: e.clientX, y0: e.clientY, active: false };
    e.preventDefault();
  }, true);

  document.addEventListener('mousemove', (e) => {
    const d = S.mb && S.mb.drag;
    if (!d) return;
    if (!d.active) {
      if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 6) return;
      d.active = true;
      document.body.classList.add('mb-dragging');
    }
    mbGhost(d.label, e.clientX, e.clientY);
    mbClearHighlight();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slot = el && el.closest('.slot');
    const stackEl = el && el.closest('[data-stack]');
    const trashEl = document.getElementById('mb-trash');
    if (trashEl) { if (mbOverTrash(e.clientX, e.clientY)) trashEl.classList.add('hot'); else trashEl.classList.remove('hot'); }
    if (d.payload.type === 'value') { if (slot) slot.classList.add('mb-hot'); }
    else if (stackEl) stackEl.classList.add('mb-hot');
  });

  document.addEventListener('mouseup', (e) => {
    const d = S.mb && S.mb.drag;
    if (!d) return;
    S.mb.drag = null;
    const g = document.getElementById('mb-ghost'); if (g) g.hidden = true;
    document.body.classList.remove('mb-dragging');
    mbClearHighlight();
    if (d.active) {
      S.mb.suppressClick = Date.now();
      const dropEl = document.elementFromPoint(e.clientX, e.clientY);
      const onTrash = mbOverTrash(e.clientX, e.clientY);
      const onPal = dropEl && dropEl.closest && dropEl.closest('.mb-pal');
      if ((onTrash || onPal) && (d.payload.fromId || d.payload.fromChain)) {
        if (d.payload.fromId) mbRemove(d.payload.fromId); else mbClearSlot(d.payload.fromChain);
        toast(onTrash ? '已删除该积木' : '已移出画布', 'warn');
        render();
        return;
      }
      const ok = mbDropResolve(e.clientX, e.clientY, d.payload);
      if (!ok) { toast('这里放不下这个块', 'warn'); }
      else if (d.payload.fromId) mbRemove(d.payload.fromId);
      else if (d.payload.fromChain) {
        const up = document.elementFromPoint(e.clientX, e.clientY);
        const tgt = up && up.closest ? (up.closest('[data-mb-slot]') || up.closest('.slot')) : null;
        if (mbSlotChain(tgt) !== d.payload.fromChain) mbClearSlot(d.payload.fromChain);
      }
      render();
      return;
    }
    // 未拖动 = 点击
    if (d.payload.fromPalette) {
      S.mb.carry = d.payload;
      toast(d.payload.type === 'value' ? '已选中数值块：点一个空位放进去' : '已选中语句块：点画布放下');
      render();
      return;
    }
    if (S.mb.carry) {
      const ok = mbDropResolve(e.clientX, e.clientY, S.mb.carry);
      if (ok) { S.mb.carry = null; render(); }
    }
  });
}

function mbBindEmptySlot() {
  if (S.__slotBound) return;
  S.__slotBound = true;
  document.addEventListener('click', (e) => {
    if (!S.mb || !S.mbDoc || S.mb.carry) return;
    const slot = e.target && e.target.closest ? e.target.closest('.slot[data-mb-empty]') : null;
    if (!slot) return;
    e.preventDefault();
    e.stopPropagation();
    const st = slot.dataset.slotType || 'any';
    if (st === 'num' || st === 'text' || st === 'any') { mbInlineEdit(slot, mbSlotChain(slot), st === 'text' ? 'text' : 'num', null); return; }
    toast('从左侧把「' + (MB_TYPE_ZH[st] || '对应类型') + '」积木拖进这个空位（或点左侧条目后点这里）');
  }, true);
}

function mbPaletteClick(e) {
  const pal = e.target.closest('[data-mb-drag]');
  if (!pal) return false;
  const payload = mbPayloadFrom(pal);
  if (!payload) return false;
  S.mb.carry = payload;
  render();
  return true;
}

function mbCanvasClick(e) {
  if (!S.mb || !S.mb.carry) return false;
  const carry = S.mb.carry;
  const geoSlot = mbSlotAt(e.clientX, e.clientY);
  if (carry.loop) {
    const slotEl = e.target.closest('[data-mb-loop]') || (geoSlot && geoSlot.closest('[data-mb-loop]'));
    if (!slotEl) { toast('先点时点块右侧的「遍历」槽', 'warn'); return false; }
    if (!mbSetSlot(slotEl.dataset.mbLoop, carry.node)) return false;
    S.mb.carry = null; render(); return true;
  }
  const slot = e.target.closest('.slot') || e.target.closest('[data-mb-slot]') || geoSlot;
  const stackEl = e.target.closest('[data-stack]');
  if (slot && mbSlotChain(slot) === 'palette:loop') {
    const node = carry && carry.node ? carry.node : null;
    if (!node || mbValueType(node) !== 'target') { toast('这里只能放目标积木', 'warn'); return false; }
    S.mb.loopTarget = node; S.mb.carry = null; render(); toast('遍历目标已设为 ' + mbTargetLabel(node), 'ok'); return true;
  }
  if (carry.loop && !carry.node) { toast('先往「遍历（自定义目标）」卡片里拖一个目标', 'warn'); return false; }
  if (carry.type === 'value') {
    if (!slot) return false;
    const want = slot.dataset.slotType || 'any';
    if (!mbCompatible(want, mbValueType(carry.node))) { toast('这个位置只能放「' + (MB_TYPE_ZH[want] || want) + '」', 'warn'); return false; }
    mbSetSlot(mbSlotChain(slot), carry.node);
  } else {
    let ok = false;
    if (stackEl) ok = mbInsert(stackEl.dataset.stack, stackEl.children.length, carry.node);
    else {
      const root = document.querySelector('.mb-canvas .mb-stack');
      if (!root) return false;
      ok = mbInsert('root', root.children.length, carry.node);
    }
    if (!ok) { render(); return false; }
  }
  S.mb.carry = null;
  render();
  return true;
}

/* ---------- 槽位下拉选择器（v0.5.3 实参类型化） ---------- */
function mbBuffChoices() {
  const list = S.keywords?.buffs || [];
  const out = [];
  for (const b of list) {
    const ids = Array.isArray(b.ids) ? b.ids : [b.id || b.n];
    const zh = String(b.zh || b.native || b.name || '');
    for (const id of ids.slice(0, 3)) if (id) out.push({ id: String(id), zh });
  }
  return out;
}

function mbPickButton(chain, kind, val, label, sub) {
  return '<button class="mb-pick" data-act="mb-pick" data-chain="' + esc(chain) + '" data-kind="' + esc(kind) + '" data-val="' + esc(val) + '">'
    + '<b>' + esc(label) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
}

function openSlotPicker(chain, type) {
  const st = type || 'any';
  const zh = MB_TYPE_ZH[st] || MB_TYPE_ZH.any;
  let body = '<div class="mb-pick-wrap">';
  if (st === 'target' || st === 'any') {
    const groups = [['single', '单目标'], ['multi', '多目标']];
    body += '<div class="field"><span>目标选择器</span>';
    for (const [g, label] of groups) {
      body += '<div class="mb-group">' + label + '</div><div class="mb-picks">'
        + MB_TARGETS.filter((t) => t.g === g).map((t) => mbPickButton(chain, 'target', t.n, t.zh, t.n)).join('')
        + '</div>';
    }
    body += '<div class="mb-group">自定义</div><div class="mb-picks">'
      + '<button class="btn ghost sm" data-act="mb-custom-target" data-chain="' + esc(chain) + '">自定义目标…</button>'
      + '</div></div>';
  }
  if (st === 'num' || st === 'any') {
    body += '<div class="field"><span>数值 / VALUE 寄存器</span><div class="mb-picks">'
      + mbPickButton(chain, 'n', '0', '数值 0', '之后可点 ✎ 改')
      + MB_VARS.map((v) => mbPickButton(chain, 'var', v, v, '寄存器')).join('')
      + '</div><div class="row-inline"><input id="mb-pick-num" class="num" type="number" placeholder="整数"><button class="btn primary sm" data-act="mb-pick-num" data-chain="' + esc(chain) + '">填入整数</button></div></div>';
  }
  if (st === 'var') {
    body += '<div class="field"><span>VALUE 寄存器</span><div class="mb-picks">' + MB_VARS.map((v) => mbPickButton(chain, 'var', v, v, '寄存器')).join('') + '</div></div>';
  }
  if (st === 'buff') {
    const list = mbBuffChoices();
    const opts = list.slice(0, 3000).map((b) => '<option value="' + esc(b.id) + '">' + esc((b.zh ? b.zh + ' · ' : '') + b.id) + '</option>').join('');
    body += '<div class="field"><span>Buff 关键词（英文 id）</span><div class="row-inline"><select id="mb-pick-buff">' + opts + '</select>'
      + '<button class="btn primary sm" data-act="mb-pick-buff" data-chain="' + esc(chain) + '">填入</button></div></div>';
  }
  if (st === 'op') {
    body += '<div class="field"><span>运算符</span><div class="mb-picks">' + ['ADD', 'SUB', 'MUL'].map((o) => mbPickButton(chain, 's', o, o, '')).join('') + '</div></div>';
  }
  if (st === 'text' || st === 'any') {
    body += '<div class="field"><span>文本</span><div class="row-inline"><input id="mb-pick-text" placeholder="输入文本"><button class="btn primary sm" data-act="mb-pick-text" data-chain="' + esc(chain) + '">填入文本</button></div></div>';
  }
  body += '<div class="hint muted">这个位置只接受「' + esc(zh) + '」类型的块；也可以从左侧调色板直接拖入。</div></div>';
  modal({ title: '填入「' + esc(zh) + '」', body, footer: '<button class="btn ghost" data-act="close-modal">取消</button>' });
}

function mbPickApply(chain, node) {
  if (!mbSetSlot(chain, node)) return;
  closeModal();
  render();
}

Object.assign(actions, {
  'mb-pick': (el) => {
    const kind = el.dataset.kind;
    const val = el.dataset.val;
    const node = kind === 'target' ? { t: 'target', n: val, c: null }
      : kind === 'var' ? { t: 'var', n: val }
        : kind === 'n' ? { t: 'n', v: Number(val) || 0 }
          : { t: 's', v: val };
    mbPickApply(el.dataset.chain, node);
  },
  'mb-pick-math': (el) => {
    mbPickApply(el.dataset.chain, { t: 'math', first: null, tail: [{ op: '+', val: null }] });
  },
  'mb-pick-num': (el) => {
    const raw = (document.getElementById('mb-pick-num')?.value || '').trim();
    if (!/^-?\d+$/.test(raw)) { toast('请输入整数', 'warn'); return; }
    mbPickApply(el.dataset.chain, { t: 'n', v: Number(raw) });
  },
  'mb-pick-buff': (el) => {
    const v = document.getElementById('mb-pick-buff')?.value || '';
    if (!v) { toast('请选择 Buff 关键词', 'warn'); return; }
    mbPickApply(el.dataset.chain, { t: 's', v });
  },
  'mb-pick-text': (el) => {
    const v = document.getElementById('mb-pick-text')?.value || '';
    mbPickApply(el.dataset.chain, { t: 's', v });
  },
});
function mbTargetModalBody(cur) {
  const curN = String(cur.n || '');
  const bases = MB_TARGETS.filter((t) => t.g !== 'tag');
  const noDollar = curN.split('$')[0];
  const head = noDollar.split('+')[0];
  const idHit = /^id(\d+)$/.exec(head);
  const instHit = /^inst(\d+)$/.exec(head);
  const baseHit = (idHit || instHit) ? null : (bases.find((t) => head.startsWith(t.n)) || null);
  const base = baseHit ? baseHit.n : '';
  const rest = baseHit ? head.slice(baseHit.n.length) : '';
  const tail = noDollar.split('+').slice(1).join('+');
  const tagPool = MB_TARGET_TAGS.map((t) => t.n);
  const tags = tagPool.filter((n) => rest.includes(n) || tail.split('+').includes(n));
  const dollar = curN.includes('$') ? curN.slice(curN.indexOf('$') + 1) : '';
  const expr = (baseHit || idHit || instHit) ? (tail && !tags.length ? tail : '') : noDollar;
  const baseOpts = ['single', 'multi'].map((g) => {
    const label = g === 'single' ? '单目标' : '多目标';
    const rows = MB_TARGETS.filter((t) => t.g === g);
    return '<optgroup label="' + label + '">' + rows.map((t) => '<option value="' + esc(t.n) + '"' + (t.n === base ? ' selected' : '') + '>' + esc(t.zh + ' · ' + t.n) + '</option>').join('') + '</optgroup>';
  }).join('');
  const tagHtml = MB_TARGET_TAGS.map((t) => '<label class="chk"><input type="checkbox" class="mb-tag" value="' + esc(t.n) + '"' + (tags.includes(t.n) ? ' checked' : '') + '><span>' + esc(t.zh) + '</span></label>').join('');
  const count = cur.c === null || cur.c === undefined || cur.c === '' ? '' : String(cur.c);
  const seenBuff = new Set();
  const buffNames = [];
  for (const b of (S.keywords?.buffs || [])) {
    const zh = String(b.zh || b.native || b.name || '');
    for (const id of (Array.isArray(b.ids) ? b.ids : [b.id])) { if (!id || seenBuff.has(id)) continue; seenBuff.add(id); buffNames.push({ id: String(id), zh }); }
  }
  const buffOpts = buffNames.slice(0, 5000).map((b) => '<option value="' + esc(b.id) + '" label="' + esc((b.zh ? b.zh + ' · ' : '') + b.id) + '">' + esc((b.zh ? b.zh + ' · ' : '') + b.id) + '</option>').join('');
  return '<div class="mb-t-form">'
    + '<label class="field"><span>基础选择器</span><select id="mb-t-base"><option value="">（自定义表达式）</option>' + baseOpts + '</select></label>'
    + '<div class="grid-2"><label class="field"><span>单位 ID（id####，留空不用）</span><input id="mb-t-id" value="' + esc(idHit ? idHit[1] : '') + '" placeholder="例如 10101"></label>'
    + '<label class="field"><span>实例 ID（inst####，留空不用）</span><input id="mb-t-inst" value="' + esc(instHit ? instHit[1] : '') + '" placeholder="例如 123"></label></div>'
    + '<label class="field"><span>数量（留空 = 1；多目标可填 1–999 或 VALUE_0）</span><input id="mb-t-count" value="' + esc(count) + '" placeholder="例如 3 或 VALUE_0"></label>'
    + '<div class="field"><span>修饰标签（可多选）</span><div class="mb-t-tags">' + tagHtml + '</div></div>'
    + '<label class="field"><span>$ 关键词检查（可选，只保留带该 Buff 的单位）</span><input id="mb-t-buff" list="mb-t-bufflist" value="' + esc(dollar) + '" placeholder="例如 Combustion"></label>'
    + '<datalist id="mb-t-bufflist">' + buffOpts + '</datalist>'
    + '<label class="field"><span>自定义表达式（填了就忽略上面的基础选择器，例如 EveryAlly+ExceptSelf）</span><input id="mb-t-expr" value="' + esc(expr) + '" placeholder="EveryAlly+ExceptSelf"></label>'
    + '<div class="hint muted">数量直接拼在目标名末尾（EveryAlly3）；标签直接连写；+ 用于并集，$关键词 放在最后。</div>'
    + '</div>';
}

function mbReadTargetModal() {
  const base = document.getElementById('mb-t-base')?.value || '';
  const expr = (document.getElementById('mb-t-expr')?.value || '').trim();
  const countRaw = (document.getElementById('mb-t-count')?.value || '').trim();
  const idRaw = (document.getElementById('mb-t-id')?.value || '').trim();
  const instRaw = (document.getElementById('mb-t-inst')?.value || '').trim();
  const dollar = (document.getElementById('mb-t-buff')?.value || '').trim();
  const tags = [...document.querySelectorAll('.mb-tag:checked')].map((el) => el.value);
  let n = expr;
  if (!n) {
    if (/^\d+$/.test(idRaw)) n = 'id' + idRaw;
    else if (/^\d+$/.test(instRaw)) n = 'inst' + instRaw;
    else n = base + tags.join('');
  }
  if (dollar && n.indexOf('$') < 0) n += '$' + dollar.replace(/^\$/, '');
  return { t: 'target', n, c: countRaw === '' ? null : countRaw };
}
function openMbEdit(chain) {
  const ref = mbAccess(chain);
  if (!ref) return;
  const cur = ref.get() || {};
  const isTarget = cur.t === 'target';
  if (isTarget) {
    modal({
      title: '编辑目标选择器',
      body: mbTargetModalBody(cur),
      footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="mb-edit-ok" data-chain="' + esc(chain) + '">确定</button>',
    });
    return;
  }
  const value = cur.v ?? '';
  modal({
    title: '修改数值',
    body: '<label class="field"><span>值</span><input id="mb-edit-input" value="' + esc(String(value)) + '"></label>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="mb-edit-ok" data-chain="' + esc(chain) + '">确定</button>',
  });
  setTimeout(() => { const i = document.getElementById('mb-edit-input'); if (i) { i.focus(); i.select(); } }, 30);
}

async function mbSaveProps() {
  const m = S.mbDoc;
  if (!m || m.test) return;
  const val = (sel) => document.querySelector(sel)?.value;
  const res = await api('/api/module/save', {
    method: 'POST',
    body: { id: m.id, name: val('#mb-name'), prefix: val('#mb-prefix'), kind: val('#mb-kind'), desc: val('#mb-desc') },
  });
  S.mbDoc = res.module;
  S.modules = (await api('/api/modules')).modules;
  render();
}

Object.assign(actions, {
  'close-module': () => { mbLeaveGuard(() => { S.moduleEditing = null; S.mb = null; S.mbDoc = null; render(); }); },
  'mb-leave-discard': () => { S.mb.saved = JSON.stringify(S.mb.program); const t = S.mb.leave; closeModal(); if (t) t(); },
  'mb-leave-missing-ok': () => { const t = S.mb && S.mb.leave; closeModal(); mbGuardDirty(t); },
  'mb-leave-save': async () => {
    const t = S.mb && S.mb.leave;
    let ok = false; try { ok = await actions['mb-save'](); } catch (err) { toast('保存失败：' + (err && err.message ? err.message : err), 'err'); return; }
    if (ok === false) return;
    closeModal(); if (t) t();
  },
  'mb-cat': (el) => { S.mb.cat = el.dataset.cat; render(); },
  'mb-props': async (el) => { await openModuleProps(el && el.dataset ? el.dataset.id : ''); },
  'mb-props-save': async (el) => {
    const id = el.dataset.id;
    const res = await api('/api/module/save', { method: 'POST', body: {
      id, name: $('#mp-name').value, scope: $('#mp-scope').value, desc: $('#mp-desc').value,
    } });
    S.modules = (await api('/api/modules')).modules;
    if (S.mbDoc && S.mbDoc.id === id) { S.mbDoc = res.module; S.mb = { ...S.mb, doc: res.module }; }
    closeModal();
    toast('模块信息已保存', 'ok');
    render();
  },
  'mb-props-delete': async (el) => {
    const id = el.dataset.id;
    const isTest = el.dataset.test === '1';
    if (!confirm(isTest ? '删除这个测试模块？（删除后不会再自动生成）' : '删除这个模块？此操作不能撤销。')) return;
    await api('/api/module/delete', { method: 'POST', body: { id, allowTest: isTest } });
    S.modules = (await api('/api/modules')).modules;
    closeModal();
    if (S.moduleEditing === id) { S.moduleEditing = null; S.mb = null; S.mbDoc = null; }
    toast('模块已删除', 'warn');
    render();
  },
  'mb-code': () => { S.mb.codePage = true; render(); },
  'mb-code-back': () => { S.mb.codePage = false; render(); },
  'mb-code-save': async () => {
    const boxes = Array.from(document.querySelectorAll('.code-text'));
    const manual = {};
    for (const box of boxes) {
      const key = box.dataset.key;
      if (!key || box.readOnly) continue;
      manual[key] = box.value;
    }
    S.mb.program = { ...S.mb.program, manual };
    S.mb.codePage = false;
    await actions['mb-save']();
  },
  'mb-code-lock': (el) => {
    const key = String(el.dataset.key || '');
    if (!/^\d+$/.test(key)) return;
    const row = mbCompileRows().find((r) => String(r.key) === key);
    if (!row) return;
    if (!S.mb.manualWarned) {
      modal({
        title: '手动修改这一行代码',
        body: '<p><strong>你正在手动修改「' + esc(row.text.slice(0, 40)) + '…」这一行的输出代码。</strong></p>'
          + '<div class="person-list"><div class="check-row"><span>· 手动修改后，这一行对应的时点积木会被<b>锁定</b>，在积木页只能整块移动或删除，不能再改里面的参数。</span></div>'
          + '<div class="check-row"><span>· 编辑器不会再用积木内容覆盖这一行；改错了只能自己改回来（没有一键还原）。</span></div>'
          + '<div class="check-row"><span>· 建议只有在积木表达不了时才手改。</span></div></div>'
          + '<label class="field check"><input type="checkbox" id="mb-manual-skip"> 本次打开编辑器内不再提示</label>',
        footer: '<button class="btn ghost" data-act="close-modal">返回</button><button class="btn warn" data-act="mb-code-lock-ok" data-key="' + esc(key) + '">我明白，手动修改</button>',
      });
      return;
    }
    mbLockRow(key);
  },
  'mb-code-lock-ok': (el) => {
    const skip = document.getElementById('mb-manual-skip');
    if (skip && skip.checked) S.mb.manualWarned = true;
    const key = String(el.dataset.key || '');
    closeModal();
    mbLockRow(key);
  },
  'mb-script': () => { S.mb.showScript = !S.mb.showScript; render(); },
  'mb-toggle-panic': () => { S.mb.showPanic = !S.mb.showPanic; render(); },
  'mb-clear': () => {
    if (!confirm('清空这个模块里的全部积木？（清空后可以用撤销还原）')) return;
    mbSnapshot();
    S.mb.program = { version: 1, blocks: [] };
    render();
  },
  'mb-save': async () => {
    const info = mbMissingInfo();
    let res = null;
    const body = { id: S.moduleEditing, program: S.mb.program, expectUpdatedAt: S.mb.savedAt || '', force: !!S.mb.forceSave };
    try { res = await api('/api/module/program', { method: 'POST', body }); }
    catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (!S.mb.forceSave && /已被修改/.test(msg) && window.confirm('模块文件在磁盘上已被修改（可能是另一个窗口，或有人直接改了文件）。要用当前内容覆盖吗？')) {
        S.mb.forceSave = true;
        return actions['mb-save']();
      }
      throw err;
    }
    if (!res || res.ok === false) { toast((res && res.error) || '保存失败', 'err'); return false; }
    S.mb.saved = JSON.stringify(S.mb.program);
    S.mb.savedAt = (res.module && res.module.updatedAt) || '';
    S.mb.hist = [];
    S.mb.redo = [];
    S.mb.forceSave = false;
    S.mb.dirty = false;
    S.mb.showMissing = info.list.length > 0;
    S.mb.missingIds = info.ids;
    S.mbDoc = res.module;
    S.modules = (await api('/api/modules')).modules;
    render();
    if (info.list.length) {
      toast('已保存；有 ' + info.list.length + ' 处必填参数未填，游戏里很可能无法正确执行（控件右上角有红点）', 'warn');
      mbFlashMissing();
    } else {
      toast('模块已保存');
    }
    return true;
  },
  'mb-del': (el) => { mbRemove(el.dataset.mbDel); render(); },
  'mb-clear-slot': (el) => { mbClearSlot(el.dataset.mbClear); render(); },
  'mb-edit': (el) => {
    const chain = el.dataset.mbEdit;
    const ref = mbAccess(chain);
    const cur = ref && ref.get();
    if (!cur || cur.t !== 'n') return;
    openMbEdit(chain);
  },
  'mb-custom-target': (el) => {
    const mode = el.dataset.mbMode;
    const chain = el.dataset.chain || '';
    const blank = { t: 'target', n: '', c: null };
    modal({
      title: mode === 'loop' ? '自定义循环目标' : '自定义目标选择器',
      body: mbTargetModalBody(blank),
      footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="mb-custom-target-ok" data-mode="' + esc(mode || 'target') + '" data-chain="' + esc(chain) + '">确定</button>',
    });
  },
  'mb-custom-target-ok': (el) => {
    const picked = mbReadTargetModal();
    if (!picked.n) { toast('目标不能为空', 'warn'); return; }
    if (el.dataset.chain) { if (mbSetSlot(el.dataset.chain, picked)) { closeModal(); render(); } return; }
    if (el.dataset.mode === 'loop') S.mb.carry = { type: 'stmt', node: { k: 'loop', v: picked.n + (picked.c === null ? '' : String(picked.c)) } };
    else S.mb.carry = { type: 'value', node: picked };
    closeModal();
    render();
  },
  'mb-edit-ok': (el) => {
    const chain = el.dataset.chain;
    const ref = mbAccess(chain);
    if (ref) {
      const cur = ref.get() || {};
      if (cur.t === 'target') ref.set(mbReadTargetModal());
      else {
        const raw = document.getElementById('mb-edit-input')?.value ?? '';
        if (cur.t === 'n') ref.set({ ...cur, v: Math.trunc(Number(raw) || 0) });
        else ref.set({ ...cur, v: raw });
      }
    }
    closeModal();
    render();
  },
});

mbBindDrag();
mbBindEmptySlot();
const mbClickBind = true;
document.addEventListener('click', (e) => {
  if (!S.mb || !S.mbDoc) return;
  if (S.mb.suppressClick && Date.now() - S.mb.suppressClick < 350) return;
  const vbox = e.target.closest('.vb');
  if (vbox && !e.target.closest('[data-mb-del],[data-mb-edit],[data-mb-mathadd],[data-mb-mathdel],select,input')) {
    const vchain = vbox.dataset.chain || '';
    const vref = vchain ? mbAccess(vchain) : null;
    const vcur = vref && vref.get();
    if (vcur && (vcur.t === 'n' || vcur.t === 's')) {
      e.preventDefault();
      mbInlineEdit(vbox, vchain, vcur.t === 'n' ? 'num' : 'text', vcur.v);
      return;
    }
  }
  const del = e.target.closest('[data-mb-del]');
  if (del) { e.preventDefault(); mbRemove(del.dataset.mbDel); render(); return; }
  const mAdd = e.target.closest('[data-mb-mathadd]');
  if (mAdd) {
    const ref = mbAccess(mAdd.dataset.mbMathadd);
    const node = ref && ref.get();
    if (node && node.t === 'math') { node.tail = node.tail || []; if (node.tail.length < 8) node.tail.push({ op: '+', val: null }); render(); }
    return;
  }
  const mDel = e.target.closest('[data-mb-mathdel]');
  if (mDel) {
    const ref = mbAccess(mDel.dataset.mbMathdel);
    const node = ref && ref.get();
    if (node && node.t === 'math' && node.tail && node.tail.length) { node.tail.pop(); render(); }
    return;
  }
  const clr = e.target.closest('[data-mb-clear]');
  if (clr) { e.preventDefault(); mbClearSlot(clr.dataset.mbClear); render(); return; }
  const ed = e.target.closest('[data-mb-edit]');
  if (ed) { e.preventDefault(); openMbEdit(ed.dataset.mbEdit); return; }
  if (!S.mb.carry && !e.target.closest('button,select,input,.slot,.vb,.bk-body')) {
    const bk = e.target.closest('[data-mb-bk]');
    if (bk) { S.mb.sel = bk.dataset.mbBk; render(); return; }
  }
  if (e.target.closest('[data-mb-drag]')) { mbPaletteClick(e); return; }
  if (S.mb.carry) { mbCanvasClick(e); return; }
  const slotEl = e.target.closest('[data-mb-slot]');
  if (slotEl && slotEl.classList.contains('slot')) {
    const st = slotEl.dataset.slotType || 'any';
    if (st === 'num' || st === 'text') { mbInlineEdit(slotEl, slotEl.dataset.mbSlot, st, null); return; }
    toast('从左侧把「' + (MB_TYPE_ZH[st] || '对应类型') + '」积木拖进这个空位');
    return;
  }
}, true);

document.addEventListener('keydown', (e) => {
  const inField = e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable="true"]');
  if (S.mb && !inField && (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'z') {
    e.preventDefault(); if (e.shiftKey) mbRedo(); else mbUndo(); return;
  }
  if (S.mb && !inField && (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'y') {
    e.preventDefault(); mbRedo(); return;
  }
  if (e.key === 'Backspace' && S.mb && S.mb.sel && !inField) {
    e.preventDefault(); mbBackspace(); return;
  }
  if (e.key !== 'Escape') return;
  if (!S.mb) return;
  let changed = false;
  if (S.mb.carry) { S.mb.carry = null; changed = true; }
  if (S.mb.drag) { S.mb.drag = null; changed = true; }
  if (changed) { render(); toast('\u5df2\u53d6\u6d88', 'warn'); }
});

document.addEventListener('change', (e) => {
  if (!S.mb || !S.mbDoc) return;
    const argSel = e.target.closest('[data-mb-arg]');
    if (argSel) {
      const ref = mbAccess(argSel.dataset.mbArg);
      if (ref) {
        const val = argSel.value;
        ref.set(val === '' ? null : { t: 's', v: val });
        refreshMbScript();
      }
      return;
    }
  const op = e.target.closest('[data-mb-op]');
  if (op) { const n = mbStmt(op.dataset.mbOp); if (n) n.op = op.value; render(); return; }
  const faceEl = e.target.closest('[data-mb-face]');
  if (faceEl) { const n = mbStmt(faceEl.dataset.mbFace); if (n) n.face = faceEl.value; render(); return; }
  const critEl = e.target.closest('[data-mb-crit]');
  if (critEl) { const n = mbStmt(critEl.dataset.mbCrit); if (n) n.crit = critEl.value; render(); return; }
  const kwEl = e.target.closest('[data-mb-kw]');
  if (kwEl) { const n = mbStmt(kwEl.dataset.mbKw); if (n) n.kw = kwEl.value.trim(); refreshMbScript(); return; }
  const varEl = e.target.closest('[data-mb-var]');
  if (varEl) { const n = mbStmt(varEl.dataset.mbVar); if (n) n.var = varEl.value; render(); return; }
  const mathOp = e.target.closest('[data-mb-mathop]');
  if (mathOp) {
    const ref = mbAccess(mathOp.dataset.mbMathop);
    const node = ref && ref.get();
    if (node && node.tail && node.tail[Number(mathOp.dataset.mbIdx)]) {
      node.tail[Number(mathOp.dataset.mbIdx)].op = mathOp.value;
      refreshMbScript(); return;
    }
  }
  const keyEl = e.target.closest('[data-mb-key]');
  if (keyEl) { const n = mbStmt(keyEl.dataset.mbKey); if (n) n.key = keyEl.value.trim(); refreshMbScript(); return; }
});

function refreshMbScript() {
  const el = document.getElementById('mb-script');
  if (el) el.textContent = mbCompileScript();
}

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
  const applied = await api('/api/passive/apply', { method: 'POST', body: { name: S.selected, id: S.passiveId } });
  toast('已保存并写入游戏文件（' + (applied.applied || 0) + ' 条被动脚本）', 'ok');
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
  const applied = await api('/api/buff/apply', { method: 'POST', body: { name: S.selected, id: S.buffId } });
  toast('已保存并写入游戏文件（' + (applied.applied || 0) + ' 条 Buff 脚本）', 'ok');
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

async function openNewModule() {
  await ensureScopes();
  const order = ['passive', 'skill', 'buff', 'common'];
  const scopes = ((S.scopeTables && S.scopeTables.list) || [{ id: 'common', zh: '通用', desc: '' }]).slice()
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const scopePick = scopes.map((x) => '<label class="scope-opt"><input type="radio" name="nm-scope" value="' + esc(x.id) + '"' + (x.id === 'common' ? ' checked' : '') + '><b>' + esc(x.zh) + '</b><span>' + esc(x.desc || '') + '</span></label>').join('');
  modal({
    title: '新建模块',
    body: '<div class="form">'
      + '<div class="field"><span>为谁创建（决定可用的时点 / 函数）</span><div class="scope-pick">' + scopePick + '</div></div>'
      + '<label class="field"><span>名称</span><input id="nm-name" placeholder="例如：施加烧伤" autocomplete="off"></label>'
      + '<label class="field"><span>描述（可执行词条）</span><textarea id="nm-desc" class="desc-input" rows="4" placeholder="例如：[使用时]对目标施加2层[烧伤]"></textarea></label>'
      + '<div class="hint muted">模块目前只存在于编辑器内，不落到游戏脚本。</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn primary" data-act="submit-create-module">创建</button>',
  });
}

async function submitCreateModule() {
  const name = document.getElementById('nm-name')?.value?.trim() || '';
  const desc = document.getElementById('nm-desc')?.value || '';
  const scope = document.querySelector('input[name="nm-scope"]:checked')?.value || 'common';
  if (!name) { toast('请填模块名称', 'warn'); return; }
  try {
    const res = await api('/api/module/create', { method: 'POST', body: { name, desc, scope } });
    closeModal();
    S.modulesLoaded = false;
    await loadModules(true);
    toast('模块已创建', 'ok');
    await openModuleEditor(res.module.id);
  } catch (e) { toast(e.message, 'error'); }
}

async function saveModule() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m || m.test) return;
  const name = document.getElementById('mod-name')?.value?.trim() || '';
  const desc = document.getElementById('mod-desc')?.value || '';
  const prefix = document.getElementById('mod-prefix')?.value || '';
  const scope = document.getElementById('mod-scope')?.value || (m.scope || 'common');
  try {
    await api('/api/module/save', { method: 'POST', body: { id: m.id, name, desc, prefix, scope } });
    await loadModules(true);
    toast('模块已保存', 'ok');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteModule() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m) return;
  const isTest = !!m.test;
  modal({
    title: isTest ? '删除测试模块' : '删除模块',
    body: '<p>确定删除' + (isTest ? '测试模块' : '模块') + '「' + esc(m.name || m.id) + '」？</p><div class="hint muted">' + (isTest ? '删除后会写入「不再自动生成测试模块」标记，之后启动不会再冒出来。' : '已引用它的技能 / 被动 / Buff 会显示成一个空引用。') + '</div>',
    footer: '<button class="btn ghost" data-act="close-modal">取消</button><button class="btn danger" data-act="confirm-delete-module" data-id="' + esc(m.id) + '" data-test="' + (isTest ? '1' : '0') + '">删除</button>',
  });
}

async function confirmDeleteModule(el) {
  await api('/api/module/delete', { method: 'POST', body: { id: el.dataset.id, allowTest: el.dataset.test === '1' } });
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
  'open-module': async (el) => { await openModuleEditor(el.dataset.id); },
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

Object.assign(actions, {
  'desc-kw-insert': () => {
    const pick = document.getElementById('desc-kw');
    const ta = document.getElementById('skill-desc');
    const word = pick ? String(pick.value || '').trim() : '';
    if (!word) { toast('先选一个关键词（时点或 Buff 的中文名）', 'warn'); return; }
    if (!ta) return;
    const token = '[' + word.replace(/[\[\]\r\n]/g, '') + ']';
    const start = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
    const end = ta.selectionEnd == null ? start : ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + token + ta.value.slice(end);
    ta.focus();
    const pos = start + token.length;
    try { ta.setSelectionRange(pos, pos); } catch {}
    if (pick) pick.value = '';
    scheduleDesc();
  },
  'mb-undo': () => mbUndo(),
  'mb-redo': () => mbRedo(),
  'mb-loop-slot': (el) => {
    const chain = el.dataset.chain || '';
    const ref = mbAccess(chain);
    const cur = ref && ref.get();
    if (cur && (cur.t === 'target' || cur.v)) {
      mbSnapshot();
      ref.set(null);
      render();
      toast('已清空遍历目标；需要时从左侧「目标」分类把「遍历（自定义目标）」拖回来');
      return;
    }
    toast('从左侧「目标」分类把「遍历（自定义目标）」拖到这个槽里');
  },
  'mb-cond-add': (el) => {
    const st = mbStmt(el.dataset.chain);
    if (!st) return;
    mbSnapshot();
    st.conds = Array.isArray(st.conds) && st.conds.length ? st.conds : [{ left: null, op: '>', right: null }];
    if (st.conds.length >= 8) { toast('最多 8 个条件', 'warn'); return; }
    st.conds.push({ left: null, op: '>', right: null });
    render();
  },
  'mb-cond-del': (el) => {
    const raw = String(el.dataset.chain || '');
    const k = raw.lastIndexOf(':');
    const st = mbStmt(raw.slice(0, k));
    const idx = Number(raw.slice(k + 1));
    if (!st || !Array.isArray(st.conds) || st.conds.length <= 1) return;
    mbSnapshot();
    st.conds.splice(idx, 1);
    render();
  },
});

document.addEventListener('change', (e) => {
  const el = e.target && e.target.closest ? e.target.closest('[data-mb-logic]') : null;
  if (!el || !S.mb) return;
  const st = mbStmt(el.dataset.mbLogic);
  if (!st) return;
  mbSnapshot();
  st.logic = ['none', 'and', 'or', 'xor'].includes(el.value) ? el.value : 'none';
  if (!Array.isArray(st.conds) || !st.conds.length) st.conds = [{ left: null, op: '>', right: null }];
  render();
});
