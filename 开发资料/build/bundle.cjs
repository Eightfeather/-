var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// build/assets.gen.mjs
var ASSETS = { "web/app.js": `/* The Lethe Workbench \xB7 \u524D\u7AEF\u4E3B\u7A0B\u5E8F v0.2 */
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
  selected: null,          // \u5F53\u524D\u9009\u4E2D\u7684 Mod\uFF08\u7BA1\u7406\u9875 / \u7F16\u8F91\u9875\u540C\u6B65\uFF09
  modDetail: null,
  detailTab: 'current',    // 'current' | \u5907\u4EFD label
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
  // ---- v0.3 \u6280\u80FD\u7F16\u8F91 ----
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
window.__WBS = S; // \u8C03\u8BD5\u7528\uFF1ACDP \u91CC\u53EF\u76F4\u63A5\u68C0\u67E5\u524D\u7AEF\u72B6\u6001

const $ = (sel, root = document) => root.querySelector(sel);const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtBytes = (n) => {
  const v = Number(n) || 0;
  if (v >= 1024 ** 3) return \`\${(v / 1024 ** 3).toFixed(2)} GB\`;
  if (v >= 1024 ** 2) return \`\${(v / 1024 ** 2).toFixed(1)} MB\`;
  if (v >= 1024) return \`\${(v / 1024).toFixed(1)} KB\`;
  return \`\${v} B\`;
};
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* ---------------------------------- \u57FA\u7840 ---------------------------------- */

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
  try { data = await res.json(); } catch { data = { ok: false, error: '\u670D\u52A1\u5668\u8FD4\u56DE\u7684\u4E0D\u662F JSON' }; }
  if (!res.ok) {
    const err = new Error(data.error || \`\u8BF7\u6C42\u5931\u8D25\uFF08\${res.status}\uFF09\`);
    err.status = res.status;
    throw err;
  }
  // \u4E1A\u52A1\u4E0A ok:false \u4F46\u6CA1\u6709 error\uFF08\u4F8B\u5982\u201C\u6CA1\u627E\u5230\u79C1\u670D\u201D\uFF09\u4EA4\u7ED9\u8C03\u7528\u65B9\u5224\u65AD\uFF0C\u4E0D\u7B97\u5F02\u5E38
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
  el.className = \`toast \${kind}\`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('gone'); setTimeout(() => el.remove(), 300); }, ms);
}

function wip() { toast('\u8BE5\u529F\u80FD\u6B63\u5728\u7EF4\u4FEE', 'warn'); }

let MODAL = null;
function modal({ title, body, footer, wide = false }) {
  closeModal();
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-back';
  wrap.innerHTML = \`
    <div class="modal \${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><strong>\${esc(title)}</strong><button class="modal-x" data-act="close-modal">\xD7</button></div>
      <div class="modal-body">\${body}</div>
      \${footer ? \`<div class="modal-foot">\${footer}</div>\` : ''}
    </div>\`;
  root.appendChild(wrap);
  MODAL = wrap;
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) closeModal(); });
  return wrap;
}
function closeModal() {
  if (MODAL) { MODAL.remove(); MODAL = null; }
}

/* -------------------------------- \u6570\u636E\u52A0\u8F7D -------------------------------- */

async function loadStatus() {
  S.status = await api('/api/status');
  $('#st-version').textContent = \`v\${S.status.version}\`;
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
  S.modDetail = await api(\`/api/mod?name=\${encodeURIComponent(name)}\`);
}

async function loadPersonalities(name = S.selected) {
  const res = await api(\`/api/personalities?name=\${encodeURIComponent(name || '')}\`);
  S.vanilla = res;
  return res;
}

async function loadVanilla(characterId) {
  const res = await api(\`/api/vanilla\${characterId ? \`?characterId=\${characterId}\` : ''}\`);
  S.vanilla = { ...(S.vanilla || {}), ...res };
  return res;
}

async function loadPersonality(name, id) {
  const res = await api(\`/api/personality?name=\${encodeURIComponent(name)}&id=\${encodeURIComponent(id)}\`);
  S.personality = res.personality;
  S.personalityId = id;
  S.sessionKey = \`personality:\${id}\`;
  await refreshSession(name);
  return S.personality;
}

async function refreshSession(name = S.selected) {
  if (!name) { S.session = null; return; }
  try {
    const q = \`name=\${encodeURIComponent(name)}\${S.sessionKey ? \`&key=\${encodeURIComponent(S.sessionKey)}\` : ''}\`;
    const res = await api(\`/api/session?\${q}\`);
    S.session = res.session;
    S.autoAt = res.autoSave?.at || S.autoAt;
  } catch { /* \u672A\u5B9A\u4F4D\u65F6\u4E0D\u62A5\u9519 */ }
}

/* --------------------------------- \u6E32\u67D3\u9AA8\u67B6 -------------------------------- */

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

// \u8BB0\u5F55 #view \u5185\u53EF\u6EDA\u52A8\u5BB9\u5668\u7684 scrollTop\uFF08\u5E26 CSS \u8DEF\u5F84\uFF09\uFF0C\u91CD\u7ED8\u540E\u6309\u8DEF\u5F84\u8FD8\u539F\uFF1B\u8BE6\u60C5\u9762\u677F\u4E0D\u8FD8\u539F\uFF0C\u5207\u6362\u5BF9\u8C61\u65F6\u5E94\u56DE\u5230\u9876\u90E8
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
    try { const el = document.querySelector(it.sel); if (el) el.scrollTop = it.top; } catch (e) { /* \u7ED3\u6784\u53D8\u5316\u5219\u5FFD\u7565 */ }
  }
}

function render() {
  const view = $('#view');
  if (!view) return;
  if (!S.status) {
    view.innerHTML = \`<div class="boot-screen"><div class="boot-mark">L</div><p>\u6B63\u5728\u8F7D\u5165\u5DE5\u4F5C\u53F0\u2026</p></div>\`;
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
  if (h > 0) document.documentElement.style.setProperty('--dock-h', \`\${h + 12}px\`);
}

function updateDock() {
  $$('.dock-item').forEach((el) => el.classList.toggle('active', el.dataset.view === S.view));
  const root = S.status?.letheRoot || '';
  $('#root-dot')?.classList.toggle('ok', Boolean(root));
  $('#st-root').textContent = root ? \`Lethe \xB7 \${root}\` : '\u5C1A\u672A\u5B9A\u4F4D\u79C1\u670D';
  $('#st-root').title = root || '';
  $('#st-mod').textContent = S.selected || '\u2014';
  const dirty = Boolean(S.session?.dirty);
  const d = $('#st-dirty');
  d.textContent = dirty ? \`\u6709\u672A\u4FDD\u5B58\u6539\u52A8\uFF08\u64A4\u9500 \${S.session?.undo || 0} \u6B65\uFF09\` : '\u5DF2\u4FDD\u5B58';
  d.className = dirty ? 'dirty' : 'calm';
  const auto = $('#st-auto');
  if (auto) {
    auto.textContent = S.autoAt ? \`\u81EA\u52A8\u5FEB\u7167 \${new Date(S.autoAt).toLocaleTimeString('zh-CN', { hour12: false })}\` : '\u81EA\u52A8\u5FEB\u7167 \u2014';
  }
  // \u540D\u7247\uFF08\u5E95\u680F\u4E3B\u884C\uFF0C5 \u683C / 10\xD73 \u7F51\u683C\uFF09
  const st = S.home?.stats || {};
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('#nc-name', S.home?.editorName || st.editorName || '\u4F46\u4E01');
  set('#nc-mod', st.modCount ?? '\u2014');
  set('#nc-dll', st.dllCount ?? '\u2014');
  set('#nc-editor', st.editorTitle || '\u8FB9\u72F1\u5DE5\u4F5C\u53F0 Limbus Workshop');
  set('#nc-size', fmtBytes(st.bytes));
  syncDockHeight();
}

/* ---------------------------------- \u4E3B\u9875 ---------------------------------- */

function renderSearching() {
  return \`<section class="home searching">
    <div class="scan-box">
      <div class="scan-ring"></div>
      <h2>\u6B63\u5728\u5BFB\u627E\u79C1\u670D</h2>
      <p>\u81EA\u52A8\u626B\u63CF\u5E38\u89C1\u4F4D\u7F6E\u4E0E\u78C1\u76D8\u76EE\u5F55\uFF0C\u67E5\u627E <code>BepInEx\\\\plugins\\\\Lethe</code></p>
      <p class="muted">\u5982\u679C\u627E\u4E0D\u5230\uFF0C\u53EF\u4EE5\u5728\u201C\u8BBE\u7F6E\u201D\u91CC\u624B\u52A8\u6307\u5B9A\u76EE\u5F55\u3002</p>
    </div>
  </section>\`;
}

function renderSetup() {
  return \`<section class="home searching">
    <div class="scan-box">
      <h2>\u8FD8\u6CA1\u6709\u6307\u5B9A\u79C1\u670D</h2>
      <p>\u8BF7\u9009\u62E9\u6E38\u620F\u7684\u5B89\u88C5\u76EE\u5F55\uFF08\u542B <code>LimbusCompany.exe</code>\uFF09\u6216 Lethe \u76EE\u5F55\uFF08\u542B <code>mods</code> / <code>dumpedData</code>\uFF09\u3002</p>
      <div class="row gap center">
        <button class="btn primary" data-act="open-settings">\u6253\u5F00\u8BBE\u7F6E</button>
        <button class="btn ghost" data-act="locate-deep">\u6DF1\u5EA6\u626B\u63CF\u78C1\u76D8</button>
      </div>
    </div>
  </section>\`;
}

function renderHome() {
  return \`<section class="home">
    <div class="home-cover">
      <div class="cover-inner">
        <div class="cover-kicker">LIMBUS COMPANY \xB7 MOD WORKBENCH</div>
        <h1>THE LETHE<br>WORKBENCH</h1>
        <div class="cover-line"></div>
        <p>\u8FB9\u72F1\u516C\u53F8 \xB7 \u66F4\u7B80\u5355\u7684\u6A21\u7EC4\u5DE5\u4F5C\u53F0</p>
        <div class="cover-placeholder">\u5C01\u9762\u5360\u4F4D \xB7 \u540E\u7EED\u63A5\u5165\u539F\u753B</div>
      </div>
    </div>

    <div class="home-side">
      <div class="round-actions">
        <button class="round-btn" data-act="open-settings" title="\u8BBE\u7F6E"><span>\u2699</span><small>\u8BBE\u7F6E</small></button>
        <button class="round-btn" data-act="wip-guide" title="\u6307\u5357"><span>?</span><small>\u6307\u5357</small></button>
        <button class="round-btn" data-act="wip-cover" title="\u5C01\u9762"><span>\u25A3</span><small>\u5C01\u9762</small></button>
        <button class="round-btn" data-act="wip-thanks" title="\u9E23\u8C22"><span>\u2665</span><small>\u9E23\u8C22</small></button>
      </div>
      <div class="panel notice">
        <div class="panel-head">\u516C\u544A\u680F <span class="tag">NOTICE</span></div>
        <div class="panel-body"><div class="placeholder">\u516C\u544A\u5360\u4F4D \xB7 \u540E\u7EED\u63A5\u5165\u66F4\u65B0\u8BF4\u660E</div></div>
      </div>
    </div>
  </section>\`;
}

/* -------------------------------- Mod \u7BA1\u7406 -------------------------------- */

const modRow = (m) => \`<button class="item \${S.selected === m.name ? 'active' : ''} \${m.enabled ? '' : 'disabled'}" data-act="select-mod" data-name="\${esc(m.name)}">
  <span class="state-dot \${m.enabled ? 'on' : 'off'}"></span>
  <span class="item-main"><strong>\${esc(m.name)}</strong><small>\${m.personalityCount ?? 0} \u4EBA\u683C \xB7 \${m.files ?? 0} \u6587\u4EF6 \xB7 \${fmtBytes(m.bytes)}</small></span>
  \${m.enabled ? '' : '<span class="x-badge">\u2715</span>'}
</button>\`;

const dllRow = (d) => \`<button class="item \${S.selectedDll === d.file ? 'active' : ''} \${d.enabled ? '' : 'disabled'}" data-act="select-dll" data-file="\${esc(d.file)}">
  <span class="state-dot \${d.enabled ? 'on' : 'off'}"></span>
  <span class="item-main"><strong>\${esc(d.base)}</strong><small>\${fmtBytes(d.size)} \xB7 \${d.backups?.length || 0} \u4E2A\u5907\u4EFD</small></span>
  \${d.enabled ? '' : '<span class="x-badge">\u2715</span>'}
</button>\`;

function renderMods() {
  const enabled = S.mods.filter((m) => m.enabled).length;
  const dllOn = S.dlls.filter((d) => d.enabled).length;
  return \`<div class="layout mods">
    <section class="panel">
      <div class="panel-head">\u5DF2\u52A0\u8F7D MOD <span class="count">\${enabled} / \${S.mods.length}</span></div>
      <div class="panel-body list">\${S.mods.map(modRow).join('') || '<div class="list-empty">mods \u76EE\u5F55\u662F\u7A7A\u7684</div>'}</div>
      <div class="panel-foot"><button class="btn ghost block" data-act="create-mod">\uFF0B \u521B\u5EFA Mod</button></div>
    </section>
    <section class="panel detail-pane">\${renderModDetail()}</section>
    <section class="panel">
      <div class="panel-head">\u5DF2\u52A0\u8F7D DLL <span class="count">\${dllOn} / \${S.dlls.length}</span></div>
      <div class="panel-body list">\${S.dlls.map(dllRow).join('') || '<div class="list-empty">plugins \u76EE\u5F55\u91CC\u6CA1\u6709 DLL</div>'}</div>
      <div class="panel-foot"><button class="btn ghost block" data-act="reveal-plugins">\u6253\u5F00\u63D2\u4EF6\u76EE\u5F55</button></div>
    </section>
  </div>\`;
}

function versionBar(items, active, act) {
  return \`<div class="version-bar">\${items.map((it) => \`<button class="vtab \${it.value === active ? 'active' : ''}" data-act="\${act}" data-label="\${esc(it.value)}">\${esc(it.label)}</button>\`).join('')}</div>\`;
}

function renderModDetail() {
  if (S.selectedDll && S.dllDetail) return renderDllDetail();
  const d = S.modDetail;
  if (!d) return \`<div class="empty-state"><div class="empty-mark">\u25C6</div><p>\u4ECE\u5DE6\u4FA7\u9009\u62E9\u4E00\u4E2A Mod \u67E5\u770B\u8BE6\u60C5</p><small class="muted">\u7981\u7528\u7684 Mod \u4E5F\u80FD\u7F16\u8F91\uFF0C\u6539\u52A8\u4ECD\u4F1A\u5199\u5165\u78C1\u76D8</small></div>\`;

  const tabs = [{ label: '\u5F53\u524D\u7248\u672C', value: 'current' }, ...(d.backups || []).map((b) => ({ label: b.label, value: b.label }))];
  const active = S.detailTab === 'current' ? 'current' : S.detailTab;
  const isBackup = active !== 'current';
  return \`<div class="detail-head">
    <div class="detail-title">\${esc(d.name)} <span class="badge \${d.enabled ? 'ok' : 'off'}">\${d.enabled ? '\u5DF2\u542F\u7528' : '\u5DF2\u7981\u7528'}</span></div>
    <div class="detail-sub">\${esc(d.dir)}</div>
    <div class="meta-row">
      <span>\u4EBA\u683C \${(d.personalities || []).length}</span>
      <span>\u8D34\u56FE \${(d.sprites || []).length}</span>
      <span>\u6570\u636E\u7C7B\u76EE \${(d.dataCategories || []).length}</span>
      <span>\u5907\u4EFD \${(d.backups || []).length}</span>
      \${d.autoSave ? \`<span>\u81EA\u52A8\u5FEB\u7167 \${new Date(d.autoSave.at).toLocaleString('zh-CN', { hour12: false })}</span>\` : '<span class="muted">\u6682\u65E0\u81EA\u52A8\u5FEB\u7167</span>'}
    </div>
    \${versionBar(tabs, active, 'pick-mod-version')}
  </div>
  <div class="detail-body">\${isBackup ? renderBackupView() : renderCurrentMod(d)}</div>
  <div class="detail-actions">
    <button class="btn ok" data-act="enable-mod" \${d.enabled ? 'disabled' : ''}>\u542F\u7528</button>
    <button class="btn warn" data-act="backup-mod">\u5907\u4EFD</button>
    <button class="btn danger" data-act="disable-mod" \${d.enabled ? '' : 'disabled'}>\u7981\u7528</button>
  </div>\`;
}

function renderCurrentMod(d) {
  const cats = (d.dataCategories || []).map((c) => \`<span class="chip">\${esc(c)}</span>\`).join('');
  const persons = (d.personalities || []).slice(0, 12).map((p) => \`<div class="mini-person"><strong>\${esc(p.name || p.id)}</strong><small>\${esc(p.title || '')}</small><span class="muted">\${esc(p.id)}</span></div>\`).join('');
  return \`<div class="detail-section">
    <h4>\u6570\u636E\u7C7B\u76EE</h4>
    <div class="chips">\${cats || '<span class="muted">\u8FD9\u4E2A Mod \u8FD8\u6CA1\u6709\u6570\u636E\u6587\u4EF6</span>'}</div>
  </div>
  <div class="detail-section">
    <h4>\u4EBA\u683C\u9884\u89C8</h4>
    <div class="mini-grid">\${persons || '<span class="muted">\u8FD8\u6CA1\u6709\u4EBA\u683C</span>'}</div>
  </div>
  \${d.enabled ? '' : \`<div class="banner red">\u8BE5 Mod \u6B63\u5728\u88AB\u7981\u7528\u7684\u72B6\u6001 \xB7 \u4FEE\u6539\u4ECD\u4F1A\u4FDD\u5B58\u5230\u78C1\u76D8\uFF0C\u4F46\u4E0D\u4F1A\u5728\u6E38\u620F\u4E2D\u751F\u6548</div>\`}\`;
}

function renderBackupView() {
  const b = S.backupView;
  if (!b) return \`<div class="empty-state"><p>\u6B63\u5728\u8BFB\u53D6\u5907\u4EFD\u2026</p></div>\`;
  const persons = (b.personalities || []).map((p) => \`<div class="mini-person"><strong>\${esc(p.name || p.id)}</strong><small>\${esc(p.title || '')}</small><span class="muted">\${esc(p.id)}</span></div>\`).join('');
  return \`<div class="readonly-note">\u5907\u4EFD\u4E3A\u53EA\u8BFB\u3002\u82E5\u8981\u56DE\u5230\u8FD9\u4E2A\u7248\u672C\uFF0C\u4F7F\u7528\u4E0B\u65B9\u300C\u66FF\u6362\u5F53\u524D\u7248\u672C\u300D\u2014\u2014\u4E24\u8005\u4F1A\u4E92\u6362\uFF0C\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002</div>
  <div class="detail-section"><h4>\u4EBA\u683C</h4><div class="mini-grid">\${persons || '<span class="muted">\u8FD9\u4E2A\u5907\u4EFD\u91CC\u6CA1\u6709\u4EBA\u683C</span>'}</div></div>
  <div class="detail-actions inner">
    <button class="btn danger" data-act="swap-version" data-label="\${esc(b.label)}">\u66FF\u6362\u5F53\u524D\u7248\u672C</button>
  </div>\`;
}

function renderDllDetail() {
  const d = S.dllDetail;
  if (!d) return \`<div class="empty-state"><div class="empty-mark">\u25C6</div><p>\u4ECE\u53F3\u4FA7\u9009\u62E9\u4E00\u4E2A DLL \u67E5\u770B\u8BE6\u60C5</p></div>\`;
  const tabs = [{ label: '\u5F53\u524D\u7248\u672C', value: 'current' }, ...(d.backups || []).map((b) => ({ label: b.label, value: b.label }))];
  return \`<div class="detail-head">
    <div class="detail-title">\${esc(d.base)} <span class="badge \${d.enabled ? 'ok' : 'off'}">\${d.enabled ? '\u5DF2\u542F\u7528' : '\u5DF2\u7981\u7528'}</span></div>
    <div class="detail-sub">\${esc(d.file)}</div>
    \${versionBar(tabs, S.dllTab, 'pick-dll-version')}
  </div>
  <div class="detail-body">
    <div class="detail-section"><h4>\u6587\u4EF6</h4>
      <div class="meta-row"><span>\${fmtBytes(d.size)}</span><span class="muted">\${esc(d.dir || '')}</span></div>
    </div>
    <div class="detail-section"><h4>\u5907\u4EFD</h4>
      <div class="chips">\${(d.backups || []).map((b) => \`<span class="chip">\${esc(b.label)}</span>\`).join('') || '<span class="muted">\u8FD8\u6CA1\u6709\u5907\u4EFD</span>'}</div>
    </div>
    \${S.dllTab !== 'current' ? '<div class="readonly-note">DLL \u5907\u4EFD\u4E3A\u53EA\u8BFB\u6587\u4EF6\uFF0C\u6062\u590D\u8BF7\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u624B\u52A8\u66FF\u6362\u3002</div>' : ''}
  </div>
  <div class="detail-actions">
    <button class="btn ok" data-act="enable-dll" \${d.enabled ? 'disabled' : ''}>\u542F\u7528</button>
    <button class="btn warn" data-act="backup-dll">\u5907\u4EFD</button>
    <button class="btn danger" data-act="disable-dll" \${d.enabled ? '' : 'disabled'}>\u7981\u7528</button>
  </div>\`;
}

/* -------------------------------- Mod \u7F16\u8F91 -------------------------------- */

const WIZARDS = [
  { kind: 'module', name: '\u6A21\u5757\u7F16\u8F91', sub: 'MODULE', ico: '\u25A4' },
  { kind: 'personality', name: '\u4EBA\u683C\u7F16\u8F91', sub: 'IDENTITY', ico: '\u25C8' },
  { kind: 'passive', name: '\u88AB\u52A8\u7F16\u8F91', sub: 'PASSIVE', ico: '\u25C7' },
  { kind: 'skill', name: '\u6280\u80FD\u7F16\u8F91', sub: 'SKILL', ico: '\u2726' },
  { kind: 'buff', name: 'Buff \u7F16\u8F91', sub: 'BUFF', ico: '\u2756' },
  { kind: 'battle', name: '\u6218\u6597\u7F16\u8F91', sub: 'BATTLE', ico: '\u2694', wip: true },
  { kind: 'enemy', name: '\u654C\u4EBA\u7F16\u8F91', sub: 'ENEMY', ico: '\u2620', wip: true },
];

function renderEdit() {
  const rows = S.mods.map(modRow).join('');
  return \`<div class="layout edit">
    <section class="panel">
      <div class="panel-head">MOD \u5217\u8868 <span class="count">\${S.mods.length}</span></div>
      <div class="panel-body list">\${rows || '<div class="list-empty">mods \u76EE\u5F55\u662F\u7A7A\u7684</div>'}</div>
      <div class="panel-foot"><button class="btn ghost block" data-act="create-mod">\uFF0B \u521B\u5EFA Mod</button></div>
    </section>
    <section class="panel edit-pane">
      \${S.editKind ? renderKindArea() : renderWizardHome()}
      <div class="dock-mini" id="session-hint"></div>
    </section>
  </div>\`;
}

function renderWizardHome() {
  const cards = WIZARDS.map((w) => \`<button class="wiz \${w.wip ? 'wip' : ''}" data-act="open-kind" data-kind="\${w.kind}">
    <span class="wiz-ico">\${w.ico}</span>
    <strong>\${w.name}</strong>
    <small>\${w.sub}\${w.wip ? ' \xB7 \u7EF4\u4FEE\u4E2D' : ''}</small>
  </button>\`).join('');
  return \`<div class="pane-head">
    <div><h2>Mod \u7F16\u8F91</h2><p class="muted">\${S.selected ? esc(S.selected) : '\u5148\u4ECE\u5DE6\u4FA7\u9009\u4E00\u4E2A Mod'}</p></div>
  </div>
  <div class="wiz-grid">\${cards}</div>\`;
}

function renderKindArea() {
  const back = \`<button class="btn ghost sm" data-act="back-wizard">\u2190 \u8FD4\u56DE</button>\`;
  if (S.editKind === 'skill') return renderSkillArea(back);
  if (S.editKind === 'module') return renderModuleArea(back);
  if (S.editKind === 'passive') return renderPassiveArea(back);
  if (S.editKind === 'buff') return renderBuffArea(back);
  if (S.editKind !== 'personality') {
    return \`<div class="pane-head">\${back}<h2>\u7EF4\u4FEE\u4E2D</h2></div><div class="empty-state"><p>\u8BE5\u529F\u80FD\u6B63\u5728\u7EF4\u4FEE</p></div>\`;
  }
  if (S.personality) return renderPersonalityDetail();
  return \`\${renderSinnerArea()}\`;
}

function sinnerCharacters() {
  // \u53EA\u4FDD\u7559 12 \u7F6A\u4EBA\uFF081\u201312\uFF09\uFF1B\u89D2\u8272\u8868\u91CC\u53EF\u80FD\u6DF7\u5165 NPC\uFF08\u5982 400005 \u8D3E\u60DC\u6625\uFF09\uFF0C\u4E0D\u8FDB\u4EBA\u683C\u7F16\u8F91
  return (S.vanilla?.characters || []).filter((c) => Number(c.id) >= 1 && Number(c.id) <= 12);
}

function renderSinnerArea() {
  const chars = sinnerCharacters();
  const list = S.mods.find((m) => m.name === S.selected);
  const disabled = list && !list.enabled;
  const all = S.vanilla?.custom || [];
  const custom = S.sinner ? all.filter((p) => Number(p.characterId) === Number(S.sinner)) : all;
  const faces = chars.map((c) => \`<button class="sinner \${S.sinner === c.id ? 'active' : ''}" data-act="pick-sinner" data-id="\${c.id}">
      <span class="face">\${esc(String(c.name || '?').slice(0, 1))}</span>
      <span class="s-name">\${esc(c.name)}</span>
    </button>\`).join('');
  const rows = custom.map((p) => \`<button class="person-row" data-act="open-personality" data-id="\${esc(p.id)}">
      <strong>\${esc(p.name || p.id)}</strong><small>\${esc(p.title || '')}</small><span class="muted">\${esc(p.id)}</span>
    </button>\`).join('');
  const vanillaRows = (S.vanillaList || []).map((p) => \`<div class="person-row vanilla"><strong>\${esc(p.name || p.id)}</strong><small>\${esc(p.title || '')}</small><span class="muted">\${esc(p.id)}</span></div>\`).join('');
  return \`<div class="pane-head">
    <button class="btn ghost sm" data-act="back-wizard">\u2190 \u8FD4\u56DE</button>
    <div><h2>\u4EBA\u683C\u7F16\u8F91</h2><p class="muted">\${esc(S.selected || '')} \xB7 \u9009\u62E9\u7F6A\u4EBA\u540E\u5F00\u59CB</p></div>
  </div>
  \${disabled ? '<div class="banner red">\u8BE5 Mod \u6B63\u5728\u88AB\u7981\u7528\u7684\u72B6\u6001 \xB7 \u4FEE\u6539\u4ECD\u4F1A\u4FDD\u5B58\u5230\u78C1\u76D8\uFF0C\u4F46\u4E0D\u4F1A\u5728\u6E38\u620F\u4E2D\u751F\u6548</div>' : ''}
  <div class="sinner-grid">\${faces}</div>
  <div class="list-section">
    <button class="section-toggle" data-act="toggle-vanilla">\u539F\u7248\u4EBA\u683C\u5217\u8868 (\${(S.vanillaList || []).length}) <span>\${S.showVanilla ? '\u6536\u8D77' : '\u5C55\u5F00'}</span></button>
    \${S.showVanilla ? \`<div class="person-list">\${vanillaRows || '<div class="list-empty">\u8BE5\u7F6A\u4EBA\u6CA1\u6709\u539F\u7248\u4EBA\u683C</div>'}</div>\` : ''}
    <div class="list-sub">\u672C MOD \u81EA\u5B9A\u4E49\u4EBA\u683C\${S.sinner ? \` \xB7 \${esc(chars.find((c) => c.id === S.sinner)?.name || '')}\` : ''}</div>
    <div class="person-list">\${rows || \`<div class="list-empty">\${S.sinner ? '\u8BE5\u7F6A\u4EBA\u5728\u6B64 Mod \u4E0B\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u4EBA\u683C' : '\u8FD9\u4E2A Mod \u91CC\u8FD8\u6CA1\u6709\u4EBA\u683C'}</div>\`}</div>
    <button class="btn ghost block" data-act="create-personality" \${S.sinner ? '' : 'disabled'}>\uFF0B \u65B0\u5EFA\u4EBA\u683C</button>
  </div>\`;
}

function fieldRow(label, path, value, opts = {}) {
  if (opts.textarea) {
    return \`<label class="field"><span>\${label}</span><textarea rows="3" data-field="\${path}">\${esc(value ?? '')}</textarea></label>\`;
  }
  const type = opts.type || 'text';
  const step = opts.step ? \` step="\${opts.step}"\` : '';
  return \`<label class="field"><span>\${label}</span><input type="\${type}"\${step} data-field="\${path}" value="\${esc(value ?? '')}"></label>\`;
}

function renderPersonalityDetail() {
  const p = S.personality;
  const e = p.entity || {};
  const l = p.locale || {};
  const lists = (v) => (Array.isArray(v) ? v.join(',') : (v ?? ''));
  const sess = S.session || {};
  const dirty = sess.dirty;
  const modEnabled = S.mods.find((m) => m.name === S.selected)?.enabled !== false;
  return \`<div class="pane-head">
    <button class="btn ghost sm" data-act="back-personalities">\u2190 \u8FD4\u56DE</button>
    <div><h2>\${esc(l.name || e.id)}</h2><p class="muted">\${esc(p.id)} \xB7 \${esc(S.selected || '')}</p></div>
    <span class="spacer"></span>
    <button class="btn ghost sm" data-act="undo" \${sess.undo ? '' : 'disabled'}>\u64A4\u9500</button>
    <button class="btn ghost sm" data-act="redo" \${sess.redo ? '' : 'disabled'}>\u91CD\u505A</button>
    <button class="btn primary sm" data-act="save-personality">\u4FDD\u5B58</button>
    <span class="session-state \${dirty ? 'dirty' : ''}" id="session-state">\${dirty ? '\u6709\u672A\u4FDD\u5B58\u6539\u52A8' : '\u5DF2\u4FDD\u5B58'}</span>
  </div>
  \${modEnabled ? '' : '<div class="banner red">\u8BE5 Mod \u6B63\u5728\u88AB\u7981\u7528\u7684\u72B6\u6001 \xB7 \u4FEE\u6539\u4ECD\u4F1A\u4FDD\u5B58\u5230\u78C1\u76D8\uFF0C\u4F46\u4E0D\u4F1A\u5728\u6E38\u620F\u4E2D\u751F\u6548</div>'}
  <div class="form" id="personality-form">
    <div class="grid-2">
      \${fieldRow('\u540D\u79F0', 'locale.name', l.name)}
      \${fieldRow('\u79F0\u53F7', 'locale.title', l.title)}
    </div>
    \${fieldRow('\u7B80\u4ECB', 'locale.desc', l.desc, { textarea: true })}
    <div class="grid-3">
      \${fieldRow('\u7B49\u7EA7 RANK', 'entity.rank', e.rank, { type: 'number' })}
      \${fieldRow('\u57FA\u7840 HP', 'entity.hp.defaultStat', e.hp?.defaultStat, { type: 'number', step: '0.5' })}
      \${fieldRow('\u6BCF\u7EA7\u6210\u957F', 'entity.hp.incrementByLevel', e.hp?.incrementByLevel, { type: 'number', step: '0.01' })}
      \${fieldRow('\u9632\u5FA1\u4FEE\u6B63', 'entity.defCorrection', e.defCorrection, { type: 'number' })}
    </div>
    <div class="grid-2">
      \${fieldRow('\u6700\u5C0F\u901F\u5EA6', 'entity.minSpeedList', lists(e.minSpeedList))}
      \${fieldRow('\u6700\u5927\u901F\u5EA6', 'entity.maxSpeedList', lists(e.maxSpeedList))}
    </div>
    \${fieldRow('\u5916\u89C2 (appearance)', 'entity.appearance', e.appearance)}
    <div class="hint muted">\u6539\u52A8\u4F1A\u5728\u505C\u6B62\u8F93\u5165\u540E\u81EA\u52A8\u5199\u5165\u78C1\u76D8\uFF0C\u5E76\u8BB0\u5165\u672C\u6587\u4EF6\u7684\u64A4\u9500\u5386\u53F2\u3002\u4FDD\u5B58\u540E\u64A4\u9500\u5386\u53F2\u6E05\u7A7A\u3002</div>
  </div>\`;
}

/* -------------------------------- \u7F16\u8F91\u5199\u5165 -------------------------------- */

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
      entity[key] = String(raw).split(/[,\uFF0C\\s]+/).filter(Boolean).map((x) => num(x));
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
    if (hint) { hint.textContent = S.session?.dirty ? '\u6709\u672A\u4FDD\u5B58\u6539\u52A8' : '\u5DF2\u4FDD\u5B58'; hint.className = \`session-state \${S.session?.dirty ? 'dirty' : ''}\`; }
    const undoBtn = $('[data-act="undo"]');
    const redoBtn = $('[data-act="redo"]');
    if (undoBtn) undoBtn.disabled = !(Number(S.session?.undo) > 0);
    if (redoBtn) redoBtn.disabled = !(Number(S.session?.redo) > 0);
    if (!res.changed) return;
  } finally { patching = false; }
}

/* ---------------------------------- \u5BFC\u5165 ---------------------------------- */

function renderImport() {
  return \`<div class="layout single">
    <section class="panel">
      <div class="panel-head">MOD \u5BFC\u5165 <span class="tag">WIP</span></div>
      <div class="panel-body">
        <div class="empty-state"><div class="empty-mark">\u21E9</div><p>\u8BE5\u529F\u80FD\u6B63\u5728\u7EF4\u4FEE</p><small class="muted">\u540E\u7EED\u4F1A\u652F\u6301\u4ECE\u538B\u7F29\u5305 / \u6587\u4EF6\u5939\u5BFC\u5165\u5E76\u81EA\u52A8\u68C0\u67E5\u7ED3\u6784\u3002</small></div>
      </div>
    </section>
  </div>\`;
}

/* --------------------------------- \u5F39\u7A97\u6D41\u7A0B -------------------------------- */

function openSettings() {
  const st = S.status || {};
  modal({
    title: '\u8BBE\u7F6E',
    wide: true,
    body: \`
      <div class="grid-2">
        <label class="field"><span>\u7F16\u8F91\u8005\u540D\u79F0</span><input id="set-editor" value="\${esc(st.editorName || '\u4F46\u4E01')}" placeholder="\u4F46\u4E01"></label>
        <label class="field"><span>\u754C\u9762\u4E3B\u9898</span>
          <select id="set-theme">
            <option value="dark" \${(st.theme || 'dark') === 'dark' ? 'selected' : ''}>\u6DF1\u8272\uFF08\u9ED8\u8BA4\uFF09</option>
            <option value="light" \${st.theme === 'light' ? 'selected' : ''}>\u6D45\u8272</option>
          </select>
        </label>
      </div>
      <label class="field"><span>\u79C1\u670D\u8DEF\u5F84\uFF08\u6E38\u620F\u76EE\u5F55\u6216 Lethe \u76EE\u5F55\uFF09</span><input id="set-root" value="\${esc(st.gameRoot || st.letheRoot || '')}" placeholder="D:\\\\\u79C1\u670D"></label>
      <div class="row gap">
        <button class="btn primary sm" data-act="apply-root">\u4F7F\u7528\u8FD9\u4E2A\u76EE\u5F55</button>
        <button class="btn ghost sm" data-act="locate-quick">\u81EA\u52A8\u5B9A\u4F4D</button>
        <button class="btn ghost sm" data-act="locate-deep">\u6DF1\u5EA6\u626B\u63CF\u78C1\u76D8</button>
      </div>
      <div class="hint muted">\u5F53\u524D Lethe\uFF1A\${esc(st.letheRoot || '\uFF08\u672A\u5B9A\u4F4D\uFF09')}<br>\u914D\u7F6E\u6587\u4EF6\uFF1A\${esc(st.configPath || '')}</div>\`,
    footer: \`<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="save-settings">\u4FDD\u5B58\u8BBE\u7F6E</button>\`,
  });
  $('#set-editor')?.focus();
}

function openCreateMod() {
  modal({
    title: '\u521B\u5EFA\u4E00\u4E2A Mod',
    body: \`<label class="field"><span>Mod \u540D\u79F0</span><input id="new-mod-name" placeholder="\u4F8B\u5982\uFF1A\u6211\u7684\u7B2C\u4E00\u4E2A Mod"></label>
      <div class="hint muted">\u4F1A\u5728 mods \u4E0B\u5EFA\u7ACB <code>custom_limbus_data</code> \u4E0E <code>custom_limbus_locale</code> \u4E24\u4E2A\u7A7A\u76EE\u5F55\uFF0C\u5176\u4F59\u76EE\u5F55\u7528\u5230\u65F6\u518D\u751F\u6210\u3002</div>\`,
    footer: \`<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="submit-create-mod">\u521B\u5EFA</button>\`,
  });
  setTimeout(() => $('#new-mod-name')?.focus(), 30);
}

function openCreatePersonality() {
  const sinner = (S.vanilla?.characters || []).find((c) => c.id === S.sinner);
  modal({
    title: '\u65B0\u5EFA\u4EBA\u683C',
    body: \`<div class="hint muted">\u7F6A\u4EBA\uFF1A\${esc(sinner?.name || '\u672A\u9009\u62E9')} \xB7 Mod\uFF1A\${esc(S.selected || '')}</div>
      <label class="field"><span>\u540D\u79F0</span><input id="np-name" placeholder="\u4F8B\u5982\uFF1A\u6D4B\u8BD5\u4EBA\u683C"></label>
      <div class="grid-2">
        <label class="field"><span>\u79F0\u53F7</span><input id="np-title" placeholder="\u79F0\u53F7"></label>
        <label class="field"><span>\u7F16\u53F7\uFF08\u53EF\u7559\u7A7A\u81EA\u52A8\u5206\u914D\uFF09</span><input id="np-id" placeholder="\u81EA\u52A8"></label>
      </div>
      <label class="field"><span>\u7B80\u4ECB</span><textarea id="np-desc" rows="3"></textarea></label>\`,
    footer: \`<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="submit-create-personality">\u521B\u5EFA</button>\`,
  });
  setTimeout(() => $('#np-name')?.focus(), 30);
}

async function confirmSwap(label) {
  const cur = S.modDetail?.dir || \`mods\\\\\${S.selected}\`;
  modal({
    title: '\u66FF\u6362\u5F53\u524D\u7248\u672C',
    body: \`<p>\u5373\u5C06\u628A\u5F53\u524D\u7248\u672C\u4E0E\u5907\u4EFD <strong>\${esc(label)}</strong> \u4E92\u6362\u3002</p>
      <div class="hint muted">\u5F53\u524D\uFF1A\${esc(cur)}<br>\u5907\u4EFD\uFF1A\${esc(label)}</div>
      <p class="danger-text">\u8BE5\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\uFF0C\u4E5F\u4E0D\u4F1A\u8FDB\u5165\u64A4\u9500\u5386\u53F2\u3002</p>\`,
    footer: \`<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn danger" data-act="submit-swap" data-label="\${esc(label)}">\u786E\u8BA4\u4E92\u6362</button>\`,
  });
}

function openRecover(check) {
  const list = check.mods.map((m) => \`<button class="person-row" data-act="recover-mod" data-name="\${esc(m.name)}">
      <strong>\${esc(m.name)}</strong><small>\u5FEB\u7167 \${new Date(m.at).toLocaleString('zh-CN', { hour12: false })}</small><span class="muted">\${m.files} \u6587\u4EF6 \xB7 \${fmtBytes(m.bytes)}</span>
    </button>\`).join('');
  modal({
    title: '\u68C0\u6D4B\u5230\u8F6F\u4EF6\u672A\u88AB\u6B63\u5E38\u5173\u95ED',
    body: \`<p>\u4E0A\u4E00\u6B21\u8FD0\u884C\u6CA1\u6709\u6B63\u5E38\u7ED3\u675F\u3002\u662F\u5426\u5C1D\u8BD5\u6062\u590D\u81EA\u52A8\u5FEB\u7167\uFF1F</p>
      <div class="person-list">\${list || '<div class="list-empty">\u6CA1\u6709\u53EF\u7528\u7684\u81EA\u52A8\u5FEB\u7167</div>'}</div>
      <div class="hint muted">\u6062\u590D\u4F1A\u5148\u7528\u5F53\u524D\u5185\u5BB9\u505A\u4E00\u4EFD\u5185\u90E8\u5B58\u6863\uFF0C\u518D\u8986\u76D6\u4E3A\u5FEB\u7167\u5185\u5BB9\u3002</div>\`,
    footer: \`<button class="btn ghost" data-act="close-modal">\u5FFD\u7565</button>\`,
  });
}

/* ---------------------------------- \u52A8\u4F5C ---------------------------------- */

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
      // \u5207\u6362 Mod \u65F6\u540C\u6B65\u5237\u65B0\u5F53\u524D\u5411\u5BFC\u9875\u7684\u5185\u5BB9\uFF08\u6B64\u524D\u53EA\u6362\u4E86\u540D\u5B57\uFF0C\u5217\u8868/\u8BE6\u60C5\u4ECD\u662F\u4E0A\u4E00\u4E2A Mod \u7684\uFF09
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
      api(\`/api/backup/read?name=\${encodeURIComponent(S.selected)}&label=\${encodeURIComponent(S.detailTab)}\`)
        .then((res) => { S.backupView = { ...res.backup, label: S.detailTab }; render(); })
        .catch((e) => toast(e.message, 'error'));
    }
  },
  'pick-dll-version': (el) => { S.dllTab = el.dataset.label; render(); },
  'enable-mod': async () => {
    await api('/api/mod/enable', { method: 'POST', body: { name: S.selected } });
    toast('\u5DF2\u542F\u7528', 'ok');
    await refreshModsAndDetail();
  },
  'disable-mod': async () => {
    await api('/api/mod/disable', { method: 'POST', body: { name: S.selected } });
    toast('\u5DF2\u7981\u7528\uFF08\u4ECD\u53EF\u7F16\u8F91\uFF09', 'warn');
    await refreshModsAndDetail();
  },
  'backup-mod': async () => {
    const res = await api('/api/mod/backup', { method: 'POST', body: { name: S.selected } });
    toast(\`\u5DF2\u5907\u4EFD\uFF1A\${res.backup.label}\`, 'ok');
    await refreshModsAndDetail();
  },
  'swap-version': (el) => confirmSwap(el.dataset.label),
  'submit-swap': async (el) => {
    closeModal();
    await api('/api/mod/swap', { method: 'POST', body: { name: S.selected, label: el.dataset.label } });
    toast('\u5DF2\u4E92\u6362\u7248\u672C', 'ok');
    S.detailTab = 'current';
    S.backupView = null;
    await refreshModsAndDetail();
  },
  'enable-dll': async () => {
    await api('/api/dll/toggle', { method: 'POST', body: { file: S.selectedDll, enabled: true } });
    toast('DLL \u5DF2\u542F\u7528', 'ok');
    await refreshDlls();
  },
  'disable-dll': async () => {
    await api('/api/dll/toggle', { method: 'POST', body: { file: S.selectedDll, enabled: false } });
    toast('DLL \u5DF2\u7981\u7528', 'warn');
    await refreshDlls();
  },
  'backup-dll': async () => {
    const res = await api('/api/dll/backup', { method: 'POST', body: { file: S.selectedDll } });
    toast(\`DLL \u5DF2\u5907\u4EFD\uFF1A\${res.backup.label}\`, 'ok');
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
    if (!name) { toast('\u8BF7\u586B\u5199 Mod \u540D\u79F0', 'warn'); return; }
    const res = await api('/api/mod/create', { method: 'POST', body: { name } });
    closeModal();
    toast(\`\u5DF2\u521B\u5EFA Mod\uFF1A\${res.mod.name}\`, 'ok');
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
      displayName: $('#np-name')?.value?.trim() || '\u65B0\u4EBA\u683C',
      title: $('#np-title')?.value?.trim() || '',
      desc: $('#np-desc')?.value?.trim() || '',
      id: $('#np-id')?.value?.trim() || undefined,
    };
    if (!name) { toast('\u8BF7\u5148\u9009\u62E9 Mod', 'warn'); return; }
    const res = await api('/api/personality/create', { method: 'POST', body });
    closeModal();
    toast(\`\u4EBA\u683C \${res.personality.id} \u5DF2\u521B\u5EFA\`, 'ok');
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
    const editorName = $('#set-editor')?.value || '\u4F46\u4E01';
    const theme = $('#set-theme')?.value || 'dark';
    const res = await api('/api/config', { method: 'POST', body: { editorName, theme } });
    S.status = { ...S.status, editorName, theme };
    document.documentElement.dataset.theme = theme;
    closeModal();
    await loadHome();
    render();
    toast('\u8BBE\u7F6E\u5DF2\u4FDD\u5B58', 'ok');
  },
  'apply-root': async () => {
    const path = $('#set-root')?.value?.trim();
    if (!path) { toast('\u8BF7\u586B\u5199\u8DEF\u5F84', 'warn'); return; }
    try {
      await api('/api/root', { method: 'POST', body: { path } });
      closeModal();
      await bootData();
      toast('\u5DF2\u5207\u6362\u79C1\u670D\u76EE\u5F55', 'ok');
    } catch (e) { toast(e.message, 'error'); }
  },
  'locate-quick': () => locateAction({ quick: true }),
  'locate-deep': () => locateAction({ quick: false }),
  'recover-mod': async (el) => {
    const name = el.dataset.name;
    await api('/api/recover', { method: 'POST', body: { name } });
    closeModal();
    toast(\`\u5DF2\u4ECE\u5FEB\u7167\u6062\u590D\uFF1A\${name}\`, 'ok');
    await bootData();
  },
  'autosave-now': async () => {
    const res = await api('/api/autosave/now', { method: 'POST', body: { name: S.selected } });
    if (res.ok) toast(\`\u5DF2\u81EA\u52A8\u5FEB\u7167\uFF1A\${res.result.files} \u6587\u4EF6\`, 'ok');
    else toast(res.result?.reason === 'clean' ? '\u5F53\u524D\u6CA1\u6709\u672A\u4FDD\u5B58\u6539\u52A8' : '\u5FEB\u7167\u672A\u6267\u884C', 'warn');
  },
};

/* ------------------------------ \u6570\u636E\u5237\u65B0\u8F85\u52A9 ------------------------------ */

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
    if (!res.ok) { toast('\u6CA1\u6709\u627E\u5230\u79C1\u670D\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u91CC\u624B\u52A8\u6307\u5B9A', 'warn', 6000); }
    else toast(\`\u5DF2\u5B9A\u4F4D\uFF1A\${res.best.letheRoot}\`, 'ok');
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
      const res = await api(\`/api/autosave?name=\${encodeURIComponent(S.selected)}\`);
      const at = res.slot?.at;
      if (at && at !== S.autoAt && at !== S.lastSeenAuto) {
        S.lastSeenAuto = at;
        S.autoAt = at;
        toast(\`\u5DF2\u81EA\u52A8\u5FEB\u7167 \${S.selected}\uFF08\${res.slot.files} \u6587\u4EF6 \xB7 \${fmtBytes(res.slot.bytes)}\uFF09\`, 'info', 6000);
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

/* --------------------------------- \u4E8B\u4EF6\u7ED1\u5B9A -------------------------------- */

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

/* \u62D6\u62FD\u7F6E\u5165\uFF08\u6A21\u5757 \u2192 \u6280\u80FD\u533A / \u786C\u5E01\u533A\uFF09 */

/* \u6307\u9488\u62D6\u62FD\uFF1AWebView2 \u91CC HTML5 \u62D6\u653E\u4E0D\u53EF\u9760\uFF0C\u6539\u7528\u9F20\u6807\u4E8B\u4EF6\u5B9E\u73B0\uFF08\u6A21\u5757\u5217\u8868 \u2192 \u7F6E\u5165\u533A\uFF09 */
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
    g.textContent = (pdrag.el.querySelector('strong') || {}).textContent || '\\u6a21\\u5757';
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
    if (on) { it.classList.add('selected'); toast('\\u5df2\\u9009\\u4e2d\\u6a21\\u5757\\uff0c\\u70b9\\u51fb\\u7f6e\\u5165\\u533a\\u653e\\u5165', 'ok'); }
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
  if (S.session?.dirty) { e.preventDefault(); e.returnValue = '\u60A8\u6709\u5DF2\u6267\u884C\u7684\u64CD\u4F5C\u672A\u4FDD\u5B58\uFF0C\u662F\u5426\u4FDD\u5B58\u8BE5\u6539\u52A8\uFF1F'; }
});

$('#btn-locate')?.addEventListener('click', () => locateAction({ quick: true }));
$('#btn-settings')?.addEventListener('click', () => openSettings());
window.addEventListener('resize', () => syncDockHeight());
window.addEventListener('load', () => syncDockHeight());

/* ---------------------------------- \u542F\u52A8 ---------------------------------- */

async function boot() {
  try {
    await loadStatus();
    document.documentElement.dataset.theme = S.status.theme || 'dark';
    if (!S.status.letheRoot) {
      S.autoLocated = true;
      S.locating = true;
      render();
      const res = await api('/api/locate', { method: 'POST', body: { quick: false } });
      if (!res.ok) { S.locating = false; S.autoLocated = true; render(); toast('\u6CA1\u6709\u81EA\u52A8\u627E\u5230\u79C1\u670D\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u91CC\u624B\u52A8\u6307\u5B9A', 'warn', 6000); return; }
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

/* ============================ v0.3 \u6280\u80FD\u7F16\u8F91 ============================ */

function refocus(id, pos) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(pos, pos); } catch { /* number \u8F93\u5165\u4E0D\u652F\u6301\u9009\u533A */ }
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
    + (sk.override ? ' \xB7 \u539F\u7248\u8986\u76D6' : '') + (sk.coins ? ' \xB7 ' + sk.coins + ' \u786C\u5E01' : '') + '</small></div>'
    + '<span class="state-dot ' + (sk.updatedAt ? 'on' : '') + '"></span></button>').join('');
  const mods = filteredModules().map((m) => '<div class="module-item" data-module="' + esc(m.id) + '">'
    + '<div class="m-head"><span class="tag ' + (m.test ? 'warn' : '') + '">' + (m.test ? '\u6D4B\u8BD5' : '\u6A21\u5757') + '</span><strong>' + esc(m.name || m.id) + '</strong></div>'
    + '<p class="m-desc">' + esc(m.description || '') + '</p></div>').join('');
  const disabled = S.mods.find((m) => m.name === S.selected)?.enabled === false;
  return '<div class="pane-head">' + back
    + '<div><h2>\u6280\u80FD\u7F16\u8F91</h2><p class="muted">' + esc(S.selected || '') + '</p></div></div>'
    + (disabled ? '<div class="banner red">\u8BE5 Mod \u6B63\u5728\u88AB\u7981\u7528\u7684\u72B6\u6001 \xB7 \u4FEE\u6539\u4ECD\u4F1A\u4FDD\u5B58\u5230\u78C1\u76D8\uFF0C\u4F46\u4E0D\u4F1A\u5728\u6E38\u620F\u4E2D\u751F\u6548</div>' : '')
    + '<div class="skill-wrap">'
    + '<section class="panel skill-list"><div class="panel-head">\u6280\u80FD <span class="count">' + skills.length + '</span></div>'
    + '<div class="panel-search"><input id="skill-search" class="search" placeholder="\u641C\u7D22 id / \u540D\u79F0" value="' + esc(S.skillSearch) + '"></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u6280\u80FD</div>') + '</div>'
    + '<div class="panel-foot two"><button class="btn ghost sm" data-act="new-skill">\uFF0B \u65B0\u5EFA</button><button class="btn ghost sm" data-act="import-skill">\u21E9 \u5BFC\u5165</button></div></section>'
    + renderSkillMain()
    + '<section class="panel module-list"><div class="panel-head">\u6A21\u5757\u5217\u8868 <span class="count">' + (S.modules || []).length + '</span></div>'
    + '<div class="panel-search"><input id="module-search" class="search" placeholder="\u641C\u7D22 [\u547D\u4E2D\u65F6] / \u63CF\u8FF0" value="' + esc(S.moduleSearch) + '"></div>'
    + '<div class="panel-body mods">' + (mods || '<div class="list-empty">\u6CA1\u6709\u6A21\u5757</div>') + '</div>'
    + '<div class="panel-foot"><span class="hint muted">\u6A21\u5757\u7F16\u8F91\u5C1A\u672A\u5F00\u653E \xB7 3 \u4E2A\u6D4B\u8BD5\u6A21\u5757\u4EC5\u4F9B\u62D6\u62FD\u6F14\u793A\uFF0C\u4E0D\u4EA7\u751F\u5B9E\u9645\u6548\u679C</span></div></section>'
    + '</div>';
}

function renderSkillMain() {
  if (!S.skill) {
    return '<section class="panel skill-main"><div class="panel-head">\u6280\u80FD</div><div class="panel-body">'
      + '<div class="empty-state"><div class="empty-mark">\u2726</div><p>\u4ECE\u5DE6\u4FA7\u9009\u4E00\u4E2A\u6280\u80FD</p><small class="muted">\u6216\u65B0\u5EFA / \u4ECE\u539F\u7248\u4EBA\u683C\u5BFC\u5165</small></div></div></section>';
  }
  const sk = S.skill;
  const info = sk.info || {};
  const code = sk.code || {};
  const sess = S.session || {};
  const optList = (arr, v) => (arr || []).map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  const field = (label, key, type, extra) => '<label class="field"><span>' + label + '</span><input type="' + (type || 'number') + '" data-info="' + key + '" value="' + esc(info[key]) + '" ' + (extra || '') + '></label>';
  const sel = (label, key, arr) => '<label class="field"><span>' + label + '</span><select data-info="' + key + '">' + optList(arr, info[key]) + '</select></label>';
  return '<section class="panel skill-main"><div class="panel-head skill-head">'
    + '<div class="skill-title"><strong>' + esc(sk.name || sk.id) + '</strong><small>' + esc(sk.id) + (sk.override ? ' \xB7 \u539F\u7248\u8986\u76D6' : '') + '</small></div>'
    + '<span class="spacer"></span>'
    + '<button class="btn ghost sm" data-act="undo"' + (sess.undo ? '' : ' disabled') + '>\u64A4\u9500</button>'
    + '<button class="btn ghost sm" data-act="redo"' + (sess.redo ? '' : ' disabled') + '>\u91CD\u505A</button>'
    + '<button class="btn primary sm" data-act="save-personality">\u4FDD\u5B58</button>'
    + '<span class="session-state ' + (sess.dirty ? 'dirty' : '') + '" id="session-state">' + (sess.dirty ? '\u6709\u672A\u4FDD\u5B58\u6539\u52A8' : '\u5DF2\u4FDD\u5B58') + '</span></div>'
    + '<div class="skill-body"><div class="info-card skill-info"><div class="col-title">\u57FA\u7840\u4FE1\u606F</div><div class="grid-2">'
    + field('\u57FA\u7840\u5A01\u529B', 'basePower') + field('\u786C\u5E01\u6570\u91CF', 'coinCount', 'number', 'min="1" max="12"')
    + field('\u653B\u51FB\u4FEE\u6B63\u503C', 'atkCorrection') + field('\u653B\u51FB\u5BB9\u91CF', 'targetNum')
    + sel('\u7269\u7406\u5C5E\u6027', 'physical', S.keywords?.physical || []) + sel('\u7F6A\u5B7D\u5C5E\u6027', 'sin', S.keywords?.sin || [])
    + sel('\u6B63\u8D1F\u786C\u5E01\u6280\u80FD', 'sign', [{ id: 'positive', zh: '\u6B63\u9762\u786C\u5E01' }, { id: 'negative', zh: '\u53CD\u9762\u786C\u5E01' }])
    + '</div><div class="hint muted">\u6280\u80FD\u540D\u4E0E id \u5728\u521B\u5EFA\u65F6\u786E\u5B9A\uFF1B\u540D\u79F0\u672C\u5730\u5316\u7EF4\u62A4\u5728\u540E\u7EED\u7248\u672C\u63D0\u4F9B\u3002</div></div>'
    + '<div class="editor-card"><div class="tabs">'
    + '<button class="tab ' + (S.skillTab === 'code' ? 'active' : '') + '" data-act="skill-tab" data-tab="code">\u4EE3\u7801</button>'
    + '<button class="tab ' + (S.skillTab === 'desc' ? 'active' : '') + '" data-act="skill-tab" data-tab="desc">\u63CF\u8FF0</button></div>'
    + (S.skillTab === 'desc' ? renderSkillDesc(sk) : renderSkillCode(code))
    + '</div></div></section>';
}

function chipHtml(arr, zone, idx) {
  return (arr || []).map((mid) => '<span class="chip">' + esc(moduleName(mid))
    + '<button class="chip-x" data-act="remove-placed" data-zone="' + zone + '" data-index="' + idx + '" data-mid="' + esc(mid) + '">\xD7</button></span>').join('');
}

function renderSkillCode(code) {
  const colors = S.keywords?.coinColors || [{ id: 'GREY', zh: '\u7070' }];
  const skillZone = '<div class="drop-zone skill-zone" data-drop="skill">'
    + (chipHtml(code.skill, 'skill', -1) || '<span class="dz-hint">\u628A\u6A21\u5757\u62D6\u5230\u8FD9\u91CC\uFF1A\u4F5C\u7528\u4E8E\u6280\u80FD\u672C\u8EAB</span>') + '</div>';
  const coins = (code.coins || []).map((c, i) => '<div class="coin-card"><div class="coin-head"><strong>\u786C\u5E01 ' + (i + 1) + '</strong>'
    + '<select data-coin="' + i + '" data-key="color">'
    + colors.map((x) => '<option value="' + esc(x.id) + '"' + (String(c.color) === String(x.id) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('')
    + '</select><label class="inline-field">\u53D8\u52A8\u503C <input type="number" data-coin="' + i + '" data-key="value" value="' + esc(c.value ?? 0) + '"></label></div>'
    + '<div class="drop-zone coin-zone" data-drop="coin" data-index="' + i + '">'
    + (chipHtml(c.modules, 'coin', i) || '<span class="dz-hint">\u62D6\u5165\u6A21\u5757\uFF1A\u4F5C\u7528\u4E8E\u8FD9\u679A\u786C\u5E01</span>') + '</div></div>').join('');
  return '<div class="code-wrap"><div class="code-col"><div class="col-title">\u6280\u80FD\u7F6E\u5165\u533A</div>' + skillZone + '</div>'
    + '<div class="coin-col"><div class="col-title">\u786C\u5E01\u7F6E\u5165\u533A <span class="muted">\uFF08\u6570\u91CF\u7531\u300C\u786C\u5E01\u6570\u91CF\u300D\u51B3\u5B9A\uFF09</span></div>'
    + (coins || '<div class="list-empty">\u786C\u5E01\u6570\u91CF\u81F3\u5C11\u4E3A 1</div>') + '</div></div>'
    + '<div class="hint muted">\u4ECE\u53F3\u4FA7\u6A21\u5757\u5217\u8868\u62D6\u5165\u3002\u786C\u5E01\u989C\u8272\u4E0E\u53D8\u52A8\u503C\u76EE\u524D\u662F\u5360\u4F4D\u6570\u636E\uFF0C\u7F16\u8F91\u5668\u2194\u6E38\u620F\u6620\u5C04\u7559\u5F85\u540E\u7EED\u7248\u672C\u3002</div>';
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
    out += '<span class="' + cls + '" title="' + esc(t.id || '\u672A\u8BC6\u522B') + '">' + esc(t.raw) + '</span>';
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
    + (unk.length ? '\u26A0 \u6709 ' + unk.length + ' \u4E2A\u5173\u952E\u8BCD\u672A\u8BC6\u522B\uFF1A' + unk.map((u) => '[' + u + ']').join(' ')
      : '\u2713 \u5173\u952E\u8BCD\u68C0\u67E5\u901A\u8FC7\uFF08' + okCount + ' \u4E2A\uFF09')
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
      + '<div class="coin-desc-head"><span class="cd-tag">\u786C\u5E01 ' + (i + 1) + '</span><span class="muted">\u8FD9\u4E00\u679A\u786C\u5E01\u547D\u4E2D/\u4F7F\u7528\u65F6\u663E\u793A\u7684\u63CF\u8FF0</span></div>'
      + '<textarea id="coin-desc-' + i + '" class="desc-input coin-desc" data-index="' + i + '" spellcheck="false" rows="3" placeholder="\u4F8B\u5982\uFF1A[\u547D\u4E2D\u65F6]\u5BF9\u76EE\u6807\u65BD\u52A01\u5C42[\u70E7\u4F24]">' + esc(ct) + '</textarea>'
      + '<div class="desc-preview" id="coin-preview-' + i + '">' + highlightText(ct, cst.tokens || []) + '</div>'
      + '<div class="coin-check" id="coin-check-' + i + '">' + descCheckHtml(cst) + '</div>'
      + '</div>');
  }
  const gameAll = [st.game || '', ...Array.from({ length: n }, (_, i) => descStateOf('coin', i).game || '')].filter(Boolean).join('\\n');
  return '<div class="desc-wrap">'
    + '<div class="desc-block"><div class="desc-block-head"><strong>\u6280\u80FD\u63CF\u8FF0</strong><span class="muted">\u6280\u80FD\u672C\u4F53\uFF08\u975E\u786C\u5E01\uFF09\u7684\u8BF4\u660E\u6587\u672C\uFF0C\u7528 [\u5173\u952E\u8BCD] \u4E66\u5199</span></div>'
    + '<textarea id="skill-desc" class="desc-input" spellcheck="false" rows="6" placeholder="\u4F8B\u5982\uFF1A[\u4F7F\u7528\u65F6]\u4F7F\u672C\u6280\u80FD\u7684\u786C\u5E01\u5A01\u529B+1">' + esc(text) + '</textarea>'
    + '<div class="desc-preview" id="desc-preview">' + highlightText(text, st.tokens || []) + '</div>'
    + '<div id="desc-check">' + descCheckHtml(st) + '</div></div>'
    + '<div class="desc-block"><div class="desc-block-head"><strong>\u786C\u5E01\u63CF\u8FF0</strong><span class="muted">\u6570\u91CF\u8DDF\u968F\u300C\u786C\u5E01\u6570\u91CF\u300D\uFF0C\u6BCF\u679A\u786C\u5E01\u4E00\u6BB5</span></div>'
    + '<div class="coin-desc-grid">' + (coins.join('') || '<div class="muted" style="padding:8px 2px">\u5F53\u524D\u6280\u80FD\u8FD8\u6CA1\u6709\u786C\u5E01\uFF1B\u628A\u300C\u786C\u5E01\u6570\u91CF\u300D\u8C03\u5230 1 \u4EE5\u4E0A\u5373\u53EF</div>') + '</div></div>'
    + '<details class="game-text"><summary>\u6E38\u620F\u5185\u6587\u672C\u9884\u89C8\uFF08\u5173\u952E\u8BCD\u5DF2\u8F6C\u4E3A\u82F1\u6587 id\uFF09</summary><pre id="game-text">' + esc(gameAll) + '</pre></details>'
    + '<div class="hint muted">\u63CF\u8FF0\u6539\u52A8\u5728\u505C\u6B62\u8F93\u5165\u540E\u5199\u5165\u78C1\u76D8\u5E76\u8BB0\u5165\u64A4\u9500\u5386\u53F2\uFF1B\u4EE3\u7801\u533A\uFF08\u62D6\u62FD\uFF09\u4E0D\u8FDB\u64A4\u9500\u3002</div></div>';
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
    hint.textContent = sess.dirty ? '\u6709\u672A\u4FDD\u5B58\u6539\u52A8' : '\u5DF2\u4FDD\u5B58';
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
    game.textContent = all.join('\\n');
  }
  updateDock();
}

function placeModule(mid, zone, index) {
  if (zone === 'passive') return placeModuleSimple(mid, 'passive');
  if (zone === 'buff') return placeModuleSimple(mid, 'buff');
  if (!S.skill) { toast('\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u6280\u80FD', 'warn'); return; }
  const code = S.skill.code || (S.skill.code = { skill: [], coins: [] });
  if (zone === 'skill') {
    code.skill = code.skill || [];
    if (code.skill.includes(mid)) { toast('\u8FD9\u4E2A\u6A21\u5757\u5DF2\u7ECF\u5728\u6280\u80FD\u533A\u4E86', 'warn'); return; }
    code.skill.push(mid);
  } else {
    const c = (code.coins || [])[Number(index)];
    if (!c) return;
    c.modules = c.modules || [];
    if (c.modules.includes(mid)) { toast('\u8FD9\u4E2A\u6A21\u5757\u5DF2\u7ECF\u5728\u8FD9\u679A\u786C\u5E01\u91CC\u4E86', 'warn'); return; }
    c.modules.push(mid);
  }
  toast('\u5DF2\u7F6E\u5165\uFF1A' + moduleName(mid), 'ok');
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
  toast('\u5DF2\u4FDD\u5B58\uFF0C\u64A4\u9500\u5386\u53F2\u5DF2\u6E05\u7A7A', 'ok');
  render();
}

async function commitSkill() {
  const res = await api('/api/skill/save', { method: 'POST', body: { name: S.selected, id: S.skillId } });
  S.session = res.session;
  toast('\u5DF2\u4FDD\u5B58\uFF0C\u64A4\u9500\u5386\u53F2\u5DF2\u6E05\u7A7A', 'ok');
  render();
}

function collectUnknown() {
  const out = [];
  const ds = S.descChecks || {};
  (ds.skill && ds.skill.unknown ? ds.skill.unknown : []).forEach((u) => out.push({ where: '\u6280\u80FD\u63CF\u8FF0', word: u }));
  (ds.coins || []).forEach((c, i) => (c && c.unknown ? c.unknown : []).forEach((u) => out.push({ where: '\u786C\u5E01 ' + (i + 1) + ' \u63CF\u8FF0', word: u })));
  return out;
}

function openRiskSave(items) {
  const unk = items || collectUnknown();
  modal({
    title: '\u4FDD\u5B58\u68C0\u67E5',
    body: '<p><strong>\u6709\u9519\u8BEF\u7684\u5173\u952E\u8BCD\u8F93\u5165\uFF0C\u8BF7\u68C0\u67E5\u62FC\u5199\u3002</strong></p>'
      + '<div class="person-list">' + unk.map((u) => '<div class="check-row"><span class="kw-bad">[' + esc(u.word) + ']</span><small>' + esc(u.where) + ' \xB7 \u672A\u5728\u65F6\u70B9\u8868 / Buff \u8868\u4E2D\u627E\u5230</small></div>').join('') + '</div>'
      + '<div class="hint muted">\u65E0\u89C6\u98CE\u9669\u4FDD\u5B58\u540E\uFF0C\u672A\u547D\u4E2D\u7684\u5173\u952E\u8BCD\u4E0D\u505A\u7FFB\u8BD1\u5904\u7406\uFF0C\u6E38\u620F\u5185\u4F1A\u6309\u539F\u6587\u663E\u793A\u3002</div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u8FD4\u56DE\u4FEE\u6539</button><button class="btn warn" data-act="risk-save-skill">\u65E0\u89C6\u98CE\u9669\u4FDD\u5B58</button>',
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
    toast('\u5DF2\u64A4\u9500', 'info');
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
    toast('\u5DF2\u91CD\u505A', 'info');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

function openCreateSkill() {
  modal({
    title: '\u65B0\u5EFA\u6280\u80FD',
    body: '<div class="form">'
      + '<label class="field"><span>\u6280\u80FD id\uFF08\u5FC5\u586B\uFF0C\u7F16\u8F91\u5668\u4F1A\u4E0E\u6E38\u620F\u5185\u5168\u90E8\u6280\u80FD\u67E5\u91CD\uFF09</span><input id="ns-id" placeholder="\u4F8B\u5982 2090111" autocomplete="off"></label>'
      + '<label class="field"><span>\u6280\u80FD\u540D\uFF08\u663E\u793A\u540D\uFF09</span><input id="ns-name" placeholder="\u4F8B\u5982 \u707C\u70ED\u65A9\u51FB" autocomplete="off"></label>'
      + '<div class="hint muted">\u5199\u5165 ' + esc(S.selected || '') + ' \u7684 custom_limbus_data/skill \u4E0E custom_limbus_locale/EN/skillList\u3002\u8981\u4FEE\u6539\u539F\u7248\u6280\u80FD\u8BF7\u7528\u300C\u5BFC\u5165\u300D\u800C\u4E0D\u662F\u65B0\u5EFA\u540C id \u6280\u80FD\u3002</div>'
      + '</div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="submit-create-skill">\u521B\u5EFA</button>',
  });
}

async function submitCreateSkill() {
  const id = ($('#ns-id')?.value || '').trim();
  const displayName = ($('#ns-name')?.value || '').trim();
  if (!id) { toast('\u8BF7\u586B\u5199\u6280\u80FD id', 'warn'); return; }
  const res = await api('/api/skill/create', { method: 'POST', body: { name: S.selected, id, displayName } });
  closeModal();
  toast('\u6280\u80FD ' + id + ' \u5DF2\u521B\u5EFA', 'ok');
  await loadSkillList();
  await openSkill(id);
}

async function openImportSkill() {
  if (!S.vanilla?.characters) { try { await loadVanilla(1); } catch { /* ignore */ } }
  S.imp = { kind: 'vanilla', characterId: 1, personalityId: '', mod: '', personalities: [], skills: [] };
  modal({
    title: '\u5BFC\u5165\u6280\u80FD',
    wide: true,
    body: '<div class="tabs import-tabs">'
      + '<button class="tab active" data-act="import-kind" data-kind="vanilla" id="imp-tab-vanilla">\u4ECE\u539F\u7248\u4EBA\u683C\u5BFC\u5165</button>'
      + '<button class="tab" data-act="import-kind" data-kind="mod" id="imp-tab-mod">\u4ECE\u81EA\u5B9A\u4E49\u6587\u4EF6\u5BFC\u5165</button>'
      + '</div><div id="import-body">\u52A0\u8F7D\u4E2D\u2026</div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="submit-import-skill">\u5BFC\u5165\u6240\u9009</button>',
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
      + '<label class="field"><span>\u7F6A\u4EBA</span><select id="imp-sinner">'
      + chars.map((c) => '<option value="' + c.id + '"' + (Number(imp.characterId) === Number(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('')
      + '</select></label><label class="field"><span>\u4EBA\u683C</span><select id="imp-personality">'
      + ((imp.personalities || []).map((p) => '<option value="' + esc(p.id) + '"' + (String(imp.personalityId) === String(p.id) ? ' selected' : '') + '>' + esc(p.name || p.id) + '</option>').join('') || '<option value="">\uFF08\u5148\u9009\u7F6A\u4EBA\uFF09</option>')
      + '</select></label></div><div class="person-list">'
      + ((imp.skills || []).map((sk) => '<label class="check-row"><input type="checkbox" data-import-id="' + esc(sk.id) + '"><strong>' + esc(sk.name || sk.id) + '</strong><small>' + esc(sk.id) + '</small></label>').join('') || '<div class="list-empty">\u6CA1\u6709\u53EF\u9009\u6280\u80FD</div>')
      + '</div><div class="hint muted">\u539F\u7248\u6280\u80FD\u5BFC\u5165\u540E\u4FDD\u6301\u539F id\uFF0C\u5728\u6E38\u620F\u4E2D\u4F1A\u8986\u76D6\u539F\u7248\u6280\u80FD\u3002</div>';
  } else {
    const others = (S.mods || []).filter((m) => m.name !== S.selected);
    el.innerHTML = '<label class="field"><span>\u6765\u6E90 Mod</span><select id="imp-mod">'
      + (others.map((m) => '<option value="' + esc(m.name) + '"' + (imp.mod === m.name ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') || '<option value="">\uFF08\u6CA1\u6709\u5176\u4ED6 Mod\uFF09</option>')
      + '</select></label><div class="person-list">'
      + ((imp.skills || []).map((sk) => '<label class="check-row"><input type="checkbox" data-import-id="' + esc(sk.id) + '"><strong>' + esc(sk.name || sk.id) + '</strong><small>' + esc(sk.id) + (sk.override ? ' \xB7 \u539F\u7248\u8986\u76D6' : '') + '</small></label>').join('') || '<div class="list-empty">\u6CA1\u6709\u53EF\u9009\u6280\u80FD</div>')
      + '</div><div class="hint muted">\u4ECE\u5176\u4ED6 Mod \u590D\u5236\u6280\u80FD\u5B9E\u4F53\u4E0E\u672C\u5730\u5316\u6761\u76EE\uFF1Bid \u4FDD\u6301\u4E0D\u53D8\u3002</div>';
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
  if (!ids.length) { toast('\u8BF7\u5148\u52FE\u9009\u8981\u5BFC\u5165\u7684\u6280\u80FD', 'warn'); return; }
  const src = { kind: S.imp.kind, mod: S.imp.kind === 'mod' ? S.imp.mod : undefined };
  if (S.imp.kind === 'vanilla' && !(await confirmOverwrite(ids))) return;
  const res = await api('/api/skill/import', { method: 'POST', body: { name: S.selected, ids, source: src } });
  closeModal();
  toast('\u5DF2\u5BFC\u5165 ' + (res.imported?.length || ids.length) + ' \u4E2A\u6280\u80FD', 'ok');
  await loadSkillList();
  const first = res.imported && res.imported[0];
  if (first) await openSkill(first);
}

function confirmOverwrite(ids) {
  return new Promise((resolve) => {
    const m = modal({
      title: '\u8986\u76D6\u539F\u7248\u6280\u80FD',
      body: '<p>\u4EE5\u4E0B\u6280\u80FD\u4F1A\u4EE5\u539F id \u5199\u5165\u5F53\u524D Mod\uFF0C\u6E38\u620F\u5185\u5C06<strong>\u8986\u76D6\u539F\u7248\u6280\u80FD</strong>\uFF1A</p><div class="person-list">'
        + ids.map((id) => '<div class="check-row"><strong>' + esc(id) + '</strong></div>').join('') + '</div>'
        + '<div class="hint muted">\u5BFC\u5165\u4E0D\u6539\u53D8\u539F\u7248 id\u3002</div>',
      footer: '<button class="btn ghost" data-act="cancel-import">\u53D6\u6D88</button><button class="btn primary" data-act="confirm-import">\u786E\u8BA4\u5BFC\u5165</button>',
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
/* ====================== v0.4 \u6A21\u5757 / \u88AB\u52A8 / Buff \u7F16\u8F91 ====================== */

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
    + '<div class="m-head"><span class="tag ' + (m.test ? 'warn' : '') + '">' + (m.test ? '\u6D4B\u8BD5' : '\u6A21\u5757') + '</span><strong>' + esc(m.name || m.id) + '</strong></div>'
    + '<p class="m-desc">' + esc(m.description || '') + '</p></div>').join('');
  return '<section class="panel module-list"><div class="panel-head">\u6A21\u5757\u5217\u8868 <span class="count">' + (S.modules || []).length + '</span></div>'
    + '<div class="panel-search"><input id="' + searchId + '" class="search" placeholder="\u641C\u7D22 [\u547D\u4E2D\u65F6] / \u63CF\u8FF0" value="' + esc(value) + '"></div>'
    + '<div class="panel-body mods">' + (mods || '<div class="list-empty">\u6CA1\u6709\u6A21\u5757</div>') + '</div>'
    + '<div class="panel-foot"><span class="hint muted">\u6A21\u5757\u7531\u300C\u6A21\u5757\u7F16\u8F91\u300D\u5236\u4F5C\uFF1B\u6D4B\u8BD5\u6A21\u5757\u4EC5\u4F9B\u62D6\u62FD\u6F14\u793A\uFF0C\u4E0D\u4EA7\u751F\u5B9E\u9645\u6548\u679C</span></div></section>';
}

/* ------------------------------ \u6A21\u5757\u7F16\u8F91 ------------------------------ */

function renderModuleArea(back) {
  const rows = (S.modules || []).map((m) => '<button class="item ' + (S.moduleEditing === m.id ? 'active' : '') + '" data-act="open-module" data-id="' + esc(m.id) + '">'
    + '<div class="item-main"><strong>' + esc(m.name || m.id) + '</strong><small>' + esc(m.id) + (m.test ? ' \xB7 \u6D4B\u8BD5' : '') + '</small></div></button>').join('');
  return '<div class="pane-head">' + back + '<div><h2>\u6A21\u5757\u7F16\u8F91</h2><p class="muted">\u53EF\u6267\u884C\u8BCD\u6761\u5757 \xB7 \u7531\u6280\u80FD / \u88AB\u52A8 / Buff \u5F15\u7528</p></div></div>'
    + '<div class="module-wrap"><section class="panel"><div class="panel-head">\u6A21\u5757 <span class="count">' + (S.modules || []).length + '</span></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">\u8FD8\u6CA1\u6709\u6A21\u5757</div>') + '</div>'
    + '<div class="panel-foot"><button class="btn ghost block" data-act="new-module">\uFF0B \u65B0\u5EFA\u6A21\u5757</button></div></section>'
    + renderModuleForm() + '</div>';
}

function renderModuleForm() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m) {
    return '<section class="panel"><div class="panel-body"><div class="empty-state"><div class="empty-mark">\u25A4</div><p>\u4ECE\u5DE6\u4FA7\u9009\u4E00\u4E2A\u6A21\u5757</p><small class="muted">\u6216\u65B0\u5EFA\u6A21\u5757</small></div></div></section>';
  }
  const timings = S.keywords?.timings || [];
  const kinds = S.keywords?.moduleKinds || [{ id: 'skill', zh: '\u6280\u80FD' }, { id: 'passive', zh: '\u88AB\u52A8' }, { id: 'buff', zh: 'Buff' }];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  const ro = m.test ? ' disabled' : '';
  return '<section class="panel module-form"><div class="panel-head"><strong>' + esc(m.name || m.id) + '</strong><span class="spacer"></span>'
    + (m.test ? '<span class="tag warn">\u6D4B\u8BD5\u6A21\u5757 \xB7 \u53EA\u8BFB</span>' : '<button class="btn ok sm" data-act="save-module">\u4FDD\u5B58</button><button class="btn danger sm" data-act="delete-module">\u5220\u9664</button>')
    + '</div><div class="panel-body"><div class="form">'
    + '<label class="field"><span>\u6A21\u5757\u540D\u79F0</span><input id="mod-name" value="' + esc(m.name || '') + '"' + ro + '></label>'
    + '<div class="grid-2">'
    + '<label class="field"><span>\u6240\u5C5E\u524D\u7F00\uFF08\u65F6\u70B9\uFF09</span><select id="mod-prefix"' + ro + '><option value="">\uFF08\u672A\u6307\u5B9A\uFF09</option>' + opt(timings, m.prefix) + '</select></label>'
    + '<label class="field"><span>\u9002\u7528\u7C7B\u578B</span><select id="mod-kind"' + ro + '>' + opt(kinds, m.kind) + '</select></label>'
    + '</div>'
    + '<label class="field"><span>\u6A21\u5757\u63CF\u8FF0\uFF08\u53EF\u6267\u884C\u8BCD\u6761\uFF09</span><textarea id="mod-desc" class="desc-input" rows="6" spellcheck="false"' + ro + ' placeholder="\u4F8B\u5982\uFF1A[\u4F7F\u7528\u65F6]\u82E5\u76EE\u6807\u7684[\u70E7\u4F24]\u5F3A\u5EA6\u4E0E[\u9707\u98A4]\u5F3A\u5EA6\u4E4B\u548C\u4E0D\u4F4E\u4E8E6\u7EA7\uFF0C\u5219\u4F7F\u672C\u6280\u80FD\u7684\u786C\u5E01\u5A01\u529B+1">' + esc(m.desc || '') + '</textarea></label>'
    + '<div class="hint muted">\u6539\u52A8\u70B9\u300C\u4FDD\u5B58\u300D\u540E\u5199\u5165\u6A21\u5757\u5E93\uFF1B\u6D4B\u8BD5\u6A21\u5757\u4E0D\u53EF\u4FEE\u6539\u4E0E\u5220\u9664\u3002</div>'
    + '</div></div></section>';
}

/* ------------------------------ \u88AB\u52A8\u7F16\u8F91 ------------------------------ */

function renderPassiveArea(back) {
  const q = (S.passiveSearch || '').trim().toLowerCase();
  const rows = (S.passives || []).filter((p) => !q || String(p.id).includes(q) || String(p.name || '').toLowerCase().includes(q))
    .map((p) => '<button class="item ' + (S.passiveId === String(p.id) ? 'active' : '') + '" data-act="open-passive" data-id="' + esc(p.id) + '">'
      + '<div class="item-main"><strong>' + esc(p.name || p.id) + '</strong><small>' + esc(p.id)
      + (p.override ? ' \xB7 \u539F\u7248\u8986\u76D6' : '') + (p.scripts ? ' \xB7 ' + p.scripts + ' \u6A21\u5757' : '') + '</small></div>'
      + '<span class="state-dot ' + (p.updatedAt ? 'on' : '') + '"></span></button>').join('');
  const disabled = S.mods.find((m) => m.name === S.selected)?.enabled === false;
  return '<div class="pane-head">' + back + '<div><h2>\u88AB\u52A8\u7F16\u8F91</h2><p class="muted">' + esc(S.selected || '') + '</p></div></div>'
    + (disabled ? '<div class="banner red">\u8BE5 Mod \u6B63\u5728\u88AB\u7981\u7528\u7684\u72B6\u6001 \xB7 \u4FEE\u6539\u4ECD\u4F1A\u4FDD\u5B58\u5230\u78C1\u76D8\uFF0C\u4F46\u4E0D\u4F1A\u5728\u6E38\u620F\u4E2D\u751F\u6548</div>' : '')
    + '<div class="skill-wrap">'
    + '<section class="panel"><div class="panel-head">\u88AB\u52A8 <span class="count">' + (S.passives || []).length + '</span></div>'
    + '<div class="panel-search"><input id="passive-search" class="search" placeholder="\u641C\u7D22 id / \u88AB\u52A8\u540D" value="' + esc(S.passiveSearch) + '"></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u88AB\u52A8</div>') + '</div>'
    + '<div class="panel-foot two"><button class="btn ghost sm" data-act="new-passive">\uFF0B \u65B0\u5EFA</button><button class="btn ghost sm" data-act="import-passive">\u21E9 \u5BFC\u5165</button></div></section>'
    + renderPassiveMain()
    + renderModulePanel('module-search2', S.moduleSearch2)
    + '</div>';
}

function renderPassiveMain() {
  if (!S.passive) {
    return '<section class="panel skill-main"><div class="panel-head">\u88AB\u52A8</div><div class="panel-body">'
      + '<div class="empty-state"><div class="empty-mark">\u25C7</div><p>\u4ECE\u5DE6\u4FA7\u9009\u4E00\u4E2A\u88AB\u52A8</p><small class="muted">\u6216\u65B0\u5EFA / \u5BFC\u5165</small></div></div></section>';
  }
  const p = S.passive;
  const info = p.info || {};
  const sess = S.session || {};
  const sins = S.keywords?.sin || [];
  const cts = S.keywords?.passiveConditions || [{ id: 'have', zh: '\u62E5\u6709' }, { id: 'resonance', zh: '\u5171\u9E23' }];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  return '<section class="panel skill-main"><div class="panel-head skill-head">'
    + '<div class="skill-title"><strong>' + esc(p.name || p.id) + '</strong><small>' + esc(p.id) + (p.override ? ' \xB7 \u539F\u7248\u8986\u76D6' : '') + '</small></div>'
    + '<span class="spacer"></span>'
    + '<button class="btn ghost sm" data-act="undo"' + (sess.undo ? '' : ' disabled') + '>\u64A4\u9500</button>'
    + '<button class="btn ghost sm" data-act="redo"' + (sess.redo ? '' : ' disabled') + '>\u91CD\u505A</button>'
    + '<button class="btn primary sm" data-act="save-passive">\u4FDD\u5B58</button>'
    + '<span class="session-state ' + (sess.dirty ? 'dirty' : '') + '" id="session-state">' + (sess.dirty ? '\u6709\u672A\u4FDD\u5B58\u6539\u52A8' : '\u5DF2\u4FDD\u5B58') + '</span></div>'
    + '<div class="skill-body"><div class="info-card"><div class="col-title">\u88AB\u52A8\u57FA\u7840\u4FE1\u606F</div>'
    + '<label class="field check"><input type="checkbox" data-pinfo="needCondition"' + (info.needCondition ? ' checked' : '') + '><span>\u9700\u8981\u7F6A\u5B7D\u6761\u4EF6\u542F\u52A8</span></label>'
    + (info.needCondition
      ? '<div class="grid-2"><label class="field"><span>\u6570\u91CF</span><input type="number" data-pinfo="count" value="' + esc(info.count ?? 3) + '"></label>'
        + '<label class="field"><span>\u7F6A\u5B7D</span><select data-pinfo="sin">' + opt(sins, info.sin) + '</select></label>'
        + '<label class="field"><span>\u6761\u4EF6\u7C7B\u578B</span><select data-pinfo="conditionType">' + opt(cts, info.conditionType) + '</select></label></div>'
      : '')
    + '<div class="hint muted">' + (info.needCondition ? (Number(info.count) || 3) + ' \u4E2A ' + esc(info.sin || '\u7F6A\u5B7D') + ' \u7F6A\u5B7D' + (info.conditionType === 'resonance' ? '\u5171\u9E23' : '\u62E5\u6709') : '\u4E0D\u9700\u8981\u7F6A\u5B7D\u6761\u4EF6\uFF0C\u88AB\u52A8\u5E38\u9A7B\u751F\u6548') + '</div>'
    + '</div><div class="editor-card"><div class="tabs">'
    + '<button class="tab ' + (S.passiveTab === 'code' ? 'active' : '') + '" data-act="passive-tab" data-tab="code">\u4EE3\u7801</button>'
    + '<button class="tab ' + (S.passiveTab === 'desc' ? 'active' : '') + '" data-act="passive-tab" data-tab="desc">\u63CF\u8FF0</button></div>'
    + (S.passiveTab === 'desc' ? renderSimpleDesc('passive', p) : renderSimpleCode('passive', p))
    + '</div></div></section>';
}

/* ------------------------------ Buff \u7F16\u8F91 ------------------------------ */

function renderBuffArea(back) {
  const q = (S.buffSearch || '').trim().toLowerCase();
  const rows = (S.buffs || []).filter((b) => !q || String(b.id).toLowerCase().includes(q) || String(b.name || '').toLowerCase().includes(q))
    .map((b) => '<button class="item ' + (S.buffId === String(b.id) ? 'active' : '') + '" data-act="open-buff" data-id="' + esc(b.id) + '">'
      + '<div class="item-main"><strong>' + esc(b.name || b.id) + '</strong><small>' + esc(b.id)
      + (b.override ? ' \xB7 \u539F\u7248\u8986\u76D6' : '') + (b.maxStack ? ' \xB7 ' + b.maxStack + ' \u5C42' : '') + '</small></div>'
      + '<span class="state-dot ' + (b.updatedAt ? 'on' : '') + '"></span></button>').join('');
  const disabled = S.mods.find((m) => m.name === S.selected)?.enabled === false;
  return '<div class="pane-head">' + back + '<div><h2>Buff \u7F16\u8F91</h2><p class="muted">' + esc(S.selected || '') + '</p></div></div>'
    + (disabled ? '<div class="banner red">\u8BE5 Mod \u6B63\u5728\u88AB\u7981\u7528\u7684\u72B6\u6001 \xB7 \u4FEE\u6539\u4ECD\u4F1A\u4FDD\u5B58\u5230\u78C1\u76D8\uFF0C\u4F46\u4E0D\u4F1A\u5728\u6E38\u620F\u4E2D\u751F\u6548</div>' : '')
    + '<div class="skill-wrap">'
    + '<section class="panel"><div class="panel-head">Buff <span class="count">' + (S.buffs || []).length + '</span></div>'
    + '<div class="panel-search"><input id="buff-search" class="search" placeholder="\u641C\u7D22 id / Buff \u540D" value="' + esc(S.buffSearch) + '"></div>'
    + '<div class="panel-body list">' + (rows || '<div class="list-empty">\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49 Buff</div>') + '</div>'
    + '<div class="panel-foot two"><button class="btn ghost sm" data-act="new-buff">\uFF0B \u65B0\u5EFA</button><button class="btn ghost sm" data-act="import-buff">\u21E9 \u5BFC\u5165</button></div></section>'
    + renderBuffMain()
    + renderModulePanel('module-search2', S.moduleSearch2)
    + '</div>';
}

function renderBuffMain() {
  if (!S.buff) {
    return '<section class="panel skill-main"><div class="panel-head">Buff</div><div class="panel-body">'
      + '<div class="empty-state"><div class="empty-mark">\u2756</div><p>\u4ECE\u5DE6\u4FA7\u9009\u4E00\u4E2A Buff</p><small class="muted">\u6216\u65B0\u5EFA / \u5BFC\u5165</small></div></div></section>';
  }
  const b = S.buff;
  const info = b.info || {};
  const sess = S.session || {};
  const classes = S.keywords?.buffClasses || [{ id: 'NonvolatileBuff', zh: '\u5E38\u9A7B\uFF08NonvolatileBuff\uFF09' }, { id: 'VolatileBuff', zh: '\u6325\u53D1\uFF08VolatileBuff\uFF09' }];
  const types = S.keywords?.buffTypes || [{ id: 'Positive', zh: '\u589E\u76CA' }, { id: 'Negative', zh: '\u51CF\u76CA' }, { id: 'Neutral', zh: '\u4E2D\u6027' }];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  const field = (label, key, type, extra) => '<label class="field"><span>' + label + '</span><input type="' + (type || 'number') + '" data-binfo="' + key + '" value="' + esc(info[key] ?? '') + '" ' + (extra || '') + '></label>';
  const sel = (label, key, arr) => '<label class="field"><span>' + label + '</span><select data-binfo="' + key + '">' + opt(arr, info[key]) + '</select></label>';
  return '<section class="panel skill-main"><div class="panel-head skill-head">'
    + '<div class="skill-title"><strong>' + esc(b.name || b.id) + '</strong><small>' + esc(b.id) + (b.override ? ' \xB7 \u539F\u7248\u8986\u76D6' : '') + '</small></div>'
    + '<span class="spacer"></span>'
    + '<button class="btn ghost sm" data-act="undo"' + (sess.undo ? '' : ' disabled') + '>\u64A4\u9500</button>'
    + '<button class="btn ghost sm" data-act="redo"' + (sess.redo ? '' : ' disabled') + '>\u91CD\u505A</button>'
    + '<button class="btn primary sm" data-act="save-buff">\u4FDD\u5B58</button>'
    + '<span class="session-state ' + (sess.dirty ? 'dirty' : '') + '" id="session-state">' + (sess.dirty ? '\u6709\u672A\u4FDD\u5B58\u6539\u52A8' : '\u5DF2\u4FDD\u5B58') + '</span></div>'
    + '<div class="skill-body"><div class="info-card"><div class="col-title">Buff \u57FA\u7840\u4FE1\u606F</div><div class="grid-2">'
    + sel('Buff \u79CD\u7C7B', 'buffClass', classes) + sel('\u6B63\u8D1F Buff', 'buffType', types)
    + field('\u6700\u5927\u5F3A\u5EA6', 'maxStack') + field('\u6700\u5927\u5C42\u6570', 'maxTurn', 'number')
    + field('Buff \u56FE\u50CF', 'iconId', 'text') + field('\u6240\u5C5E', 'special', 'text')
    + '</div><label class="field check"><input type="checkbox" data-binfo="canBeDespelled"' + (info.canBeDespelled !== false ? ' checked' : '') + '><span>\u53EF\u88AB\u51C0\u5316</span></label>'
    + '<div class="hint muted">\u300C\u6240\u5C5E\u300D\u7559\u7A7A\u8868\u793A\u666E\u901A Buff\uFF1B\u586B\u5173\u952E\u8BCD\u8868\u793A\u8BE5 Buff \u7684\u7279\u6B8A\u5F52\u5C5E\u3002</div></div>'
    + '<div class="editor-card"><div class="tabs">'
    + '<button class="tab ' + (S.buffTab === 'code' ? 'active' : '') + '" data-act="buff-tab" data-tab="code">\u4EE3\u7801</button>'
    + '<button class="tab ' + (S.buffTab === 'desc' ? 'active' : '') + '" data-act="buff-tab" data-tab="desc">\u63CF\u8FF0</button></div>'
    + (S.buffTab === 'desc' ? renderSimpleDesc('buff', b) : renderSimpleCode('buff', b))
    + '</div></div></section>';
}

/* --------------------------- \u88AB\u52A8 / Buff \u5171\u7528\u5757 --------------------------- */

function renderSimpleCode(kind, doc) {
  const code = doc.code || { modules: [] };
  const chips = chipHtml(code.modules, kind, -1);
  return '<div class="code-wrap code-simple"><div class="code-col"><div class="col-title">' + (kind === 'passive' ? '\u88AB\u52A8' : 'Buff') + '\u7F6E\u5165\u533A</div>'
    + '<div class="drop-zone ' + kind + '-zone" data-drop="' + kind + '">'
    + (chips || '<span class="dz-hint">\u628A\u53F3\u4FA7\u6A21\u5757\u62D6\u5230\u8FD9\u91CC</span>') + '</div></div>'
    + '<div class="hint muted">\u4ECE\u53F3\u4FA7\u6A21\u5757\u5217\u8868\u62D6\u5165\uFF1B\u8FD9\u91CC\u53EA\u8BB0\u5F55\u6392\u5E03\uFF0C\u5C1A\u672A\u843D\u5230\u6E38\u620F\u811A\u672C\uFF08\u6620\u5C04\u7559\u5F85\u540E\u7EED\u7248\u672C\uFF09\u3002</div></div>';
}

function renderSimpleDesc(kind, doc) {
  const id = kind === 'passive' ? 'passive-desc' : 'buff-desc';
  const text = typeof doc.description === 'string' ? doc.description : '';
  const st = kind === 'passive' ? (S.pDescCheck || { tokens: [], unknown: [] }) : (S.bDescCheck || { tokens: [], unknown: [] });
  return '<div class="desc-wrap"><div class="desc-block"><div class="desc-block-head"><strong>\u63CF\u8FF0</strong><span class="muted">\u7528 [\u5173\u952E\u8BCD] \u4E66\u5199\uFF0C\u4FDD\u5B58\u65F6\u8F6C\u6E38\u620F\u683C\u5F0F</span></div>'
    + '<textarea id="' + id + '" class="desc-input" spellcheck="false" rows="10" placeholder="\u4F8B\u5982\uFF1A[\u56DE\u5408\u5F00\u59CB\u65F6]\u83B7\u5F971\u5C42[\u70E7\u4F24]">' + esc(text) + '</textarea>'
    + '<div class="desc-preview" id="' + id + '-preview">' + highlightText(text, st.tokens || []) + '</div>'
    + '<div class="desc-check ' + ((st.unknown || []).length ? 'bad' : 'ok') + '" id="' + id + '-check">'
    + ((st.unknown || []).length ? '\u26A0 \u6709 ' + st.unknown.length + ' \u4E2A\u5173\u952E\u8BCD\u672A\u8BC6\u522B\uFF1A' + st.unknown.map((u) => '[' + u + ']').join(' ') : '\u2713 \u5173\u952E\u8BCD\u68C0\u67E5\u901A\u8FC7')
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
  if (!doc) { toast('\u8BF7\u5148\u5728\u5DE6\u4FA7\u9009\u4E00\u4E2A\u5BF9\u8C61', 'warn'); return; }
  const code = doc.code || (doc.code = { modules: [] });
  code.modules = code.modules || [];
  if (code.modules.includes(mid)) { toast('\u8FD9\u4E2A\u6A21\u5757\u5DF2\u7ECF\u653E\u8FDB\u53BB\u4E86', 'warn'); return; }
  code.modules.push(mid);
  await saveSimpleCode(kind);
  toast('\u5DF2\u7F6E\u5165\uFF1A' + moduleName(mid), 'ok');
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
  const unk = (S.pDescCheck?.unknown || []).map((u) => ({ where: '\u88AB\u52A8\u63CF\u8FF0', word: u }));
  if (unk.length) { openRiskGeneric(unk, commitPassive); return; }
  await commitPassive();
}

async function commitPassive() {
  await flushPInfo();
  const res = await api('/api/passive/save', { method: 'POST', body: { name: S.selected, id: S.passiveId } });
  S.session = res.session;
  toast('\u5DF2\u4FDD\u5B58\uFF0C\u64A4\u9500\u5386\u53F2\u5DF2\u6E05\u7A7A', 'ok');
  render();
}

async function saveBuffCurrent() {
  await flushBDesc();
  await checkBDesc();
  const unk = (S.bDescCheck?.unknown || []).map((u) => ({ where: 'Buff \u63CF\u8FF0', word: u }));
  if (unk.length) { openRiskGeneric(unk, commitBuff); return; }
  await commitBuff();
}

async function commitBuff() {
  await flushBInfo();
  const res = await api('/api/buff/save', { method: 'POST', body: { name: S.selected, id: S.buffId } });
  S.session = res.session;
  toast('\u5DF2\u4FDD\u5B58\uFF0C\u64A4\u9500\u5386\u53F2\u5DF2\u6E05\u7A7A', 'ok');
  render();
}

function openRiskGeneric(items, commit) {
  modal({
    title: '\u4FDD\u5B58\u68C0\u67E5',
    body: '<p><strong>\u6709\u9519\u8BEF\u7684\u5173\u952E\u8BCD\u8F93\u5165\uFF0C\u8BF7\u68C0\u67E5\u62FC\u5199\u3002</strong></p>'
      + '<div class="person-list">' + items.map((u) => '<div class="check-row"><span class="kw-bad">[' + esc(u.word) + ']</span><small>' + esc(u.where) + ' \xB7 \u672A\u5728\u65F6\u70B9\u8868 / Buff \u8868\u4E2D\u627E\u5230</small></div>').join('') + '</div>'
      + '<div class="hint muted">\u65E0\u89C6\u98CE\u9669\u4FDD\u5B58\u540E\uFF0C\u672A\u547D\u4E2D\u7684\u5173\u952E\u8BCD\u4E0D\u505A\u7FFB\u8BD1\u5904\u7406\u3002</div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u8FD4\u56DE\u4FEE\u6539</button><button class="btn warn" data-act="risk-save-ok">\u65E0\u89C6\u98CE\u9669\u4FDD\u5B58</button>',
  });
  actions['risk-save-ok'] = async () => { closeModal(); await commit(); };
}

/* --------------------------- \u6A21\u5757 / \u88AB\u52A8 / Buff \u521B\u5EFA --------------------------- */

function openNewModule() {
  const timings = S.keywords?.timings || [];
  const kinds = S.keywords?.moduleKinds || [];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  modal({
    title: '\u65B0\u5EFA\u6A21\u5757',
    body: '<div class="form">'
      + '<label class="field"><span>\u7C7B\u578B</span><select id="nm-kind">' + opt(kinds, 'skill') + '</select></label>'
      + '<label class="field"><span>\u540D\u79F0</span><input id="nm-name" placeholder="\u4F8B\u5982\uFF1A\u65BD\u52A0\u70E7\u4F24" autocomplete="off"></label>'
      + '<label class="field"><span>\u63CF\u8FF0\uFF08\u53EF\u6267\u884C\u8BCD\u6761\uFF09</span><textarea id="nm-desc" class="desc-input" rows="4" placeholder="\u4F8B\u5982\uFF1A[\u4F7F\u7528\u65F6]\u5BF9\u76EE\u6807\u65BD\u52A02\u5C42[\u70E7\u4F24]"></textarea></label>'
      + '<div class="hint muted">\u6A21\u5757\u76EE\u524D\u53EA\u5B58\u5728\u4E8E\u7F16\u8F91\u5668\u5185\uFF0C\u4E0D\u843D\u5230\u6E38\u620F\u811A\u672C\u3002</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="submit-create-module">\u521B\u5EFA</button>',
  });
}

async function submitCreateModule() {
  const name = document.getElementById('nm-name')?.value?.trim() || '';
  const desc = document.getElementById('nm-desc')?.value || '';
  const kind = document.getElementById('nm-kind')?.value || 'skill';
  if (!name) { toast('\u8BF7\u586B\u6A21\u5757\u540D\u79F0', 'warn'); return; }
  try {
    const res = await api('/api/module/create', { method: 'POST', body: { name, desc, kind } });
    closeModal();
    S.modulesLoaded = false;
    await loadModules(true);
    S.moduleEditing = res.module.id;
    toast('\u6A21\u5757\u5DF2\u521B\u5EFA', 'ok');
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
    toast('\u6A21\u5757\u5DF2\u4FDD\u5B58', 'ok');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteModule() {
  const m = (S.modules || []).find((x) => x.id === S.moduleEditing);
  if (!m || m.test) return;
  modal({
    title: '\u5220\u9664\u6A21\u5757',
    body: '<p>\u786E\u5B9A\u5220\u9664\u6A21\u5757\u300C' + esc(m.name || m.id) + '\u300D\uFF1F</p><div class="hint muted">\u5DF2\u5F15\u7528\u5B83\u7684\u6280\u80FD / \u88AB\u52A8 / Buff \u4F1A\u663E\u793A\u6210\u4E00\u4E2A\u7A7A\u5F15\u7528\u3002</div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn danger" data-act="confirm-delete-module" data-id="' + esc(m.id) + '">\u5220\u9664</button>',
  });
}

async function confirmDeleteModule(el) {
  await api('/api/module/delete', { method: 'POST', body: { id: el.dataset.id } });
  closeModal();
  S.moduleEditing = null;
  await loadModules(true);
  toast('\u6A21\u5757\u5DF2\u5220\u9664', 'ok');
  render();
}

function openNewPassive() {
  modal({
    title: '\u65B0\u5EFA\u88AB\u52A8',
    body: '<div class="form">'
      + '<label class="field"><span>\u88AB\u52A8 id\uFF08\u5FC5\u586B\uFF0C4\u201310 \u4F4D\u6570\u5B57\uFF0C\u7F16\u8F91\u5668\u4F1A\u67E5\u91CD\uFF09</span><input id="np-id" placeholder="\u4F8B\u5982 2090111" autocomplete="off"></label>'
      + '<label class="field"><span>\u88AB\u52A8\u540D</span><input id="np-name" placeholder="\u4F8B\u5982 \u707C\u70ED\u6297\u6027" autocomplete="off"></label>'
      + '<label class="field"><span>\u63CF\u8FF0</span><textarea id="np-desc" class="desc-input" rows="3" placeholder="\u4F8B\u5982\uFF1A[\u56DE\u5408\u5F00\u59CB\u65F6]\u83B7\u5F971\u5C42[\u70E7\u4F24]"></textarea></label>'
      + '</div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="submit-create-passive">\u521B\u5EFA</button>',
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
    toast('\u88AB\u52A8 ' + res.passive.id + ' \u5DF2\u521B\u5EFA', 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

function openNewBuff() {
  const classes = S.keywords?.buffClasses || [];
  const types = S.keywords?.buffTypes || [];
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x.id) + '"' + (String(x.id) === String(v) ? ' selected' : '') + '>' + esc(x.zh || x.id) + '</option>').join('');
  modal({
    title: '\u65B0\u5EFA Buff',
    body: '<div class="form">'
      + '<label class="field"><span>Buff id\uFF08\u5FC5\u586B\uFF0C\u82F1\u6587\u5B57\u6BCD\u5F00\u5934\uFF09</span><input id="nb-id" placeholder="\u4F8B\u5982 TestBurn" autocomplete="off"></label>'
      + '<label class="field"><span>Buff \u540D</span><input id="nb-name" placeholder="\u4F8B\u5982 \u6D4B\u8BD5\u70E7\u4F24" autocomplete="off"></label>'
      + '<div class="grid-2"><label class="field"><span>\u79CD\u7C7B</span><select id="nb-class">' + opt(classes, 'NonvolatileBuff') + '</select></label>'
      + '<label class="field"><span>\u6B63\u8D1F</span><select id="nb-type">' + opt(types, 'Negative') + '</select></label></div>'
      + '<label class="field"><span>\u63CF\u8FF0</span><textarea id="nb-desc" class="desc-input" rows="3" placeholder="\u4F8B\u5982\uFF1A[\u56DE\u5408\u7ED3\u675F\u65F6]\u53D7\u5230 1 \u70B9\u4F24\u5BB3"></textarea></label>'
      + '<div class="hint muted">\u521B\u5EFA\u4F1A\u540C\u65F6\u5199\u5165\u5B9E\u4F53\u3001\u672C\u5730\u5316\u4E0E 0 \u5B57\u8282\u5173\u952E\u8BCD\u6587\u4EF6\uFF08custom_buffs/&lt;id&gt;.txt\uFF09\u3002</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u53D6\u6D88</button><button class="btn primary" data-act="submit-create-buff">\u521B\u5EFA</button>',
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
    toast('Buff ' + res.buff.id + ' \u5DF2\u521B\u5EFA', 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

/* --------------------------------- \u5BFC\u5165 --------------------------------- */

function openImportPassive() {
  modal({
    title: '\u5BFC\u5165\u88AB\u52A8',
    body: '<div class="form"><label class="field"><span>\u641C\u7D22 id \u6216\u540D\u79F0</span><input id="ip-q" class="search" placeholder="\u4F8B\u5982 90001 / \u866B" autocomplete="off"></label>'
      + '<div class="import-list" id="ip-list"><div class="muted" style="padding:8px">\u8F93\u5165\u5173\u952E\u8BCD\u540E\u56DE\u8F66\u641C\u7D22</div></div>'
      + '<div class="hint muted">\u5BFC\u5165\u4FDD\u6301\u539F id\uFF08\u539F\u7248\u88AB\u52A8\u4F1A\u5728\u6E38\u620F\u5185\u8986\u76D6\u539F\u7248\uFF09\u3002</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u5173\u95ED</button>',
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
    + '<strong>' + esc(r.name || r.id) + '</strong><small>' + esc(r.id) + (r.source === 'vanilla' ? ' \xB7 \u539F\u7248' : ' \xB7 ' + esc(r.mod || 'Mod')) + '</small></button>').join('');
  box.innerHTML = rows || '<div class="muted" style="padding:8px">\u6CA1\u6709\u5339\u914D\u7ED3\u679C</div>';
}

async function pickImportPassive(el) {
  const id = el.dataset.id;
  try {
    const res = await api('/api/passive/import', { method: 'POST', body: { name: S.selected, ids: [id], source: { kind: 'vanilla' } } });
    closeModal();
    await loadPassiveList(S.selected);
    S.passive = null;
    await openPassive(id);
    toast('\u5DF2\u5BFC\u5165\u88AB\u52A8 ' + id + (res && res.overridden ? '\uFF08\u8986\u76D6\u539F\u7248\uFF09' : ''), 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

function openImportBuff() {
  modal({
    title: '\u5BFC\u5165 Buff',
    body: '<div class="form"><label class="field"><span>\u641C\u7D22 id \u6216\u540D\u79F0</span><input id="ib-q" class="search" placeholder="\u4F8B\u5982 Burn / \u70E7\u4F24" autocomplete="off"></label>'
      + '<div class="import-list" id="ib-list"><div class="muted" style="padding:8px">\u8F93\u5165\u5173\u952E\u8BCD\u540E\u56DE\u8F66\u641C\u7D22</div></div>'
      + '<div class="hint muted">\u5BFC\u5165\u4FDD\u6301\u539F id\uFF08\u539F\u7248 Buff \u4F1A\u5728\u6E38\u620F\u5185\u8986\u76D6\u539F\u7248\uFF09\u3002</div></div>',
    footer: '<button class="btn ghost" data-act="close-modal">\u5173\u95ED</button>',
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
    + '<strong>' + esc(r.name || r.id) + '</strong><small>' + esc(r.id) + (r.source === 'vanilla' ? ' \xB7 \u539F\u7248' : ' \xB7 ' + esc(r.mod || 'Mod')) + '</small></button>').join('');
  box.innerHTML = rows || '<div class="muted" style="padding:8px">\u6CA1\u6709\u5339\u914D\u7ED3\u679C</div>';
}

async function pickImportBuff(el) {
  const id = el.dataset.id;
  try {
    const res = await api('/api/buff/import', { method: 'POST', body: { name: S.selected, ids: [id], source: { kind: 'vanilla' } } });
    closeModal();
    await loadBuffList(S.selected);
    S.buff = null;
    await openBuff(id);
    toast('\u5DF2\u5BFC\u5165 Buff ' + id + (res && res.overridden ? '\uFF08\u8986\u76D6\u539F\u7248\uFF09' : ''), 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

/* --------------------------------- \u52A8\u4F5C\u6CE8\u518C --------------------------------- */

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
`, "web/index.html": '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>The Lethe Workbench</title>\n<link rel="stylesheet" href="/style.css" />\n</head>\n<body>\n<div id="app">\n  <main id="view" class="view"></main>\n\n  <!-- \u5E95\u680F\uFF1A\u4E3B\u884C\uFF08\u540D\u7247 + \u5BFC\u822A\u952E\uFF09+ \u72B6\u6001\u884C\uFF08\u6C38\u8FDC\u5728\u6700\u4E0A\u5C42\uFF0C\u5207\u9875\u4FDD\u7559\uFF09 -->\n  <footer class="dock">\n    <div class="dock-main">\n      <div class="namecard" id="namecard">\n        <div class="nc-cell nc-name">\n          <span class="nc-label">\u7F16\u8F91\u8005</span>\n          <strong class="nc-strong" id="nc-name">\u4F46\u4E01</strong>\n        </div>\n        <div class="nc-void"></div>\n        <div class="nc-cell nc-mod">\n          <span class="nc-label">Mod \u6570</span>\n          <strong class="nc-strong" id="nc-mod">\u2014</strong>\n        </div>\n        <div class="nc-cell nc-dll">\n          <span class="nc-label">DLL \u6570</span>\n          <strong class="nc-strong" id="nc-dll">\u2014</strong>\n        </div>\n        <div class="nc-cell nc-editor">\n          <span class="nc-label">\u7F16\u8F91\u5668</span>\n          <strong class="nc-mid" id="nc-editor">\u8FB9\u72F1\u5DE5\u4F5C\u53F0 Limbus Workshop</strong>\n          <small class="muted" id="nc-editorsub">The Lethe Workbench</small>\n        </div>\n        <div class="nc-cell nc-size">\n          <span class="nc-label">Mod \u603B\u4F53\u79EF</span>\n          <strong class="nc-strong" id="nc-size">\u2014</strong>\n        </div>\n      </div>\n      <nav class="dock-nav">\n        <button class="dock-item" data-view="home"><span class="dock-icon">\u2302</span><span>\u4E3B\u9875</span><small>HOME</small></button>\n        <button class="dock-item" data-view="mods"><span class="dock-icon">\u25C6</span><span>Mod \u7BA1\u7406</span><small>MANAGE</small></button>\n        <button class="dock-item" data-view="edit"><span class="dock-icon">\u2726</span><span>Mod \u7F16\u8F91</span><small>EDIT</small></button>\n        <button class="dock-item" data-view="import"><span class="dock-icon">\u21E9</span><span>Mod \u5BFC\u5165</span><small>IMPORT</small></button>\n      </nav>\n    </div>\n    <div class="dock-status">\n      <span class="dot" id="root-dot"></span>\n      <span id="st-root">\u5C1A\u672A\u5B9A\u4F4D\u79C1\u670D</span>\n      <span class="sep">|</span>\n      <span>\u5F53\u524D Mod <strong id="st-mod">\u2014</strong></span>\n      <span class="sep">|</span>\n      <span id="st-dirty" class="calm">\u5DF2\u4FDD\u5B58</span>\n      <span class="sep">|</span>\n      <span id="st-auto" class="muted">\u81EA\u52A8\u5FEB\u7167 \u2014</span>\n      <span class="spacer"></span>\n      <button class="btn ghost sm" id="btn-locate">\u91CD\u65B0\u5B9A\u4F4D</button>\n      <button class="btn ghost sm" id="btn-settings">\u8BBE\u7F6E</button>\n      <span id="st-version" class="muted"></span>\n    </div>\n  </footer>\n\n  <div id="toasts" class="toasts"></div>\n  <div id="modal-root"></div>\n</div>\n<script>window.__WB_TOKEN__ = "%%WB_TOKEN%%";</script>\n<script type="module" src="/app.js"></script>\n</body>\n</html>\n', "web/style.css": '/* ============ The Lethe Workbench \xB7 \u89C6\u89C9\u57FA\u5E95 ============ */\n:root{\n  --bg:#12100E; --bg-2:#161310; --panel:#1C1714; --card:#241D19; --card-2:#2B231E;\n  --line:rgba(198,161,91,.34); --line-strong:rgba(214,178,110,.72);\n  --gold:#C6A15B; --gold-hi:#E3C07E; --ink:#E8DCC6; --ink-dim:#A79780; --ink-mute:#6F6353;\n  --red:#8C1F2B; --red-hi:#B02B38; --green:#6E8B6B; --amber:#C98A3C; --blue:#4C6E93;\n  --serif:"Cinzel","Trajan Pro","Times New Roman","Noto Serif SC","Source Han Serif SC","SimSun",serif;\n  --sans:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;\n  --dock-h:150px;\n}\n*{box-sizing:border-box}\nhtml,body{height:100%}\nbody{\n  margin:0;background:\n    radial-gradient(1200px 600px at 15% -10%, rgba(140,31,43,.16), transparent 60%),\n    radial-gradient(900px 500px at 100% 0%, rgba(198,161,91,.10), transparent 55%),\n    radial-gradient(800px 800px at 50% 120%, rgba(0,0,0,.85), transparent 70%),\n    var(--bg);\n  color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.55;\n  -webkit-font-smoothing:antialiased;overflow:hidden;\n}\nbutton{font:inherit;color:inherit}\ncode{font-family:Consolas,"Cascadia Mono",monospace;font-size:.92em;color:var(--gold-hi)}\n#app{height:100%;display:flex;flex-direction:column}\n.view{flex:1;min-height:0;padding:22px 26px 18px;overflow:auto}\n.muted{color:var(--ink-dim)}\nh1,h2,h3,h4{font-family:var(--serif);letter-spacing:.06em;margin:0}\n.spacer{flex:1}\n.row{display:flex;align-items:center}\n.row.center{justify-content:center}\n.gap{gap:10px}\n\n/* ---------- \u91D1\u7EBF\u9762\u677F ---------- */\n.panel{position:relative;background:linear-gradient(160deg, rgba(36,29,25,.96), rgba(24,20,17,.96));\n  border:1px solid var(--line);box-shadow:0 0 0 1px rgba(0,0,0,.4), inset 0 0 40px rgba(0,0,0,.35)}\n.panel::before,.panel::after,.panel .corner-a,.panel .corner-b{content:"";position:absolute;width:14px;height:14px;border:1px solid var(--line-strong);pointer-events:none}\n.panel::before{left:-1px;top:-1px;border-right:none;border-bottom:none}\n.panel::after{right:-1px;top:-1px;border-left:none;border-bottom:none}\n.panel-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--line);\n  font-family:var(--serif);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-hi)}\n.panel-head .count{margin-left:auto;font-family:var(--sans);letter-spacing:.04em;color:var(--ink-dim);font-size:12px}\n.panel-body{padding:12px 12px}\n.panel-foot{padding:10px 12px;border-top:1px solid var(--line)}\n.tag{font-family:var(--sans);font-size:10px;letter-spacing:.14em;padding:2px 7px;border:1px solid var(--line);color:var(--ink-dim);margin-left:auto}\n\n/* ---------- \u6309\u94AE ---------- */\n.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border:1px solid var(--line-strong);\n  background:linear-gradient(180deg,#2A221C,#1E1814);color:var(--ink);cursor:pointer;letter-spacing:.04em;\n  transition:.15s;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}\n.btn:hover:not(:disabled){border-color:var(--gold-hi);color:var(--gold-hi)}\n.btn:disabled{opacity:.36;cursor:not-allowed}\n.btn.primary{background:linear-gradient(180deg,#8C1F2B,#6C1620);border-color:#B02B38}\n.btn.primary:hover:not(:disabled){color:#F3E4D0;border-color:#D1495A}\n.btn.ok{background:linear-gradient(180deg,#435640,#31402F);border-color:#6E8B6B}\n.btn.warn{background:linear-gradient(180deg,#7A5524,#5C3F1A);border-color:#C98A3C}\n.btn.danger{background:linear-gradient(180deg,#7C1B26,#5A121A);border-color:#B02B38}\n.btn.ghost{background:rgba(0,0,0,.22)}\n.btn.sm{padding:5px 10px;font-size:12px}\n.btn.block{width:100%}\n\n/* ---------- \u542F\u52A8 / \u641C\u7D22\u9875 ---------- */\n.boot-screen,.searching{display:flex;align-items:center;justify-content:center;min-height:60vh}\n.boot-screen{flex-direction:column;gap:18px;color:var(--ink-dim)}\n.boot-mark{width:84px;height:84px;display:grid;place-items:center;font-family:var(--serif);font-size:40px;color:var(--gold);\n  border:1px solid var(--line-strong);transform:rotate(45deg);animation:pulse 2.4s ease-in-out infinite}\n.boot-mark::first-letter{transform:rotate(-45deg)}\n@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}\n.scan-box{width:min(620px,90%);text-align:center;padding:40px 36px;border:1px solid var(--line);\n  background:linear-gradient(160deg,rgba(36,29,25,.9),rgba(20,17,14,.9))}\n.scan-box h2{margin-bottom:10px;color:var(--gold-hi);letter-spacing:.14em}\n.scan-box p{color:var(--ink-dim);margin:8px 0}\n.scan-ring{width:56px;height:56px;margin:0 auto 18px;border:2px solid rgba(198,161,91,.2);border-top-color:var(--gold);\n  border-radius:50%;animation:spin 1.1s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n\n/* ============================ \u4E3B\u9875 ============================ */\n.home{display:grid;grid-template-columns:minmax(420px,1fr) 380px;grid-template-rows:minmax(0,1fr);gap:20px;height:100%;min-height:0}\n.home-cover{position:relative;grid-row:1;grid-column:1;min-height:0;border:1px solid var(--line);overflow:hidden;\n  background:\n    radial-gradient(600px 320px at 20% 10%, rgba(140,31,43,.28), transparent 60%),\n    radial-gradient(500px 400px at 90% 90%, rgba(198,161,91,.10), transparent 60%),\n    linear-gradient(150deg,#1B1512,#0D0B09)}\n.home-cover::after{content:"";position:absolute;inset:0;background:\n  repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 3px);pointer-events:none}\n.cover-inner{position:relative;z-index:1;padding:44px 48px;height:100%;display:flex;flex-direction:column;justify-content:flex-end}\n.cover-kicker{font-size:11px;letter-spacing:.34em;color:var(--gold);text-transform:uppercase;margin-bottom:auto}\n.cover-inner h1{font-size:clamp(38px,4.6vw,64px);line-height:.98;letter-spacing:.04em;color:#F1E4CC;text-shadow:0 4px 24px rgba(0,0,0,.6)}\n.cover-line{width:120px;height:2px;background:linear-gradient(90deg,var(--gold),transparent);margin:18px 0}\n.cover-inner p{color:var(--ink-dim);letter-spacing:.12em}\n.cover-placeholder{margin-top:26px;padding:10px 14px;border:1px dashed var(--line);color:var(--ink-mute);font-size:12px;letter-spacing:.1em;width:max-content}\n.home-side{grid-row:1;grid-column:2;display:flex;flex-direction:column;gap:16px;min-height:0}\n.round-actions{display:flex;gap:14px;justify-content:flex-end}\n.round-btn{width:74px;height:74px;border-radius:50%;border:1px solid var(--line-strong);background:radial-gradient(circle at 35% 30%,#2E2620,#171310);\n  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;transition:.18s;color:var(--ink-dim)}\n.round-btn span{font-size:20px;line-height:1;color:var(--gold-hi)}\n.round-btn small{font-size:10px;letter-spacing:.08em}\n.round-btn:hover{border-color:var(--gold-hi);color:var(--ink);box-shadow:0 0 18px rgba(198,161,91,.18)}\n.notice{flex:1;display:flex;flex-direction:column;min-height:0}\n.notice .panel-body{flex:1;display:flex}\n.placeholder{width:100%;display:grid;place-items:center;color:var(--ink-mute);font-size:12px;letter-spacing:.12em;\n  border:1px dashed rgba(198,161,91,.18);padding:20px}\n.namecard{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));\n  grid-template-rows:28px minmax(30px,1fr) minmax(30px,1fr);gap:1px;\n  background:rgba(198,161,91,.22);border:1px solid var(--line);\n  width:min(600px,46vw);min-width:360px;flex:0 0 auto}\n.nc-cell{background:linear-gradient(160deg,#221B17,#181411);padding:4px 12px;display:flex;flex-direction:column;justify-content:center;gap:1px;min-width:0}\n.nc-void{grid-column:5/7;grid-row:1;background:transparent}\n.nc-name{grid-column:1/5;grid-row:1}\n.nc-mod{grid-column:7/9;grid-row:1}\n.nc-dll{grid-column:9/11;grid-row:1}\n.nc-editor{grid-column:1/7;grid-row:2/4}\n.nc-size{grid-column:7/11;grid-row:2/4}\n.nc-label{font-size:9px;letter-spacing:.2em;color:var(--ink-mute);text-transform:uppercase}\n.nc-strong{font-family:var(--serif);font-size:17px;line-height:1.15;color:var(--gold-hi)}\n.nc-mid{font-family:var(--serif);font-size:13px;line-height:1.2;color:var(--gold-hi)}\n.nc-cell small{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n\n/* ============================ \u4E09\u680F / \u4E24\u680F ============================ */\n.layout{display:grid;gap:16px;min-height:100%}\n.layout.mods{grid-template-columns:300px minmax(0,1fr) 290px}\n.layout.edit{grid-template-columns:300px minmax(0,1fr)}\n.layout.single{grid-template-columns:1fr}\n.layout .panel{display:flex;flex-direction:column;min-height:0;overflow:hidden}\n.list{flex:1;overflow:auto;display:flex;flex-direction:column;gap:6px}\n.list-empty{padding:22px 12px;text-align:center;color:var(--ink-mute);font-size:12px;letter-spacing:.06em}\n\n/* ---------- \u5217\u8868\u9879 ---------- */\n.item{position:relative;display:flex;align-items:center;gap:10px;text-align:left;width:100%;padding:10px 12px;\n  border:1px solid transparent;background:rgba(255,255,255,.02);cursor:pointer;transition:.13s}\n.item:hover{background:rgba(198,161,91,.07);border-color:rgba(198,161,91,.22)}\n.item.active{background:rgba(198,161,91,.12);border-color:var(--line-strong)}\n.item.disabled{filter:grayscale(1) brightness(.72)}\n.item.disabled .item-main strong{color:var(--ink-dim)}\n.item-main{display:flex;flex-direction:column;min-width:0}\n.item-main strong{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.item-main small{font-size:11px;color:var(--ink-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.state-dot{width:7px;height:7px;border-radius:50%;flex:none}\n.state-dot.on{background:#7FA678;box-shadow:0 0 8px rgba(127,166,120,.6)}\n.state-dot.off{background:#8C1F2B;box-shadow:0 0 8px rgba(140,31,43,.6)}\n.x-badge{position:absolute;right:8px;bottom:8px;width:16px;height:16px;display:grid;place-items:center;font-size:10px;\n  color:#F0D9D9;background:#8C1F2B;border:1px solid #B02B38}\n\n/* ---------- \u8BE6\u60C5 ---------- */\n.detail-pane{overflow:auto!important}\n.detail-head{padding:16px 18px 0}\n.detail-title{font-family:var(--serif);font-size:19px;letter-spacing:.05em;display:flex;align-items:center;gap:10px}\n.detail-sub{color:var(--ink-mute);font-size:11px;margin-top:4px;word-break:break-all}\n.meta-row{display:flex;flex-wrap:wrap;gap:14px;margin:12px 0;font-size:12px;color:var(--ink-dim)}\n.badge{font-family:var(--sans);font-size:10px;padding:2px 8px;border:1px solid var(--line);letter-spacing:.1em}\n.badge.ok{color:#A9C6A3;border-color:#6E8B6B;background:rgba(110,139,107,.14)}\n.badge.off{color:#E0B2B6;border-color:#8C1F2B;background:rgba(140,31,43,.18)}\n.version-bar{display:flex;gap:6px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--line);margin-bottom:12px}\n.vtab{padding:5px 12px;font-size:12px;border:1px solid var(--line);background:rgba(0,0,0,.2);cursor:pointer;color:var(--ink-dim)}\n.vtab.active{color:var(--gold-hi);border-color:var(--gold);background:rgba(198,161,91,.12)}\n.vtab:hover{color:var(--ink)}\n.detail-body{padding:0 18px 14px;flex:1}\n.detail-section{margin:14px 0}\n.detail-section h4{font-size:11px;letter-spacing:.2em;color:var(--gold);text-transform:uppercase;margin-bottom:8px}\n.chips{display:flex;flex-wrap:wrap;gap:6px}\n.chip{padding:3px 9px;border:1px solid var(--line);font-size:11px;color:var(--ink-dim);background:rgba(0,0,0,.18)}\n.mini-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}\n.mini-person{display:flex;flex-direction:column;border:1px solid var(--line);padding:8px 10px;background:rgba(0,0,0,.18);gap:1px}\n.mini-person strong{font-size:13px}\n.mini-person small{font-size:11px;color:var(--ink-dim)}\n.mini-person .muted{font-size:10px}\n.detail-actions{display:flex;gap:10px;padding:12px 18px;border-top:1px solid var(--line);background:rgba(0,0,0,.18)}\n.detail-actions .btn{flex:1}\n.detail-actions.inner{border-top:none;padding:6px 0 0;background:none}\n.readonly-note{margin:0 0 12px;padding:10px 12px;border-left:2px solid var(--amber);background:rgba(201,138,60,.1);color:#E0C9A6;font-size:12px}\n.banner{padding:9px 12px;font-size:12px;border-left:2px solid var(--amber);background:rgba(201,138,60,.1);color:#E0C9A6;margin:0 0 12px}\n.banner.red{border-left-color:var(--red-hi);background:rgba(140,31,43,.16);color:#E6C3C7}\n.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--ink-mute);padding:40px 20px;text-align:center}\n.empty-mark{font-size:32px;color:var(--gold);opacity:.55}\n.danger-text{color:#E6AEB3;font-size:12px}\n\n/* ---------- \u7F16\u8F91\u9875 ---------- */\n.edit-pane{overflow:auto!important;padding:16px 18px 8px}\n.pane-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}\n.pane-head h2{font-size:19px;color:var(--gold-hi);letter-spacing:.08em}\n.pane-head p{margin:2px 0 0;font-size:12px}\n.wiz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}\n.wiz{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:18px;border:1px solid var(--line);\n  background:linear-gradient(160deg,#241D19,#191512);cursor:pointer;transition:.15s;text-align:left;min-height:118px}\n.wiz:hover{border-color:var(--gold-hi);transform:translateY(-1px)}\n.wiz .wiz-ico{font-size:22px;color:var(--gold)}\n.wiz strong{font-family:var(--serif);font-size:15px;letter-spacing:.06em}\n.wiz small{font-size:10px;letter-spacing:.18em;color:var(--ink-mute)}\n.wiz.wip{opacity:.55;filter:grayscale(.6)}\n.wiz.wip::after{content:"\u7EF4\u4FEE\u4E2D";align-self:flex-end;margin-top:auto;font-size:10px;color:var(--amber);letter-spacing:.1em}\n.sinner-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin-bottom:16px}\n.sinner{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border:1px solid var(--line);\n  background:rgba(0,0,0,.18);cursor:pointer;transition:.13s}\n.sinner.active{border-color:var(--gold);background:rgba(198,161,91,.14)}\n.sinner .face{width:38px;height:38px;display:grid;place-items:center;font-family:var(--serif);font-size:17px;color:var(--gold-hi);\n  border:1px solid var(--line-strong);background:radial-gradient(circle at 35% 30%,#322821,#1A1512)}\n.sinner .s-name{font-size:11px;color:var(--ink-dim)}\n.list-section{display:flex;flex-direction:column;gap:8px}\n.section-toggle{display:flex;justify-content:space-between;width:100%;padding:9px 12px;border:1px solid var(--line);\n  background:rgba(0,0,0,.2);cursor:pointer;color:var(--ink-dim);font-size:12px}\n.section-toggle span{color:var(--gold)}\n.list-sub{font-size:10px;letter-spacing:.18em;color:var(--ink-mute);text-transform:uppercase;margin-top:6px}\n.person-list{display:flex;flex-direction:column;gap:6px}\n.person-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;border:1px solid var(--line);background:rgba(255,255,255,.02);cursor:pointer}\n.person-row strong{font-size:13px}\n.person-row small{font-size:11px;color:var(--ink-dim)}\n.person-row .muted{margin-left:auto;font-size:11px}\n.person-row:hover{border-color:var(--gold)}\n.person-row.vanilla{opacity:.85;cursor:default;background:rgba(0,0,0,.16)}\n.person-row.vanilla .muted::after{content:" \u539F\u7248";color:var(--ink-mute)}\n\n/* ---------- \u8868\u5355 ---------- */\n.form{display:flex;flex-direction:column;gap:12px;padding-bottom:12px}\n.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}\n.field{display:flex;flex-direction:column;gap:5px;min-width:0}\n.field>span{font-size:11px;letter-spacing:.12em;color:var(--ink-dim)}\n.field input,.field textarea,.field select{padding:8px 10px;background:rgba(0,0,0,.28);border:1px solid var(--line);color:var(--ink);font:inherit;outline:none;resize:vertical}\n.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--gold-hi);box-shadow:0 0 0 2px rgba(198,161,91,.12)}\n.hint{font-size:11px;line-height:1.6}\n.session-state{font-size:11px;padding:3px 9px;border:1px solid var(--line);color:var(--ink-dim)}\n.session-state.dirty{color:#E5C79A;border-color:var(--amber);background:rgba(201,138,60,.12)}\n#session-hint{font-size:11px;color:var(--ink-mute);margin-top:8px}\n\n/* ============================ \u5E95\u680F ============================ */\n.dock{position:relative;flex:0 0 auto;z-index:900;\n  border-top:1px solid var(--line-strong);background:linear-gradient(180deg,rgba(22,18,15,.98),rgba(12,10,8,.99));\n  box-shadow:0 -8px 30px rgba(0,0,0,.55);display:flex;flex-direction:column}\n.dock-main{display:flex;align-items:stretch;gap:16px;padding:8px 14px 2px}\n.dock-nav{flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;align-content:stretch}\n.dock-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:6px 4px;background:none;border:1px solid transparent;\n  border-bottom:2px solid transparent;cursor:pointer;color:var(--ink-dim);transition:.15s}\n.dock-item .dock-icon{font-size:15px;color:var(--gold)}\n.dock-item span{font-family:var(--serif);font-size:12px;letter-spacing:.08em}\n.dock-item small{font-size:9px;letter-spacing:.18em;color:var(--ink-mute)}\n.dock-item:hover{color:var(--ink);background:rgba(198,161,91,.05)}\n.dock-item.active{color:var(--gold-hi);border-bottom-color:var(--gold-hi);background:rgba(198,161,91,.08)}\n.dock-status{display:flex;align-items:center;gap:10px;padding:6px 16px;font-size:11px;color:var(--ink-dim);min-height:26px}\n.dock-status .sep{color:var(--ink-mute)}\n.dock-status .dot{width:6px;height:6px;border-radius:50%;background:#6E8B6B;box-shadow:0 0 6px rgba(110,139,107,.7)}\n.dock-status .dot.ok{background:#7FA678}\n.dock-status #st-root{max-width:34vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dock-status .calm{color:#A9C6A3}\n.dock-status .dirty{color:#E5C79A}\n.dock-status .muted{color:var(--ink-mute)}\n\n/* ---------- Toast / Modal ---------- */\n.toasts{position:fixed;right:18px;bottom:calc(var(--dock-h) + 14px);z-index:1000;display:flex;flex-direction:column;gap:8px;align-items:flex-end}\n.toast{padding:10px 14px;border:1px solid var(--line-strong);background:rgba(28,23,20,.97);color:var(--ink);\n  font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.5);max-width:420px;animation:slide .18s ease-out}\n.toast.ok{border-color:#6E8B6B}\n.toast.warn{border-color:var(--amber)}\n.toast.error{border-color:var(--red-hi)}\n.toast.gone{opacity:0;transform:translateY(6px);transition:.25s}\n@keyframes slide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n.modal-back{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:24px}\n.modal{width:min(560px,92vw);max-height:86vh;display:flex;flex-direction:column;border:1px solid var(--line-strong);\n  background:linear-gradient(165deg,#241D19,#171310);box-shadow:0 30px 80px rgba(0,0,0,.6)}\n.modal.wide{width:min(720px,94vw)}\n.modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line);font-family:var(--serif);letter-spacing:.08em}\n.modal-x{background:none;border:none;color:var(--ink-dim);font-size:20px;cursor:pointer;line-height:1}\n.modal-body{padding:16px 18px;overflow:auto;display:flex;flex-direction:column;gap:12px}\n.modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:12px 18px;border-top:1px solid var(--line)}\n\n/* ---------- \u6D45\u8272\u4E3B\u9898 ---------- */\n:root[data-theme="light"]{--bg:#EDE6DA;--panel:#F7F1E6;--card:#FBF6EC;--ink:#2C241D;--ink-dim:#6B5D4D;--ink-mute:#9A8A76;\n  --line:rgba(140,110,60,.3);--line-strong:rgba(140,110,60,.6)}\n\n/* ============================ v0.3 \u6280\u80FD\u7F16\u8F91 ============================ */\n.skill-wrap {\n  display: grid;\n  grid-template-columns: 232px minmax(0, 1fr) 268px;\n  gap: 12px;\n  min-height: 0;\n  height: calc(100% - 8px);\n}\n.skill-wrap > .panel { min-height: 0; display: flex; flex-direction: column; }\n.panel-search { padding: 0 10px 8px; }\n.panel-search .search {\n  width: 100%;\n  background: #14110F;\n  border: 1px solid var(--line, #3A3128);\n  color: var(--text, #E8DCC6);\n  font: inherit;\n  font-size: 12px;\n  padding: 6px 9px;\n  outline: none;\n}\n.panel-search .search:focus { border-color: var(--gold, #C6A15B); }\n.panel-foot.two { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }\n.skill-item .item-main { min-width: 0; }\n.skill-item .item-main small { display: block; color: var(--muted, #A79780); font-size: 11px; }\n.module-list .mods { display: flex; flex-direction: column; gap: 8px; overflow: auto; padding: 4px 10px 10px; }\n.module-item {\n  border: 1px solid #3A3128;\n  background: #1A1613;\n  padding: 8px 9px;\n  cursor: grab;\n  transition: border-color .15s, transform .15s;\n}\n.module-item:hover { border-color: var(--gold, #C6A15B); }\n.module-item:active { cursor: grabbing; transform: scale(.995); }\n.module-item .m-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }\n.module-item .m-head strong { font-size: 12px; letter-spacing: .04em; }\n.module-item .m-desc { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--muted, #A79780); }\n.skill-main .panel-head.skill-head { gap: 8px; flex-wrap: wrap; }\n.skill-title { display: flex; flex-direction: column; min-width: 0; }\n.skill-title strong { font-size: 13px; letter-spacing: .06em; }\n.skill-title small { color: var(--muted, #A79780); font-size: 11px; }\n.skill-body { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 12px; padding: 10px; min-height: 0; overflow: auto; }\n.info-card, .editor-card { border: 1px solid #3A3128; background: #1A1613; padding: 10px; min-width: 0; }\n.col-title { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--gold, #C6A15B); margin-bottom: 8px; }\n.info-card .grid-2 { gap: 8px; }\n.info-card .field span { font-size: 11px; }\n.info-card input, .info-card select { font-size: 12px; padding: 5px 7px; }\n.tabs { display: flex; gap: 4px; margin-bottom: 10px; border-bottom: 1px solid #3A3128; }\n.tab {\n  background: transparent; border: 0; color: var(--muted, #A79780);\n  font: inherit; font-size: 12px; letter-spacing: .1em; padding: 7px 12px; cursor: pointer;\n  border-bottom: 2px solid transparent;\n}\n.tab.active { color: var(--text, #E8DCC6); border-bottom-color: var(--gold, #C6A15B); }\n.code-wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }\n.code-col, .coin-col { min-width: 0; }\n.drop-zone {\n  min-height: 64px;\n  border: 1px dashed #4A3F33;\n  background: #14110F;\n  padding: 8px;\n  display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start;\n}\n.drop-zone.drop-hot { border-color: var(--gold, #C6A15B); background: #1F1A15; }\n.dz-hint { color: #6E6152; font-size: 11.5px; line-height: 64px; margin: 0 auto; }\n.chip {\n  display: inline-flex; align-items: center; gap: 4px;\n  background: #2A231C; border: 1px solid #4A3F33; color: var(--text, #E8DCC6);\n  font-size: 11.5px; padding: 4px 4px 4px 8px; max-width: 100%;\n}\n.chip-x {\n  border: 0; background: transparent; color: var(--muted, #A79780);\n  cursor: pointer; font-size: 13px; line-height: 1; padding: 0 3px;\n}\n.chip-x:hover { color: var(--red, #8C1F2B); }\n.coin-col { display: flex; flex-direction: column; gap: 8px; }\n.coin-card { border: 1px solid #3A3128; background: #1A1613; padding: 8px; }\n.coin-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }\n.coin-head select, .coin-head input { font-size: 12px; padding: 3px 6px; }\n.inline-field { display: inline-flex; align-items: center; gap: 5px; color: var(--muted, #A79780); font-size: 11.5px; }\n.inline-field input { width: 68px; }\n.desc-wrap { display: flex; flex-direction: column; gap: 8px; }\n.desc-input {\n  width: 100%; min-height: 128px; resize: vertical;\n  background: #14110F; border: 1px solid #3A3128; color: var(--text, #E8DCC6);\n  font: inherit; font-size: 12.5px; line-height: 1.7; padding: 9px 10px; outline: none;\n}\n.desc-input:focus { border-color: var(--gold, #C6A15B); }\n.desc-preview {\n  border: 1px solid #2E2720; background: #14110F; padding: 9px 10px;\n  font-size: 12.5px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; min-height: 40px;\n}\n.desc-check { font-size: 11.5px; letter-spacing: .04em; padding: 6px 9px; border-left: 2px solid; }\n.desc-check.ok { color: #7E9B7A; border-color: #6E8B6B; background: #16201A; }\n.desc-check.bad { color: #E0A85C; border-color: #C98A3C; background: #241B12; }\n.kw-timing { color: #7FB6C8; }\n.kw-buff { color: #E3C07E; }\n.kw-bad { color: #E0A85C; background: #3A2A14; border-bottom: 1px dashed #C98A3C; }\n.game-text { border: 1px solid #2E2720; background: #14110F; padding: 6px 9px; font-size: 11.5px; }\n.game-text summary { cursor: pointer; color: var(--muted, #A79780); letter-spacing: .05em; }\n.game-text pre { margin: 8px 0 0; white-space: pre-wrap; word-break: break-word; color: #C9B99A; font-family: inherit; }\n.check-row { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border-bottom: 1px solid #2A231C; font-size: 12px; }\n.check-row small { color: var(--muted, #A79780); margin-left: auto; }\n.import-tabs { margin-bottom: 12px; }\n/* ===== v0.3.1 \u6280\u80FD\u7F16\u8F91\u5E03\u5C40\u4FEE\u6B63\uFF08\u56FA\u5B9A\u9AD8\u5EA6 + \u5185\u90E8\u6EDA\u52A8 + \u7A84\u5C4F\u9002\u914D\uFF09 ===== */\n.layout.edit{height:100%;min-height:0}\n.layout.edit > .panel{min-height:0}\n.edit-pane:has(.skill-wrap){\n  overflow:hidden!important;height:100%;min-height:0;\n  display:flex;flex-direction:column;padding:12px 14px 10px;\n}\n.skill-wrap{\n  flex:1 1 auto;height:auto;min-height:0;\n  grid-template-columns:minmax(172px,206px) minmax(0,1fr) minmax(196px,236px);\n}\n.skill-wrap > .panel{min-height:0;overflow:hidden}\n.skill-main{min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}\n.skill-body{\n  min-height:0;overflow:hidden;\n  grid-template-columns:minmax(206px,278px) minmax(0,1fr);\n}\n.info-card,.editor-card{min-height:0;min-width:0;overflow:auto}\n.editor-card{display:flex;flex-direction:column}\n.editor-card .code-wrap,.editor-card .desc-wrap{flex:1 1 auto;min-height:0;overflow:auto}\n.desc-preview{max-height:160px;overflow:auto}\n@media (max-width:1180px){\n  .layout.edit{grid-template-columns:minmax(150px,180px) minmax(0,1fr)}\n  .skill-wrap{grid-template-columns:minmax(140px,164px) minmax(0,1fr) minmax(160px,186px)}\n  /* \u4E2D\u680F\u53D8\u7A84\u65F6\uFF0C\u57FA\u7840\u4FE1\u606F\u4E0E\u4EE3\u7801/\u63CF\u8FF0\u6539\u4E3A\u4E0A\u4E0B\u53E0\u653E\uFF0C\u4FDD\u8BC1\u7F16\u8F91\u533A\u6709\u5B8C\u6574\u5BBD\u5EA6 */\n  .skill-body{display:flex;flex-direction:column;grid-template-columns:none;overflow:auto;align-items:stretch}\n  .info-card{flex:0 0 auto;height:auto;overflow:visible}\n  .editor-card{flex:0 0 auto;min-height:340px;overflow:visible}\n}\n@media (max-width:900px){\n  .layout.edit{grid-template-columns:minmax(0,1fr)}\n  .layout.edit > .panel.list-panel{display:none}\n}\n\n/* ===== v0.3.2 \u786C\u5E01\u63CF\u8FF0\u533A + Mod \u7BA1\u7406\u4E09\u680F\u72EC\u7ACB\u6EDA\u52A8 ===== */\n.desc-block{margin-bottom:10px}\n.desc-block-head{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}\n.desc-block-head strong{font-family:var(--serif);font-size:13px;color:var(--gold-hi);letter-spacing:.06em}\n.desc-block-head .muted{font-size:11px}\n.coin-desc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}\n.coin-desc-card{border:1px solid var(--line);background:rgba(0,0,0,.16);padding:8px;min-width:0}\n.coin-desc-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px;font-size:11px}\n.cd-tag{color:var(--gold);letter-spacing:.12em;font-size:10px}\n.coin-desc-card .desc-input{min-height:60px}\n.coin-desc-card .desc-preview{margin-top:6px;max-height:88px;overflow:auto}\n.coin-desc-card .desc-check{margin-top:6px}\n\n/* Mod \u7BA1\u7406\uFF1A\u4E09\u680F\u5404\u81EA\u6EDA\u52A8\uFF1B\u5E95\u90E8\u6309\u94AE\u5E38\u9A7B\u9762\u677F\u5E95 */\n.layout.mods{height:100%;min-height:0;grid-template-rows:minmax(0,1fr)}\n.layout.mods > .panel{min-height:0;overflow:hidden}\n.detail-pane{overflow:hidden!important;display:flex;flex-direction:column;min-height:0}\n.detail-pane .detail-head{flex:0 0 auto}\n.detail-pane .detail-body{flex:1 1 auto;min-height:0;overflow:auto}\n.detail-pane .detail-actions{flex:0 0 auto}\n\n/* ======================= v0.4 \u6A21\u5757 / \u88AB\u52A8 / Buff ======================= */\n\n.module-wrap{display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px;min-height:0;flex:1 1 auto}\n.module-wrap > .panel{min-height:0;overflow:hidden;display:flex;flex-direction:column}\n.module-form{min-height:0;overflow:hidden;display:flex;flex-direction:column}\n.module-form .panel-body{flex:1 1 auto;min-height:0;overflow:auto}\n.module-form .form{max-width:680px}\n.code-simple{grid-template-columns:minmax(0,1fr)}\n.code-simple .code-col{min-height:180px}\n.passive-zone,.buff-zone{min-height:120px}\n.import-list{max-height:260px;overflow:auto;border:1px solid rgba(198,161,91,.18);background:var(--card)}\n.import-row{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;padding:8px 10px;background:none;border:0;border-bottom:1px solid rgba(198,161,91,.1);color:var(--text);cursor:pointer;text-align:left}\n.import-row:hover{background:rgba(198,161,91,.08)}\n.import-row strong{font-size:13px}\n.import-row small{color:var(--muted);font-size:11px}\n.field.check{flex-direction:row;align-items:center;gap:8px}\n.field.check input{width:auto}\n\n/* \u6307\u9488\u62D6\u62FD\uFF08\u6A21\u5757 \u2192 \u7F6E\u5165\u533A\uFF09 */\n.module-item.selected { border-color: var(--gold, #C6A15B); box-shadow: 0 0 0 1px var(--gold, #C6A15B) inset; }\nbody.drag-active { cursor: grabbing; user-select: none; }\nbody.drag-active .module-item { cursor: grabbing; }\n.drag-ghost {\n  position: fixed; z-index: 2000; pointer-events: none;\n  max-width: 260px; padding: 6px 10px;\n  background: #241D19; border: 1px solid var(--gold, #C6A15B);\n  color: #E8DCC6; font-size: 12px; letter-spacing: .04em;\n  box-shadow: 0 6px 18px rgba(0,0,0,.55); opacity: .95;\n}\n.drop-zone.drop-hot { border-color: var(--gold, #E3C07E); background: rgba(198,161,91,.08); }\n\n/* 1280\u20131600 \u5BBD\u5EA6\uFF1A\u538B\u7F29\u4E09\u680F\uFF0C\u907F\u514D\u4E2D\u95F4\u7F16\u8F91\u533A\u88AB\u6324\u6210\u7EC6\u6761 */\n@media (min-width: 1181px) and (max-width: 1600px) {\n  .layout.edit { grid-template-columns: 240px minmax(0, 1fr); }\n  .skill-wrap { grid-template-columns: 200px minmax(0, 1fr) 232px; }\n  .skill-body { grid-template-columns: minmax(190px, 220px) minmax(0, 1fr); }\n  .code-wrap { grid-template-columns: minmax(0, 1fr); }\n}\n\n/* \u63CF\u8FF0\u5173\u952E\u8BCD\u56DB\u7C7B\u9AD8\u4EAE\uFF1A\u65F6\u70B9 / \u6280\u80FD\u6807\u7B7E / Buff / \u5173\u952E\u8BCD */\n.kw-tag{color:#9FC7A0}\n.kw-kw{color:#C9A6D6}\n' };

// src/assets.mjs
var VIRTUAL = null;
function setAssets(map) {
  VIRTUAL = map || null;
}
function assetText(key) {
  if (!VIRTUAL) return null;
  const v = VIRTUAL[key];
  return typeof v === "string" ? v : null;
}

// src/main.mjs
var import_node_child_process = require("node:child_process");

// src/paths.mjs
var import_node_path = require("node:path");
var import_node_url = require("node:url");
var import_meta = {};
var IS_SEA = process.env.LETHE_WB_SEA === "1" || !/node(\.exe)?$/i.test(process.execPath);
var APP_ROOT = process.env.LETHE_WB_APP_ROOT ? (0, import_node_path.resolve)(process.env.LETHE_WB_APP_ROOT) : IS_SEA ? (0, import_node_path.dirname)(process.execPath) : (0, import_node_path.resolve)((0, import_node_path.dirname)((0, import_node_url.fileURLToPath)(import_meta.url)), "..");
var SRC_DIR = (() => {
  try {
    return (0, import_node_path.dirname)((0, import_node_url.fileURLToPath)(import_meta.url));
  } catch {
    return APP_ROOT;
  }
})();
var HOME = process.env.USERPROFILE || process.env.HOME || process.cwd();
var USER_DATA_DIR = process.env.LOCALAPPDATA ? (0, import_node_path.join)(process.env.LOCALAPPDATA, "LetheWorkbench") : (0, import_node_path.join)(HOME, ".lethe-workbench");
var LOG_DIR = (0, import_node_path.join)(USER_DATA_DIR, "logs");
var RUNTIME_DIR = (0, import_node_path.join)(USER_DATA_DIR, "runtime");
var DATA_DIRS = [
  process.env.LETHE_WB_HOME && (0, import_node_path.resolve)(process.env.LETHE_WB_HOME),
  APP_ROOT,
  USER_DATA_DIR
].filter(Boolean);
var DEFAULT_CONFIG = {
  version: 1,
  gameRoot: "",
  letheRoot: "",
  recentRoots: [],
  theme: "dark"
};
function normalizePath(p) {
  return (0, import_node_path.resolve)(String(p || "")).replace(/[\\/]+$/, "");
}
function pathKey(p) {
  return normalizePath(p).toLowerCase().split(import_node_path.sep).join("/");
}

// src/config.mjs
var fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = require("node:path");
var CONFIG_NAME = "config.json";
function configCandidates() {
  const extra = process.env.LETHE_WB_HOME ? [normalizePath(process.env.LETHE_WB_HOME)] : [];
  const dirs = IS_SEA ? [...extra, USER_DATA_DIR, APP_ROOT, ...DATA_DIRS] : [...extra, APP_ROOT, USER_DATA_DIR, ...DATA_DIRS];
  const seen = /* @__PURE__ */ new Set();
  const out2 = [];
  for (const dir of dirs) {
    if (!dir) continue;
    const p = (0, import_node_path2.join)(dir, CONFIG_NAME);
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out2.push(p);
  }
  return out2;
}
function loadConfig() {
  for (const p of configCandidates()) {
    try {
      const data = JSON.parse(fs2.readFileSync(p, "utf8"));
      return { ...DEFAULT_CONFIG, ...data, configPath: p };
    } catch {
    }
  }
  return { ...DEFAULT_CONFIG, configPath: configCandidates()[0] };
}
function writeTo(p, cfg) {
  fs2.mkdirSync((0, import_node_path2.join)(p, ".."), { recursive: true });
  if (fs2.existsSync(p)) {
    try {
      fs2.copyFileSync(p, `${p}.bak`);
    } catch {
    }
  }
  const tmp = `${p}.tmp-${process.pid}`;
  fs2.writeFileSync(tmp, JSON.stringify(cfg, null, 2), "utf8");
  fs2.renameSync(tmp, p);
  return p;
}
function saveConfig(patch) {
  const cfg = { ...loadConfig(), ...patch };
  delete cfg.configPath;
  const order = [cfg.configPath, ...configCandidates()].filter(Boolean);
  let lastErr = null;
  for (const p of order) {
    try {
      return { ...cfg, configPath: writeTo(p, cfg) };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("\u65E0\u6CD5\u5199\u5165\u914D\u7F6E\u6587\u4EF6");
}
function rememberRoot(root) {
  const cfg = loadConfig();
  const list = [normalizePath(root), ...(cfg.recentRoots || []).map(normalizePath)].filter((v, i, a) => v && a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i).slice(0, 8);
  return saveConfig({ recentRoots: list });
}
function configPath() {
  return loadConfig().configPath;
}

// src/locate.mjs
var fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = require("node:path");
var MARK_DIRS = ["BepInEx/plugins/Lethe", "plugins/Lethe"];
var HINTS = /lethe|limbus|边狱|私服|mod/i;
function dirExists(p) {
  try {
    return fs3.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
function fileExists(p) {
  try {
    return fs3.statSync(p).isFile();
  } catch {
    return false;
  }
}
function isLetheRoot(dir) {
  return dirExists((0, import_node_path3.join)(dir, "mods")) || dirExists((0, import_node_path3.join)(dir, "dumpedData"));
}
function findUp(start, target, maxDepth = 6) {
  let cur = start;
  for (let i = 0; i < maxDepth; i += 1) {
    if (fileExists((0, import_node_path3.join)(cur, target)) || dirExists((0, import_node_path3.join)(cur, target))) return cur;
    const up = (0, import_node_path3.dirname)(cur);
    if (up === cur) break;
    cur = up;
  }
  return "";
}
function inspectRoot(input) {
  const given = normalizePath(input);
  let letheRoot = "";
  let gameRoot = "";
  for (const rel of MARK_DIRS) {
    const p = (0, import_node_path3.join)(given, ...rel.split("/"));
    if (dirExists(p)) {
      letheRoot = p;
      gameRoot = given;
      break;
    }
  }
  if (!letheRoot && isLetheRoot(given)) {
    letheRoot = given;
    gameRoot = findUp((0, import_node_path3.dirname)(given), "LimbusCompany.exe") || findUp((0, import_node_path3.dirname)(given), "LimbusCompany_Data") || "";
  }
  if (!letheRoot) {
    if (isLetheRoot((0, import_node_path3.dirname)(given)) && !isLetheRoot(given)) {
      letheRoot = (0, import_node_path3.dirname)(given);
      gameRoot = findUp((0, import_node_path3.dirname)(letheRoot), "LimbusCompany.exe") || "";
    }
  }
  const marks = {
    lethe: Boolean(letheRoot),
    mods: letheRoot ? dirExists((0, import_node_path3.join)(letheRoot, "mods")) : false,
    dumpedData: letheRoot ? dirExists((0, import_node_path3.join)(letheRoot, "dumpedData")) : false,
    template: letheRoot ? dirExists((0, import_node_path3.join)(letheRoot, "ModTemplate")) : false,
    exe: Boolean(findUp(given, "LimbusCompany.exe", 3)),
    data: Boolean(findUp(given, "LimbusCompany_Data", 3))
  };
  let score = 0;
  if (marks.lethe) score += 4;
  if (marks.mods) score += 3;
  if (marks.dumpedData) score += 2;
  if (marks.template) score += 1;
  if (marks.exe) score += 2;
  if (marks.data) score += 1;
  return {
    input: given,
    acceptable: Boolean(letheRoot) && score >= 6,
    score,
    letheRoot,
    gameRoot: gameRoot || (letheRoot ? (0, import_node_path3.dirname)((0, import_node_path3.dirname)(letheRoot)) : ""),
    modsDir: letheRoot ? (0, import_node_path3.join)(letheRoot, "mods") : "",
    dumpedData: letheRoot ? (0, import_node_path3.join)(letheRoot, "dumpedData") : "",
    modCount: letheRoot && dirExists((0, import_node_path3.join)(letheRoot, "mods")) ? fs3.readdirSync((0, import_node_path3.join)(letheRoot, "mods"), { withFileTypes: true }).filter((d) => d.isDirectory()).length : 0,
    marks
  };
}
function drives() {
  const out2 = [];
  for (let c = 67; c <= 90; c += 1) {
    const d = `${String.fromCharCode(c)}:\\`;
    try {
      fs3.statSync(d);
      out2.push(d);
    } catch {
    }
  }
  return out2;
}
var scanStats = { drives: 0, visited: 0, errors: 0, budgetMs: 0, reason: "" };
function scanForLethe({ maxDepth = 3, budgetMs = 12e3, onProgress } = {}) {
  const started = Date.now();
  const found = [];
  const roots = drives();
  scanStats.drives = roots.length;
  scanStats.visited = 0;
  scanStats.errors = 0;
  scanStats.budgetMs = budgetMs;
  scanStats.reason = "";
  const queue = roots.map((d) => ({ dir: d, depth: 0 }));
  while (queue.length) {
    if (Date.now() - started > budgetMs) {
      scanStats.reason = "timeout";
      break;
    }
    const { dir, depth } = queue.shift();
    let entries = [];
    scanStats.visited += 1;
    try {
      entries = fs3.readdirSync(dir, { withFileTypes: true });
    } catch {
      scanStats.errors += 1;
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const p = (0, import_node_path3.join)(dir, e.name);
      if (e.name.startsWith("$") || e.name === "Windows" || e.name === "System Volume Information") continue;
      if (isLetheRoot(p) || dirExists((0, import_node_path3.join)(p, "BepInEx", "plugins", "Lethe"))) {
        found.push(inspectRoot(p));
        onProgress?.(found.length, p);
      } else if (depth < maxDepth && HINTS.test(e.name)) {
        queue.push({ dir: p, depth: depth + 1 });
      }
    }
  }
  return found;
}
function locate({ explicit, config = {}, quick = false, budgetMs = 8e3, onProgress } = {}) {
  const tried = [];
  const candidates = [];
  const push = (input, from) => {
    if (!input) return;
    if (!dirExists(String(input))) return;
    const p = normalizePath(input);
    if (!p) return;
    if (tried.some((t) => t.toLowerCase() === p.toLowerCase())) return;
    tried.push(p);
    const info = inspectRoot(p);
    info.from = from;
    candidates.push(info);
  };
  push(explicit, "explicit");
  const explicitOk = candidates.find((c) => c.from === "explicit" && c.acceptable);
  if (explicitOk) return { best: explicitOk, candidates, tried, scanned: false };
  push(config.letheRoot, "config.letheRoot");
  const configOk = candidates.find((c) => c.from === "config.letheRoot" && c.acceptable);
  if (configOk) return { best: configOk, candidates, tried, scanned: false };
  push(config.gameRoot, "config.gameRoot");
  for (const r of config.recentRoots || []) push(r, "recent");
  if (!quick) {
    for (const c of scanForLethe({ budgetMs, onProgress })) {
      if (!candidates.some((x) => x.letheRoot.toLowerCase() === c.letheRoot.toLowerCase())) {
        c.from = "scan";
        candidates.push(c);
      }
    }
  }
  const ranked = candidates.filter((c) => c.acceptable).sort((a, b) => b.score - a.score);
  return { best: ranked[0] || null, candidates, tried, scanned: !quick };
}

// src/lethe/mods.mjs
var fs7 = __toESM(require("node:fs"), 1);
var import_node_path7 = require("node:path");

// src/atomic.mjs
var fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = require("node:path");

// src/safety.mjs
var MAX_FILE_BYTES = 32 * 1024 * 1024;
var MAX_BODY_BYTES = 64 * 1024 * 1024;
var MAX_NAME_BYTES = 120;
var RESERVED = /* @__PURE__ */ new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`)
]);
var ILLEGAL = /[\\/:*?"<>|\u0000-\u001f]/;
var SafetyError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SafetyError";
    this.status = 400;
  }
};
function cleanName(raw, field = "\u540D\u79F0") {
  const name = String(raw ?? "").trim();
  if (!name) throw new SafetyError(`${field}\u4E0D\u80FD\u4E3A\u7A7A`);
  if (name === "." || name === "..") throw new SafetyError(`${field}\u4E0D\u5408\u6CD5\uFF1A${name}`);
  if (ILLEGAL.test(name)) throw new SafetyError(`${field}\u542B\u6709\u975E\u6CD5\u5B57\u7B26\uFF08\\ / : * ? " < > | \u6216\u63A7\u5236\u5B57\u7B26\uFF09`);
  if (/[. ]$/.test(name)) throw new SafetyError(`${field}\u4E0D\u80FD\u4EE5\u7A7A\u683C\u6216\u53E5\u70B9\u7ED3\u5C3E`);
  const base = name.split(".")[0].toUpperCase();
  if (RESERVED.has(base)) throw new SafetyError(`${field}\u4E0D\u80FD\u4F7F\u7528 Windows \u4FDD\u7559\u540D\uFF1A${base}`);
  if (Buffer.byteLength(name, "utf8") > MAX_NAME_BYTES) {
    throw new SafetyError(`${field}\u8FC7\u957F\uFF08\u6700\u591A ${MAX_NAME_BYTES} \u5B57\u8282\uFF09`);
  }
  return name;
}
function isInside(base, abs) {
  const b = pathKey(base);
  const a = pathKey(abs);
  return a === b || a.startsWith(b + "/");
}

// src/atomic.mjs
var BACKUP_DIRNAME = ".lethe-workbench";
var BACKUP_KEEP = 20;
function stamp(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}
function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs4.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}
function ensureDir(p) {
  fs4.mkdirSync(p, { recursive: true });
}
function writeFileAtomic(abs, content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), "utf8");
  if (buf.length > MAX_FILE_BYTES) throw new Error(`\u5355\u4E2A\u6587\u4EF6\u8D85\u8FC7\u4E0A\u9650\uFF08${MAX_FILE_BYTES} \u5B57\u8282\uFF09`);
  ensureDir((0, import_node_path4.dirname)(abs));
  const tmp = (0, import_node_path4.join)((0, import_node_path4.dirname)(abs), `.${(0, import_node_path4.basename)(abs)}.tmp-${process.pid}-${Date.now()}`);
  const fd = fs4.openSync(tmp, "w");
  try {
    fs4.writeSync(fd, buf);
    fs4.fsyncSync(fd);
  } finally {
    fs4.closeSync(fd);
  }
  try {
    fs4.renameSync(tmp, abs);
  } catch (err) {
    try {
      fs4.rmSync(tmp, { force: true });
    } catch {
    }
    throw err;
  }
  return abs;
}
function pruneRollback(rootDir, keep = BACKUP_KEEP) {
  const base = (0, import_node_path4.join)(rootDir, BACKUP_DIRNAME, "journal", "rollback");
  if (!fs4.existsSync(base)) return [];
  const removed = [];
  for (const mod of fs4.readdirSync(base, { withFileTypes: true })) {
    if (!mod.isDirectory()) continue;
    const dir = (0, import_node_path4.join)(base, mod.name);
    let runs = [];
    try {
      runs = fs4.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse();
    } catch {
      continue;
    }
    for (const old of runs.slice(keep)) {
      fs4.rmSync((0, import_node_path4.join)(dir, old), { recursive: true, force: true });
      removed.push(`${mod.name}/${old}`);
    }
  }
  return removed;
}
function writeFilesTransactional({ modDir: modDir2, files, root, mod, backup = true }) {
  if (!Array.isArray(files) || !files.length) return { written: [], backups: [], snapshot: null, changes: [] };
  const journalDir2 = (0, import_node_path4.join)(root, BACKUP_DIRNAME, "journal");
  const rollbackDir = (0, import_node_path4.join)(journalDir2, "rollback", mod || "mod", stamp());
  const staged = [];
  const backups = [];
  for (const f of files) {
    const rel = String(f.rel).split("/").join(import_node_path4.sep);
    const abs = (0, import_node_path4.join)(modDir2, rel);
    const buf = Buffer.isBuffer(f.content) ? f.content : Buffer.from(String(f.content), "utf8");
    if (buf.length > MAX_FILE_BYTES) throw new Error(`\u6587\u4EF6\u8FC7\u5927\uFF1A${f.rel}`);
    let before = null;
    try {
      if (fs4.existsSync(abs)) before = fs4.readFileSync(abs);
    } catch {
      before = null;
    }
    ensureDir((0, import_node_path4.dirname)(abs));
    const tmp = (0, import_node_path4.join)((0, import_node_path4.dirname)(abs), `.${(0, import_node_path4.basename)(abs)}.tmp-${process.pid}-${Date.now()}-${staged.length}`);
    const fd = fs4.openSync(tmp, "w");
    try {
      fs4.writeSync(fd, buf);
      fs4.fsyncSync(fd);
    } finally {
      fs4.closeSync(fd);
    }
    staged.push({ abs, tmp, rel: f.rel, before, after: buf, fresh: before === null });
  }
  if (backup) {
    for (const s of staged) {
      if (s.before === null) continue;
      const dest = (0, import_node_path4.join)(rollbackDir, s.rel.split("/").join(import_node_path4.sep));
      ensureDir((0, import_node_path4.dirname)(dest));
      fs4.copyFileSync(s.abs, dest);
      backups.push(dest);
    }
  }
  const done = [];
  try {
    for (const s of staged) {
      fs4.renameSync(s.tmp, s.abs);
      done.push(s);
    }
  } catch (err) {
    for (const s of done.slice().reverse()) {
      try {
        if (s.before === null) fs4.rmSync(s.abs, { force: true });
        else fs4.writeFileSync(s.abs, s.before);
      } catch {
      }
    }
    for (const s of staged) {
      try {
        fs4.rmSync(s.tmp, { force: true });
      } catch {
      }
    }
    throw err;
  }
  pruneRollback(root);
  return {
    written: staged.map((s) => s.rel),
    backups,
    changes: staged.map((s) => ({
      rel: s.rel,
      before: s.before === null ? null : s.before.toString("utf8"),
      after: s.after.toString("utf8"),
      fresh: s.fresh
    }))
  };
}

// src/lethe/layout.mjs
var fs5 = __toESM(require("node:fs"), 1);
var import_node_path5 = require("node:path");
var LAYOUT = {
  personality: [
    "custom_limbus_data/personality",
    "custom_limbus_locale/EN/personalityList"
  ],
  skill: [
    "custom_limbus_data/skill",
    "custom_limbus_locale/EN/skillList"
  ],
  passive: [
    "custom_limbus_data/passive",
    "custom_limbus_data/personality-passive",
    "custom_limbus_locale/EN/passiveList"
  ],
  buff: [
    "custom_limbus_data/buff",
    "custom_buffs",
    "custom_limbus_locale/EN/bufList",
    "custom_limbus_locale/EN/keywordList"
  ],
  appearance: [
    "custom_limbus_data/personality",
    "custom_sprites",
    "custom_appearance"
  ]
};
function layoutFor(kind) {
  return LAYOUT[kind] || [];
}
function ensureLayout(modDir2, kind) {
  const created = [];
  for (const rel of layoutFor(kind)) {
    const abs = (0, import_node_path5.join)(modDir2, ...rel.split("/"));
    if (!fs5.existsSync(abs)) {
      fs5.mkdirSync(abs, { recursive: true });
      created.push(rel);
    }
  }
  return created;
}

// src/lethe/state.mjs
var fs6 = __toESM(require("node:fs"), 1);
var import_node_path6 = require("node:path");
var STATE_NAME = "state.json";
var DEFAULT_EDITOR_NAME = "\u4F46\u4E01";
function workbenchDir(letheRoot) {
  return (0, import_node_path6.join)(letheRoot, BACKUP_DIRNAME);
}
function statePath(letheRoot) {
  return (0, import_node_path6.join)(workbenchDir(letheRoot), STATE_NAME);
}
function disabledModsDir(letheRoot) {
  return (0, import_node_path6.join)(workbenchDir(letheRoot), "disabled", "mods");
}
function backupsRoot(letheRoot) {
  return (0, import_node_path6.join)(workbenchDir(letheRoot), "backups");
}
function userBackupsDir(letheRoot) {
  return (0, import_node_path6.join)(backupsRoot(letheRoot), "\u7528\u6237\u4FDD\u5B58");
}
function autoBackupsDir(letheRoot) {
  return (0, import_node_path6.join)(backupsRoot(letheRoot), "\u81EA\u52A8\u4FDD\u5B58");
}
function journalDir(letheRoot) {
  return (0, import_node_path6.join)(workbenchDir(letheRoot), "journal");
}
function dllBackupsDir(letheRoot) {
  return (0, import_node_path6.join)(workbenchDir(letheRoot), "backups", "DLL");
}
function readState(letheRoot) {
  const st = readJson(statePath(letheRoot), null);
  return {
    version: 2,
    disabledMods: {},
    disabledDlls: {},
    editorName: DEFAULT_EDITOR_NAME,
    ...st || {}
  };
}
function writeState(letheRoot, state) {
  fs6.mkdirSync(workbenchDir(letheRoot), { recursive: true });
  writeFileAtomic(statePath(letheRoot), JSON.stringify(state, null, 2));
  return state;
}
function updateState(letheRoot, fn) {
  const next = fn(readState(letheRoot));
  return writeState(letheRoot, next);
}
function sessionMarkerPath(letheRoot) {
  return (0, import_node_path6.join)(workbenchDir(letheRoot), "session.json");
}
function markRunning(letheRoot) {
  if (!letheRoot) return null;
  fs6.mkdirSync(workbenchDir(letheRoot), { recursive: true });
  const prev = readJson(sessionMarkerPath(letheRoot), null);
  const next = { pid: process.pid, startedAt: (/* @__PURE__ */ new Date()).toISOString(), running: true, unclean: Boolean(prev && prev.running) };
  writeFileAtomic(sessionMarkerPath(letheRoot), JSON.stringify(next, null, 2));
  return next;
}
function markCleanExit(letheRoot) {
  if (!letheRoot) return;
  const prev = readJson(sessionMarkerPath(letheRoot), null);
  if (!prev) return;
  writeFileAtomic(sessionMarkerPath(letheRoot), JSON.stringify({ ...prev, running: false, exitedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2));
}
function readSessionMarker(letheRoot) {
  if (!letheRoot) return null;
  return readJson(sessionMarkerPath(letheRoot), null);
}

// src/lethe/mods.mjs
function modsRoot(letheRoot) {
  return (0, import_node_path7.join)(letheRoot, "mods");
}
function resolveModDir(letheRoot, name) {
  const clean = cleanName(name, "Mod \u540D\u79F0");
  const active = (0, import_node_path7.join)(modsRoot(letheRoot), clean);
  if (fs7.existsSync(active)) return { dir: active, disabled: false, name: clean };
  const off = (0, import_node_path7.join)(disabledModsDir(letheRoot), clean);
  if (fs7.existsSync(off)) return { dir: off, disabled: true, name: clean };
  throw new SafetyError("Mod \u4E0D\u5B58\u5728\uFF1A" + name);
}
function modDirSafe(letheRoot, name) {
  return resolveModDir(letheRoot, name).dir;
}
function entitiesOf(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.list)) return data.list;
  if (data && typeof data === "object" && data.id != null) return [data];
  return [];
}
function localeEntriesOf(data) {
  const out2 = [];
  if (!data || typeof data !== "object") return out2;
  if (Array.isArray(data.list)) {
    for (const entry of data.list) {
      if (entry && entry.id != null) out2.push({ key: String(entry.id), entry });
    }
    return out2;
  }
  for (const [key, entry] of Object.entries(data)) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) out2.push({ key, entry });
  }
  return out2;
}
function localeCategory(dirName) {
  return String(dirName).replace(/List$/, "");
}
function jsonFiles(dir) {
  let out2 = [];
  let entries = [];
  try {
    entries = fs7.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out2;
  }
  for (const e of entries) {
    const p = (0, import_node_path7.join)(dir, e.name);
    if (e.isDirectory()) out2 = out2.concat(jsonFiles(p));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) out2.push(p);
  }
  return out2;
}
function relOf(modDirPath, abs) {
  return abs.slice(modDirPath.length + 1).split("\\").join("/");
}
function sizeOf(dir) {
  let total = 0;
  let count = 0;
  const walk2 = (p) => {
    let entries = [];
    try {
      entries = fs7.readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = (0, import_node_path7.join)(p, e.name);
      if (e.isDirectory()) walk2(abs);
      else if (e.isFile()) {
        try {
          total += fs7.statSync(abs).size;
          count += 1;
        } catch {
        }
      }
    }
  };
  walk2(dir);
  return { bytes: total, files: count };
}
function readModPayload(modDirPath) {
  const data = {};
  const locales = {};
  const dataRoot = (0, import_node_path7.join)(modDirPath, "custom_limbus_data");
  for (const catEntry of safeDirs(dataRoot)) {
    const cat = catEntry.name;
    for (const file of jsonFiles((0, import_node_path7.join)(dataRoot, cat))) {
      const parsed = readJson(file, null);
      if (!parsed) continue;
      const rel = relOf(modDirPath, file);
      entitiesOf(parsed).forEach((entity, index) => {
        if (!entity || entity.id == null) return;
        (data[cat] ||= []).push({ id: entity.id, rel, index, entity });
      });
    }
  }
  const localeRoot = (0, import_node_path7.join)(modDirPath, "custom_limbus_locale");
  for (const langEntry of safeDirs(localeRoot)) {
    const lang = langEntry.name;
    for (const catEntry of safeDirs((0, import_node_path7.join)(localeRoot, lang))) {
      const cat = localeCategory(catEntry.name);
      for (const file of jsonFiles((0, import_node_path7.join)(localeRoot, lang, catEntry.name))) {
        const parsed = readJson(file, null);
        if (!parsed) continue;
        const rel = relOf(modDirPath, file);
        for (const { key, entry } of localeEntriesOf(parsed)) {
          ((locales[lang] ||= {})[cat] ||= []).push({ key, rel, entry });
        }
      }
    }
  }
  const spritesDir = (0, import_node_path7.join)(modDirPath, "custom_sprites");
  const sprites = safeDirs(spritesDir).length ? fs7.readdirSync(spritesDir, { withFileTypes: true }).filter((d) => d.isFile() && /\.(png|webp|jpe?g|gif)$/i.test(d.name)).map((d) => d.name) : [];
  const personalities = (data.personality || []).map((p) => {
    const loc = findLocaleEntry(locales.EN?.personality, p.id) || {};
    return {
      id: p.id,
      rel: p.rel,
      name: loc.name || "",
      title: loc.title || "",
      desc: loc.desc || "",
      characterId: Number(p.entity.characterId) || 0,
      appearance: p.entity.appearance || "",
      rank: p.entity.rank,
      inLocale: Boolean(loc.name !== void 0)
    };
  });
  return { data, locales, sprites, personalities };
}
function safeDirs(p) {
  try {
    return fs7.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return [];
  }
}
function findLocaleEntry(list, id) {
  if (!Array.isArray(list)) return null;
  return list.find((x) => String(x.key) === String(id))?.entry || null;
}
function readModSummary(modDirPath, extra = {}) {
  const { bytes, files } = sizeOf(modDirPath);
  const cats = safeDirs((0, import_node_path7.join)(modDirPath, "custom_limbus_data")).map((d) => d.name);
  const personalityFiles = jsonFiles((0, import_node_path7.join)(modDirPath, "custom_limbus_data", "personality"));
  let personalityCount = 0;
  let personalities = [];
  if (personalityFiles.length) {
    const payload = readModPayload(modDirPath);
    personalityCount = payload.personalities.length;
    personalities = payload.personalities.slice(0, 12);
  }
  let mtime = 0;
  try {
    mtime = fs7.statSync(modDirPath).mtimeMs;
  } catch {
  }
  return {
    name: (0, import_node_path7.basename)(modDirPath),
    dir: modDirPath,
    enabled: extra.enabled !== false,
    bytes,
    files,
    categories: cats,
    personalityCount,
    personalities,
    mtime,
    disabledAt: extra.disabledAt || null
  };
}
function listMods(letheRoot) {
  const root = modsRoot(letheRoot);
  const state = readState(letheRoot);
  const out2 = [];
  for (const d of safeDirs(root)) {
    out2.push(readModSummary((0, import_node_path7.join)(root, d.name), { enabled: true }));
  }
  const disabledDir = disabledModsDir(letheRoot);
  for (const d of safeDirs(disabledDir)) {
    const meta = state.disabledMods[d.name] || {};
    out2.push(readModSummary((0, import_node_path7.join)(disabledDir, d.name), { enabled: false, disabledAt: meta.at || null }));
  }
  return out2.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}
function createMod(letheRoot, { name, folder }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dirName = cleanName(folder || modName, "\u6587\u4EF6\u5939\u540D");
  const root = modsRoot(letheRoot);
  fs7.mkdirSync(root, { recursive: true });
  const target = (0, import_node_path7.join)(root, dirName);
  if (fs7.existsSync(target)) throw new SafetyError(`\u5DF2\u5B58\u5728\u540C\u540D Mod \u6587\u4EF6\u5939\uFF1A${dirName}`);
  fs7.mkdirSync(target, { recursive: true });
  fs7.mkdirSync((0, import_node_path7.join)(target, "custom_limbus_data"), { recursive: true });
  fs7.mkdirSync((0, import_node_path7.join)(target, "custom_limbus_locale"), { recursive: true });
  return { name: modName, folder: dirName, dir: target, created: ["custom_limbus_data/", "custom_limbus_locale/"] };
}
function disableMod(letheRoot, name) {
  const dirName = cleanName(name, "Mod \u540D\u79F0");
  const src = (0, import_node_path7.join)(modsRoot(letheRoot), dirName);
  if (!fs7.existsSync(src) || !isInside(modsRoot(letheRoot), src)) throw new SafetyError(`Mod \u4E0D\u5B58\u5728\u6216\u672A\u542F\u7528\uFF1A${name}`);
  const dest = (0, import_node_path7.join)(disabledModsDir(letheRoot), dirName);
  if (fs7.existsSync(dest)) throw new SafetyError(`\u7981\u7528\u533A\u91CC\u5DF2\u6709\u540C\u540D\u76EE\u5F55\uFF1A${dirName}`);
  fs7.mkdirSync(disabledModsDir(letheRoot), { recursive: true });
  const files = sizeOf(src).files;
  try {
    fs7.renameSync(src, dest);
  } catch (err) {
    fs7.cpSync(src, dest, { recursive: true });
    fs7.rmSync(src, { recursive: true, force: true });
  }
  updateState(letheRoot, (st) => ({
    ...st,
    disabledMods: { ...st.disabledMods, [dirName]: { at: (/* @__PURE__ */ new Date()).toISOString(), files } }
  }));
  return { name: dirName, dir: dest, enabled: false };
}
function enableMod(letheRoot, name) {
  const dirName = cleanName(name, "Mod \u540D\u79F0");
  const src = (0, import_node_path7.join)(disabledModsDir(letheRoot), dirName);
  if (!fs7.existsSync(src)) throw new SafetyError(`\u7981\u7528\u533A\u91CC\u6CA1\u6709\u8FD9\u4E2A Mod\uFF1A${name}`);
  const dest = (0, import_node_path7.join)(modsRoot(letheRoot), dirName);
  if (fs7.existsSync(dest)) throw new SafetyError(`Mod \u76EE\u5F55\u5DF2\u5B58\u5728\u540C\u540D\u6587\u4EF6\u5939\uFF1A${dirName}`);
  try {
    fs7.renameSync(src, dest);
  } catch (err) {
    fs7.cpSync(src, dest, { recursive: true });
    fs7.rmSync(src, { recursive: true, force: true });
  }
  updateState(letheRoot, (st) => {
    const next = { ...st, disabledMods: { ...st.disabledMods } };
    delete next.disabledMods[dirName];
    return next;
  });
  return { name: dirName, dir: dest, enabled: true };
}

// src/lethe/dlls.mjs
var fs8 = __toESM(require("node:fs"), 1);
var import_node_path8 = require("node:path");
var DISABLED = ".disabled";
function pluginsDir(gameRoot) {
  return (0, import_node_path8.join)(gameRoot, "BepInEx", "plugins");
}
function listDlls(gameRoot) {
  const dir = pluginsDir(gameRoot);
  let entries = [];
  try {
    entries = fs8.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out2 = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const lower = e.name.toLowerCase();
    const enabled = lower.endsWith(".dll");
    const disabled = lower.endsWith(".dll.disabled");
    if (!enabled && !disabled) continue;
    const abs = (0, import_node_path8.join)(dir, e.name);
    let st = null;
    try {
      st = fs8.statSync(abs);
    } catch {
      continue;
    }
    out2.push({
      file: e.name,
      base: enabled ? e.name : e.name.slice(0, -DISABLED.length),
      enabled,
      size: st.size,
      mtime: st.mtimeMs,
      dir
    });
  }
  return out2.sort((a, b) => a.base.localeCompare(b.base, "en"));
}
function setDllEnabled(gameRoot, file, enabled) {
  const dir = pluginsDir(gameRoot);
  const name = cleanName(file, "DLL \u6587\u4EF6\u540D");
  if (!/\.dll(\.disabled)?$/i.test(name)) throw new SafetyError("\u53EA\u63A5\u53D7 .dll / .dll.disabled \u6587\u4EF6");
  const base = name.replace(/\.disabled$/i, "");
  const from = (0, import_node_path8.join)(dir, enabled ? `${base}.disabled` : base);
  const to = (0, import_node_path8.join)(dir, enabled ? base : `${base}.disabled`);
  if (!fs8.existsSync(from)) throw new SafetyError(`\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${from}`);
  if (fs8.existsSync(to)) throw new SafetyError(`\u76EE\u6807\u5DF2\u5B58\u5728\uFF1A${to}`);
  fs8.renameSync(from, to);
  updateState(dirnameOfLethe(dir), (st) => {
    const next = { ...st, disabledDlls: { ...st.disabledDlls } };
    if (enabled) delete next.disabledDlls[base];
    else next.disabledDlls[base] = { at: (/* @__PURE__ */ new Date()).toISOString() };
    return next;
  });
  return { file: to.split("\\").pop(), enabled };
}
function dirnameOfLethe(pluginsPath) {
  return (0, import_node_path8.join)(pluginsPath, "Lethe");
}

// src/lethe/personality.mjs
var fs10 = __toESM(require("node:fs"), 1);
var import_node_path10 = require("node:path");

// src/lethe/vanilla.mjs
var fs9 = __toESM(require("node:fs"), 1);
var import_node_path9 = require("node:path");
var cache = null;
var cacheKey = "";
function readJson2(p, fallback) {
  try {
    return JSON.parse(fs9.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}
function entitiesOf2(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.list)) return data.list;
  if (data && typeof data === "object") return [data];
  return [];
}
function dirFiles(dir) {
  try {
    return fs9.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".json")).map((d) => (0, import_node_path9.join)(dir, d.name));
  } catch {
    return [];
  }
}
function vanillaIndex(letheRoot) {
  const dump = (0, import_node_path9.join)(letheRoot, "dumpedData");
  const charFile = (0, import_node_path9.join)(dump, "limbus_locale", "EN", "characterList.json");
  const nameFile = (0, import_node_path9.join)(dump, "limbus_locale", "EN", "personalityList.json");
  const dataDir = (0, import_node_path9.join)(dump, "limbus_data", "personality");
  let key = dump;
  for (const p of [charFile, nameFile, dataDir]) {
    try {
      key += `|${p}:${fs9.statSync(p).mtimeMs}`;
    } catch {
      key += `|${p}:0`;
    }
  }
  if (cache && cacheKey === key) return cache;
  const characters = readJson2(charFile, {});
  const names = readJson2(nameFile, {});
  const personalities = [];
  for (const file of dirFiles(dataDir)) {
    const data = readJson2(file, null);
    for (const ent of entitiesOf2(data)) {
      if (!ent || ent.id == null) continue;
      const loc = names[String(ent.id)] || {};
      personalities.push({
        id: ent.id,
        characterId: Number(ent.characterId) || 0,
        appearance: ent.appearance || "",
        rank: ent.rank,
        hp: ent.hp,
        name: loc.name || "",
        title: loc.title || "",
        desc: loc.desc || "",
        file,
        entity: ent
      });
    }
  }
  cache = {
    dump,
    available: personalities.length > 0,
    characters: Object.values(characters).map((c) => ({ id: Number(c.id), name: c.name })),
    personalities,
    byId: new Map(personalities.map((p) => [String(p.id), p]))
  };
  cacheKey = key;
  return cache;
}
function vanillaTemplate(letheRoot, characterId) {
  const idx = vanillaIndex(letheRoot);
  return idx.personalities.find((p) => p.characterId === Number(characterId)) || idx.personalities[0] || null;
}

// src/lethe/personality.mjs
var ENTITY_FIELDS = [
  "appearance",
  "rank",
  "hp",
  "defCorrection",
  "minSpeedList",
  "maxSpeedList",
  "uniqueAttribute",
  "panicType",
  "panicSkillOnErosion",
  "attributeList",
  "defenseSkillIDList",
  "mentalConditionInfo",
  "breakSection",
  "resistInfo",
  "unitKeywordList",
  "associationList",
  "skillKeywordList",
  "slotWeightConditionList",
  "season"
];
var LOCALE_FIELDS = ["name", "title", "desc", "oneLineTitle", "acquisitionMethod", "skinItemTitle", "skinItemDesc"];
function pick(obj, fields) {
  const out2 = {};
  for (const f of fields) if (obj && Object.hasOwn(obj, f)) out2[f] = obj[f];
  return out2;
}
var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function getPersonality(letheRoot, name, id) {
  const dir = modDirSafe(letheRoot, name);
  const p = readModPayload(dir);
  const entry = (p.data.personality || []).find((x) => String(x.id) === String(id));
  if (!entry) return null;
  const loc = findLocaleEntry(p.locales.EN?.personality, id);
  return { id: entry.id, entity: entry.entity, locale: loc, rel: entry.rel, hasLocale: Boolean(loc) };
}
function listPersonalities(letheRoot, name) {
  const dir = modDirSafe(letheRoot, name);
  const p = readModPayload(dir);
  return (p.data.personality || []).map((x) => {
    const loc = findLocaleEntry(p.locales.EN?.personality, x.id) || {};
    return {
      id: x.id,
      characterId: Number(x.entity.characterId) || 0,
      name: loc.name || "",
      title: loc.title || "",
      appearance: x.entity.appearance || "",
      rank: x.entity.rank,
      skillIds: skillIdsOf(x.entity),
      hasLocale: loc.name !== void 0
    };
  });
}
function skillIdsOf(entity) {
  const ids = [];
  for (const a of entity?.attributeList || []) if (a && a.skillId != null) ids.push(a.skillId);
  for (const d of entity?.defenseSkillIDList || []) ids.push(d);
  return ids;
}
function savePersonality(letheRoot, { name, id, entity = {}, locale = {} }) {
  const dir = modDirSafe(letheRoot, name);
  const p = readModPayload(dir);
  const found = (p.data.personality || []).find((x) => String(x.id) === String(id));
  if (!found) throw new SafetyError(`\u4EBA\u683C\u4E0D\u5B58\u5728\uFF1A${id}`);
  const files = [];
  const labels = [];
  const entPatch = pick(entity, ENTITY_FIELDS);
  const entDiff = {};
  for (const [k, v] of Object.entries(entPatch)) {
    if (!same(found.entity?.[k], v)) entDiff[k] = v;
  }
  if (Object.keys(entDiff).length) {
    const doc = readJson((0, import_node_path10.join)(dir, found.rel), null);
    if (!doc) throw new SafetyError(`\u65E0\u6CD5\u8BFB\u53D6\u6570\u636E\u6587\u4EF6\uFF1A${found.rel}`);
    const arr = entitiesOf(doc);
    arr[found.index] = { ...arr[found.index], ...entDiff };
    files.push({ rel: found.rel, content: JSON.stringify(doc, null, 2) });
    labels.push(...Object.keys(entDiff));
  }
  const locEntry = findLocaleEntry(p.locales.EN?.personality, id);
  const locPatch = pick(locale, LOCALE_FIELDS);
  const locDiff = {};
  for (const [k, v] of Object.entries(locPatch)) {
    if (!locEntry || !same(locEntry[k], v)) locDiff[k] = v;
  }
  if (Object.keys(locDiff).length) {
    if (!locEntry) throw new SafetyError("\u8BE5\u4EBA\u683C\u6CA1\u6709\u672C\u5730\u5316\u6761\u76EE\uFF0C\u65E0\u6CD5\u5199\u6587\u672C\u5B57\u6BB5");
    const locRef = (p.locales.EN.personality || []).find((x) => String(x.key) === String(id));
    const doc = readJson((0, import_node_path10.join)(dir, locRef.rel), null);
    if (!doc || typeof doc !== "object") throw new SafetyError(`\u65E0\u6CD5\u8BFB\u53D6\u672C\u5730\u5316\u6587\u4EF6\uFF1A${locRef.rel}`);
    if (Array.isArray(doc.list)) {
      const hit = doc.list.find((e) => String(e.id) === String(id));
      if (!hit) throw new SafetyError("\u672C\u5730\u5316\u6761\u76EE\u4E22\u5931");
      Object.assign(hit, locDiff);
    } else {
      doc[String(id)] = { ...doc[String(id)] || {}, ...locDiff };
    }
    files.push({ rel: locRef.rel, content: JSON.stringify(doc, null, 2) });
    labels.push(...Object.keys(locDiff));
  }
  if (!files.length) return { changed: false, changes: [], fields: [] };
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: cleanName(name) });
  return { changed: true, fields: labels, ...result };
}
function nextId(letheRoot, name, characterId) {
  const dir = modDirSafe(letheRoot, name);
  const p = readModPayload(dir);
  const used = new Set((p.data.personality || []).map((x) => String(x.id)));
  const base = Number(characterId) * 1e4;
  for (let i = 501; i < 1e3; i += 1) {
    const id = String(base + i);
    if (!used.has(id)) return id;
  }
  throw new SafetyError("\u8BE5\u7F6A\u4EBA\u7684\u4EBA\u683C\u7F16\u53F7\u5DF2\u7528\u5C3D\uFF0C\u8BF7\u624B\u52A8\u6307\u5B9A id");
}
function createPersonality(letheRoot, { name, characterId, id, displayName, title = "", desc = "", appearance = "", rank, hp }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dir = modDirSafe(letheRoot, modName);
  if (!fs10.existsSync(dir)) throw new SafetyError(`Mod \u4E0D\u5B58\u5728\uFF1A${name}`);
  const cid = Number(characterId);
  if (!Number.isInteger(cid) || cid <= 0) throw new SafetyError("characterId \u5FC5\u987B\u662F\u6B63\u6574\u6570");
  const tmpl = vanillaTemplate(letheRoot, cid);
  if (!tmpl) throw new SafetyError("\u627E\u4E0D\u5230\u53EF\u7528\u7684\u539F\u7248\u6A21\u677F\uFF08dumpedData \u672A\u5BFC\u51FA\uFF1F\uFF09");
  const pid = id ? String(id) : nextId(letheRoot, modName, cid);
  if (!/^\d{3,10}$/.test(pid)) throw new SafetyError("\u4EBA\u683C id \u5FC5\u987B\u662F 3\u201310 \u4F4D\u6570\u5B57");
  const existing = getPersonality(letheRoot, modName, pid);
  if (existing) throw new SafetyError(`\u672C Mod \u5DF2\u6709\u4EBA\u683C id\uFF1A${pid}`);
  const entity = {
    ...JSON.parse(JSON.stringify(tmpl.entity)),
    id: Number(pid),
    characterId: cid,
    updatedDate: Number((/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")),
    appearance: appearance || tmpl.appearance || "",
    attributeList: [],
    defenseSkillIDList: []
  };
  if (rank != null) entity.rank = Number(rank);
  if (hp && typeof hp === "object") entity.hp = { ...entity.hp, ...hp };
  const entry = {
    id: String(pid),
    name: displayName || "",
    title,
    desc,
    oneLineTitle: title,
    acquisitionMethod: "Custom",
    skinItemTitle: "",
    skinItemDesc: ""
  };
  ensureLayout(dir, "personality");
  const created = ensureLayout(dir, "appearance").filter((x) => x.startsWith("custom_sprites") || x.startsWith("custom_appearance"));
  const files = [
    { rel: `custom_limbus_data/personality/${pid}.json`, content: JSON.stringify({ list: [entity] }, null, 2) },
    { rel: `custom_limbus_locale/EN/personalityList/${pid}.json`, content: JSON.stringify({ [pid]: entry }, null, 2) }
  ];
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  return { id: pid, entity, locale: entry, created, ...result };
}

// src/server/index.mjs
var http = __toESM(require("node:http"), 1);
var import_node_crypto = require("node:crypto");
var import_node_path23 = require("node:path");

// src/server/api.mjs
var fs13 = __toESM(require("node:fs"), 1);
var import_node_path19 = require("node:path");

// src/lethe/backups.mjs
var fs11 = __toESM(require("node:fs"), 1);
var import_node_path11 = require("node:path");
function dayStamp(date = /* @__PURE__ */ new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
function sizeOf2(dir) {
  let bytes = 0;
  let files = 0;
  const walk2 = (p) => {
    let entries = [];
    try {
      entries = fs11.readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = (0, import_node_path11.join)(p, e.name);
      if (e.isDirectory()) walk2(abs);
      else if (e.isFile()) {
        try {
          bytes += fs11.statSync(abs).size;
          files += 1;
        } catch {
        }
      }
    }
  };
  walk2(dir);
  return { bytes, files };
}
function dirsOf(dir) {
  try {
    return fs11.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return [];
  }
}
function createUserBackup(letheRoot, modName) {
  const { dir: src } = resolveModDir(letheRoot, modName);
  const base = userBackupsDir(letheRoot);
  fs11.mkdirSync(base, { recursive: true });
  const day = dayStamp();
  let label = `${modName}_${day}`;
  let n = 2;
  while (fs11.existsSync((0, import_node_path11.join)(base, label))) {
    label = `${modName}_${day}_${n}`;
    n += 1;
  }
  const dest = (0, import_node_path11.join)(base, label);
  fs11.cpSync(src, dest, { recursive: true });
  const info = sizeOf2(dest);
  return { label, dir: dest, kind: "user", at: (/* @__PURE__ */ new Date()).toISOString(), ...info };
}
function listUserBackups(letheRoot, modName) {
  const prefix = `${modName}_`;
  const out2 = [];
  const scan = (root, kind) => {
    for (const d of dirsOf(root)) {
      if (!d.name.startsWith(prefix)) continue;
      const abs = (0, import_node_path11.join)(root, d.name);
      let st = null;
      try {
        st = fs11.statSync(abs);
      } catch {
        continue;
      }
      out2.push({ label: d.name, dir: abs, kind, at: st.mtime.toISOString(), ...sizeOf2(abs) });
    }
  };
  scan(userBackupsDir(letheRoot), "user");
  scan(backupsRoot(letheRoot), "legacy");
  return out2.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
function findBackup(letheRoot, modName, label) {
  const clean = String(label);
  const all = listUserBackups(letheRoot, modName);
  const hit = all.find((b) => b.label === clean);
  if (!hit) throw new SafetyError(`\u627E\u4E0D\u5230\u8FD9\u4E2A\u5907\u4EFD\uFF1A${label}`);
  return hit;
}
function readBackupPayload(letheRoot, modName, label) {
  const b = findBackup(letheRoot, modName, label);
  const payload = readModPayload(b.dir);
  return {
    label: b.label,
    dir: b.dir,
    at: b.at,
    bytes: b.bytes,
    files: b.files,
    personalities: payload.personalities,
    categories: Object.keys(payload.data)
  };
}
function swapBackup(letheRoot, modName, label) {
  const current = resolveModDir(letheRoot, modName);
  const backup = findBackup(letheRoot, modName, label);
  const parent = (0, import_node_path11.dirname)(current.dir);
  const tmp = (0, import_node_path11.join)(parent, `.swap-${cleanName(modName)}-${Date.now()}`);
  const steps = [];
  try {
    fs11.renameSync(current.dir, tmp);
    steps.push(() => fs11.renameSync(tmp, current.dir));
    fs11.renameSync(backup.dir, current.dir);
    steps.push(() => fs11.renameSync(current.dir, backup.dir));
    fs11.renameSync(tmp, backup.dir);
  } catch (err) {
    for (const undo of steps.reverse()) {
      try {
        undo();
      } catch {
      }
    }
    throw err;
  }
  return {
    ok: true,
    current: { label: modName, dir: current.dir },
    backup: { label, dir: backup.dir },
    note: "\u4E24\u4E2A\u7248\u672C\u5DF2\u4E92\u6362\u4F4D\u7F6E\uFF1A\u5F53\u524D\u7248\u672C\u4E0E\u5907\u4EFD\u7684\u5B9E\u9645\u6587\u4EF6\u5939\u540D\u5982\u4E0B"
  };
}
function createDllBackup(gameRoot, letheRoot, file) {
  const src = (0, import_node_path11.join)(pluginsDir(gameRoot), (0, import_node_path11.basename)(file));
  if (!fs11.existsSync(src)) throw new SafetyError(`DLL \u4E0D\u5B58\u5728\uFF1A${file}`);
  const base = (0, import_node_path11.basename)(file).replace(/\.dll(\.disabled)?$/i, "");
  const label = `${base}_${dayStamp()}`;
  const dest = (0, import_node_path11.join)(dllBackupsDir(letheRoot), label);
  fs11.mkdirSync(dest, { recursive: true });
  const destFile = (0, import_node_path11.join)(dest, (0, import_node_path11.basename)(file));
  fs11.copyFileSync(src, destFile);
  writeFileAtomic((0, import_node_path11.join)(dest, "backup.json"), JSON.stringify({
    label,
    file: (0, import_node_path11.basename)(file),
    from: src,
    at: (/* @__PURE__ */ new Date()).toISOString(),
    size: fs11.statSync(src).size
  }, null, 2));
  return { label, dir: dest, file: destFile, size: fs11.statSync(src).size };
}
function listDllBackups(letheRoot, file) {
  const base = (0, import_node_path11.basename)(String(file || "")).replace(/\.dll(\.disabled)?$/i, "");
  const prefix = `${base}_`;
  const out2 = [];
  for (const d of dirsOf(dllBackupsDir(letheRoot))) {
    if (base && !d.name.startsWith(prefix)) continue;
    const abs = (0, import_node_path11.join)(dllBackupsDir(letheRoot), d.name);
    let st = null;
    try {
      st = fs11.statSync(abs);
    } catch {
      continue;
    }
    const meta = readJson((0, import_node_path11.join)(abs, "backup.json"), null) || {};
    out2.push({ label: d.name, dir: abs, at: meta.at || st.mtime.toISOString(), size: meta.size || 0, file: meta.file || "" });
  }
  return out2.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// src/lethe/snapshot.mjs
var fs12 = __toESM(require("node:fs"), 1);
var import_node_path12 = require("node:path");
var HARD_LINK_MIN = 8 * 1024 * 1024;
var MANIFEST = "manifest.json";
function walk(dir, base = "", out2 = []) {
  let entries = [];
  try {
    entries = fs12.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out2;
  }
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    const abs = (0, import_node_path12.join)(dir, e.name);
    if (e.isDirectory()) walk(abs, rel, out2);
    else if (e.isFile()) {
      try {
        out2.push({ rel, abs, size: fs12.statSync(abs).size, mtimeMs: Math.round(fs12.statSync(abs).mtimeMs) });
      } catch {
      }
    }
  }
  return out2;
}
function ensureDir2(p) {
  fs12.mkdirSync(p, { recursive: true });
}
function mirrorMod(sourceDir, slotDir) {
  const started = Date.now();
  ensureDir2(slotDir);
  const src = walk(sourceDir).filter((f) => f.rel !== MANIFEST);
  const prev = readJson((0, import_node_path12.join)(slotDir, MANIFEST), null) || { files: {} };
  const prevFiles = prev.files || {};
  const next = { version: 1, at: (/* @__PURE__ */ new Date()).toISOString(), files: {} };
  let copied = 0;
  let linked = 0;
  let kept = 0;
  let bytes = 0;
  for (const f of src) {
    const dest = (0, import_node_path12.join)(slotDir, f.rel.split("/").join("\\"));
    const old = prevFiles[f.rel];
    const destExists = fs12.existsSync(dest);
    const unchanged = Boolean(old && old.size === f.size && old.mtimeMs === f.mtimeMs && destExists);
    if (unchanged) {
      kept += 1;
      bytes += f.size;
      next.files[f.rel] = { size: f.size, mtimeMs: f.mtimeMs, ...old.link ? { link: true } : {} };
      continue;
    }
    ensureDir2((0, import_node_path12.join)(dest, ".."));
    try {
      if (destExists) fs12.rmSync(dest, { force: true });
    } catch {
    }
    let mode = "copy";
    if (f.size >= HARD_LINK_MIN) {
      try {
        fs12.linkSync(f.abs, dest);
        mode = "link";
      } catch {
        mode = "copy";
      }
    }
    if (mode === "copy") fs12.copyFileSync(f.abs, dest);
    if (mode === "link") linked += 1;
    else copied += 1;
    bytes += f.size;
    next.files[f.rel] = { size: f.size, mtimeMs: f.mtimeMs, ...mode === "link" ? { link: true } : {} };
  }
  let removed = 0;
  for (const rel of Object.keys(prevFiles)) {
    if (next.files[rel]) continue;
    const dest = (0, import_node_path12.join)(slotDir, rel.split("/").join("\\"));
    try {
      fs12.rmSync(dest, { force: true });
      removed += 1;
    } catch {
    }
  }
  next.bytes = bytes;
  next.files = next.files;
  writeFileAtomic((0, import_node_path12.join)(slotDir, MANIFEST), JSON.stringify({ ...next, count: src.length }, null, 2));
  return {
    ok: true,
    dir: slotDir,
    at: next.at,
    files: src.length,
    bytes,
    copied,
    linked,
    kept,
    removed,
    ms: Date.now() - started
  };
}
function slotInfo(slotDir) {
  const man = readJson((0, import_node_path12.join)(slotDir, MANIFEST), null);
  if (!man) return null;
  return { at: man.at, files: man.count || Object.keys(man.files || {}).length, bytes: man.bytes || 0 };
}
function restoreFromSlot(slotDir, targetDir) {
  if (!fs12.existsSync(slotDir)) throw new Error("\u5FEB\u7167\u4E0D\u5B58\u5728\uFF1A" + slotDir);
  const files = walk(slotDir).filter((f) => f.rel !== MANIFEST);
  const live = new Set(walk(targetDir).map((f) => f.rel));
  let restored = 0;
  for (const f of files) {
    const dest = (0, import_node_path12.join)(targetDir, f.rel.split("/").join("\\"));
    ensureDir2((0, import_node_path12.join)(dest, ".."));
    fs12.copyFileSync(f.abs, dest);
    live.delete(f.rel);
    restored += 1;
  }
  let removed = 0;
  for (const rel of live) {
    try {
      fs12.rmSync((0, import_node_path12.join)(targetDir, rel.split("/").join("\\")), { force: true });
      removed += 1;
    } catch {
    }
  }
  return { ok: true, restored, removed, at: (/* @__PURE__ */ new Date()).toISOString() };
}

// src/lethe/stats.mjs
var import_node_path13 = require("node:path");
function homeStats(letheRoot, gameRoot) {
  const st = readState(letheRoot);
  let mods = [];
  let dlls = [];
  try {
    mods = listMods(letheRoot);
  } catch {
    mods = [];
  }
  try {
    dlls = listDlls(gameRoot);
  } catch {
    dlls = [];
  }
  const bytes = mods.reduce((n, m) => n + (Number(m.bytes) || 0), 0);
  return {
    editorName: st.editorName || "\u4F46\u4E01",
    editorTitle: "\u8FB9\u72F1\u5DE5\u4F5C\u53F0 Limbus Workshop",
    modCount: mods.length,
    modEnabled: mods.filter((m) => m.enabled).length,
    dllCount: dlls.length,
    dllEnabled: dlls.filter((d) => d.enabled).length,
    bytes,
    pluginsDir: (0, import_node_path13.join)(gameRoot || "", "BepInEx", "plugins"),
    letheRoot: letheRoot || "",
    gameRoot: gameRoot || ""
  };
}

// src/lethe/skills.mjs
var import_node_fs2 = require("node:fs");
var import_node_path15 = require("node:path");

// src/lethe/meta.mjs
var import_node_fs = require("node:fs");
var import_node_path14 = require("node:path");
var META_VERSION = 1;
var DEFAULT_INFO = {
  basePower: 4,
  coinCount: 1,
  atkCorrection: 0,
  targetNum: 1,
  physical: "SLASH",
  sin: "AZURE",
  sign: "positive"
};
var PHYSICAL_TYPES = [
  { id: "SLASH", zh: "\u65A9\u51FB" },
  { id: "HIT", zh: "\u6253\u51FB" },
  { id: "PENETRATE", zh: "\u7A81\u523A" },
  { id: "NONE", zh: "\u65E0" }
];
var SIN_TYPES = [
  { id: "CRIMSON", zh: "\u66B4\u6012" },
  { id: "SCARLET", zh: "\u8272\u6B32" },
  { id: "AMBER", zh: "\u6020\u60F0" },
  { id: "SHAMROCK", zh: "\u66B4\u98DF" },
  { id: "AZURE", zh: "\u5FE7\u90C1" },
  { id: "INDIGO", zh: "\u50B2\u6162" },
  { id: "VIOLET", zh: "\u5AC9\u5992" },
  { id: "WHITE", zh: "\u75AF\u72C2" },
  { id: "BLACK", zh: "\u54C0\u53F9" },
  { id: "NEUTRAL", zh: "\u65E0\u5C5E\u6027" }
];
var COIN_COLORS = [
  { id: "GREY", zh: "\u7070" },
  { id: "GREEN", zh: "\u7EFF" },
  { id: "PURPLE", zh: "\u7D2B" },
  { id: "RED", zh: "\u7EA2" }
];
var COIN_COLOR_ALIAS = { normal: "GREY", grey: "GREY", green: "GREEN", purple: "PURPLE", red: "RED" };
var TEST_MODULES = [
  { id: "test-burn-quake", name: "\u6D4B\u8BD5\u6A21\u5757 \xB7 \u70E7\u4F24+\u9707\u98A4", desc: "[\u4F7F\u7528\u65F6]\u82E5\u76EE\u6807\u7684[\u70E7\u4F24]\u5F3A\u5EA6\u4E0E[\u9707\u98A4]\u5F3A\u5EA6\u4E4B\u548C\u4E0D\u4F4E\u4E8E6\u7EA7\uFF0C\u5219\u4F7F\u672C\u6280\u80FD\u7684\u786C\u5E01\u5A01\u529B+1" },
  { id: "test-power-gain", name: "\u6D4B\u8BD5\u6A21\u5757 \xB7 \u786C\u5E01\u5A01\u529B", desc: "[\u4F7F\u7528\u65F6]\u4F7F\u672C\u6280\u80FD\u7684\u786C\u5E01\u5A01\u529B+1" },
  { id: "test-heal-sp", name: "\u6D4B\u8BD5\u6A21\u5757 \xB7 \u56DE\u590D\u7406\u667A", desc: "[\u547D\u4E2D\u65F6]\u6062\u590D\u81EA\u8EAB2\u70B9\u7406\u667A\u503C" }
];
var DEFAULT_PASSIVE_INFO = {
  needCondition: false,
  sin: "CRIMSON",
  conditionType: "have",
  count: 0
};
var PASSIVE_CONDITION_TYPES = [
  { id: "have", zh: "\u62E5\u6709" },
  { id: "resonance", zh: "\u5171\u9E23" }
];
var DEFAULT_BUFF_INFO = {
  buffClass: "NonvolatileBuff",
  buffType: "Positive",
  canBeDespelled: true,
  maxStack: 1,
  maxTurn: 1,
  iconId: "",
  special: ""
};
var BUFF_CLASSES = [
  { id: "NonvolatileBuff", zh: "\u5E38\u9A7B\uFF08NonvolatileBuff\uFF09" },
  { id: "VolatileBuff", zh: "\u6325\u53D1\uFF08VolatileBuff\uFF09" }
];
var BUFF_TYPES = [
  { id: "Positive", zh: "\u589E\u76CA" },
  { id: "Negative", zh: "\u51CF\u76CA" },
  { id: "Neutral", zh: "\u4E2D\u6027" }
];
function metaRoot(letheRoot) {
  return (0, import_node_path14.join)(workbenchDir(letheRoot), "meta");
}
function modulesDir(letheRoot) {
  return (0, import_node_path14.join)(metaRoot(letheRoot), "modules");
}
function skillsMetaDir(letheRoot, mod) {
  return (0, import_node_path14.join)(metaRoot(letheRoot), "skills", cleanName(mod, "Mod \u540D\u79F0"));
}
function passivesMetaDir(letheRoot, mod) {
  return (0, import_node_path14.join)(metaRoot(letheRoot), "passives", cleanName(mod, "Mod \u540D\u79F0"));
}
function buffsMetaDir(letheRoot, mod) {
  return (0, import_node_path14.join)(metaRoot(letheRoot), "buffs", cleanName(mod, "Mod \u540D\u79F0"));
}
function normalizeId(id) {
  const s = String(id ?? "").trim();
  if (!/^\d{3,10}$/.test(s)) throw new SafetyError("\u6280\u80FD id \u5FC5\u987B\u662F 3\u201310 \u4F4D\u6570\u5B57");
  return s;
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function coinColor(value) {
  const raw = String(value ?? "").trim();
  const id = COIN_COLOR_ALIAS[raw] || COIN_COLOR_ALIAS[raw.toLowerCase()] || raw;
  return COIN_COLORS.some((x) => x.id === id) ? id : "GREY";
}
function padCoins(coins, count) {
  const list = Array.isArray(coins) ? coins.slice(0, count) : [];
  while (list.length < count) list.push({ color: "GREY", value: 0, modules: [] });
  return list.map((c) => ({
    color: coinColor(c && c.color),
    value: Number(c && c.value) || 0,
    modules: Array.isArray(c && c.modules) ? [...c.modules] : []
  }));
}
function normalizeSkillMeta(doc, id) {
  const src = doc && typeof doc === "object" ? doc : {};
  const info = { ...DEFAULT_INFO, ...src.info || {} };
  const count = Math.max(1, Math.min(12, Number(info.coinCount) || 1));
  info.coinCount = count;
  const code = src.code && typeof src.code === "object" ? src.code : {};
  return {
    version: META_VERSION,
    id: String(id),
    updatedAt: src.updatedAt || "",
    createdAt: src.createdAt || "",
    info,
    code: {
      skill: Array.isArray(code.skill) ? code.skill.map(String) : [],
      coins: padCoins(code.coins, count)
    },
    description: typeof src.description === "string" ? src.description : "",
    coinDescs: padStrings(src.coinDescs, count)
  };
}
function padStrings(list, count) {
  const src = Array.isArray(list) ? list : [];
  const out2 = [];
  for (let i = 0; i < count; i += 1) out2.push(typeof src[i] === "string" ? src[i] : "");
  return out2;
}
function skillMetaPath(letheRoot, mod, id) {
  return (0, import_node_path14.join)(skillsMetaDir(letheRoot, mod), `${normalizeId(id)}.json`);
}
function skillCodePath(letheRoot, mod, id) {
  return (0, import_node_path14.join)(skillsMetaDir(letheRoot, mod), `${normalizeId(id)}.code.json`);
}
function readSkillMeta(letheRoot, mod, id) {
  const doc = readJson(skillMetaPath(letheRoot, mod, id), null) || {};
  const codeDoc = readJson(skillCodePath(letheRoot, mod, id), null);
  return normalizeSkillMeta({ ...doc, code: codeDoc && codeDoc.code ? codeDoc.code : doc.code || {} }, id);
}
function writeSkillMeta(letheRoot, mod, id, patch = {}) {
  const p = skillMetaPath(letheRoot, mod, id);
  const before = (0, import_node_fs.existsSync)(p) ? (0, import_node_fs.readFileSync)(p, "utf8") : null;
  const prev = normalizeSkillMeta(before ? JSON.parse(before) : null, id);
  const next = normalizeSkillMeta({
    ...prev,
    info: { ...prev.info, ...patch.info || {} },
    description: patch.description !== void 0 ? patch.description : prev.description,
    coinDescs: patch.coinDescs !== void 0 ? patch.coinDescs : prev.coinDescs,
    updatedAt: patch.touch === false ? prev.updatedAt : nowIso()
  }, id);
  const after = JSON.stringify(next, null, 2);
  (0, import_node_fs.mkdirSync)((0, import_node_path14.join)(p, ".."), { recursive: true });
  writeFileAtomic(p, after);
  return { rel: null, abs: p, before, after, doc: next };
}
function writeSkillCode(letheRoot, mod, id, code = {}) {
  const p = skillCodePath(letheRoot, mod, id);
  const before = (0, import_node_fs.existsSync)(p) ? (0, import_node_fs.readFileSync)(p, "utf8") : null;
  const prev = readJson(p, null) || {};
  const prevCoins = prev.code && Array.isArray(prev.code.coins) ? prev.code.coins : [];
  const count = Math.max(1, Math.min(12, Number(code.coinCount) || (code.coins ? code.coins.length : prevCoins.length) || 1));
  const doc = {
    version: META_VERSION,
    id: String(id),
    updatedAt: nowIso(),
    code: {
      skill: Array.isArray(code.skill) ? code.skill.map(String) : Array.isArray(prev.code?.skill) ? prev.code.skill : [],
      coins: padCoins(Array.isArray(code.coins) ? code.coins : prevCoins, count)
    }
  };
  (0, import_node_fs.mkdirSync)((0, import_node_path14.join)(p, ".."), { recursive: true });
  writeFileAtomic(p, JSON.stringify(doc, null, 2));
  return { rel: null, abs: p, before, after: JSON.stringify(doc, null, 2), doc: { ...doc } };
}
function normalizePassiveMeta(doc, id) {
  const src = doc && typeof doc === "object" ? doc : {};
  const info = { ...DEFAULT_PASSIVE_INFO, ...src.info || {} };
  info.count = Math.max(0, Math.min(99, Number(info.count) || 0));
  if (!PASSIVE_CONDITION_TYPES.some((x) => x.id === info.conditionType)) info.conditionType = "have";
  if (!SIN_TYPES.some((x) => x.id === info.sin)) info.sin = "CRIMSON";
  const code = src.code && typeof src.code === "object" ? src.code : {};
  return {
    version: META_VERSION,
    id: String(id),
    updatedAt: src.updatedAt || "",
    createdAt: src.createdAt || "",
    info,
    code: { modules: Array.isArray(code.modules) ? code.modules.map(String) : [] },
    description: typeof src.description === "string" ? src.description : ""
  };
}
function normalizeBuffMeta(doc, id) {
  const src = doc && typeof doc === "object" ? doc : {};
  const info = { ...DEFAULT_BUFF_INFO, ...src.info || {} };
  info.maxStack = Math.max(1, Math.min(999, Number(info.maxStack) || 1));
  info.maxTurn = Math.max(-1, Math.min(999, Number(info.maxTurn) || 1));
  if (!BUFF_CLASSES.some((x) => x.id === info.buffClass)) info.buffClass = "NonvolatileBuff";
  if (!BUFF_TYPES.some((x) => x.id === info.buffType)) info.buffType = "Positive";
  const code = src.code && typeof src.code === "object" ? src.code : {};
  return {
    version: META_VERSION,
    id: String(id),
    updatedAt: src.updatedAt || "",
    createdAt: src.createdAt || "",
    info,
    code: { modules: Array.isArray(code.modules) ? code.modules.map(String) : [] },
    description: typeof src.description === "string" ? src.description : ""
  };
}
function readMetaDoc(p, norm, id) {
  const doc = readJson(p, null) || {};
  return norm(doc, id);
}
function writeMetaDoc(p, norm, id, patch = {}) {
  const before = (0, import_node_fs.existsSync)(p) ? (0, import_node_fs.readFileSync)(p, "utf8") : null;
  const prev = norm(before ? JSON.parse(before) : null, id);
  const next = norm({
    ...prev,
    info: { ...prev.info, ...patch.info || {} },
    code: { ...prev.code, ...patch.code || {} },
    description: patch.description !== void 0 ? patch.description : prev.description,
    updatedAt: patch.touch === false ? prev.updatedAt : nowIso()
  }, id);
  const after = JSON.stringify(next, null, 2);
  (0, import_node_fs.mkdirSync)((0, import_node_path14.join)(p, ".."), { recursive: true });
  writeFileAtomic(p, after);
  return { rel: null, abs: p, before, after, doc: next };
}
function passiveMetaPath(letheRoot, mod, id) {
  return (0, import_node_path14.join)(passivesMetaDir(letheRoot, mod), String(id) + ".json");
}
function readPassiveMeta(letheRoot, mod, id) {
  return readMetaDoc(passiveMetaPath(letheRoot, mod, id), normalizePassiveMeta, id);
}
function writePassiveMeta(letheRoot, mod, id, patch = {}) {
  return writeMetaDoc(passiveMetaPath(letheRoot, mod, id), normalizePassiveMeta, id, patch);
}
function buffMetaPath(letheRoot, mod, id) {
  return (0, import_node_path14.join)(buffsMetaDir(letheRoot, mod), String(id) + ".json");
}
function readBuffMeta(letheRoot, mod, id) {
  return readMetaDoc(buffMetaPath(letheRoot, mod, id), normalizeBuffMeta, id);
}
function writeBuffMeta(letheRoot, mod, id, patch = {}) {
  return writeMetaDoc(buffMetaPath(letheRoot, mod, id), normalizeBuffMeta, id, patch);
}
var MODULE_KINDS = [
  { id: "skill", zh: "\u6280\u80FD" },
  { id: "passive", zh: "\u88AB\u52A8" },
  { id: "buff", zh: "Buff" }
];
function safeModuleId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
}
function modulePath(letheRoot, id) {
  return (0, import_node_path14.join)(modulesDir(letheRoot), safeModuleId(id) + ".json");
}
function ensureTestModules(letheRoot) {
  const dir = modulesDir(letheRoot);
  (0, import_node_fs.mkdirSync)(dir, { recursive: true });
  const created = [];
  TEST_MODULES.forEach((m, i) => {
    const p = modulePath(letheRoot, m.id);
    if ((0, import_node_fs.existsSync)(p)) return;
    const at = new Date(Date.now() - (TEST_MODULES.length - i) * 6e4).toISOString();
    const doc = { version: META_VERSION, id: m.id, name: m.name, desc: m.desc, prefix: "", kind: "skill", test: true, editable: false, createdAt: at, updatedAt: at };
    writeFileAtomic(p, JSON.stringify(doc, null, 2));
    created.push(doc);
  });
  return created;
}
function moduleDocOf(doc) {
  return {
    id: String(doc.id),
    name: String(doc.name || doc.id),
    desc: String(doc.desc || ""),
    prefix: String(doc.prefix || ""),
    kind: String(doc.kind || "skill"),
    test: Boolean(doc.test),
    editable: doc.editable !== false,
    createdAt: doc.createdAt || "",
    updatedAt: doc.updatedAt || doc.createdAt || ""
  };
}
function listModules(letheRoot) {
  ensureTestModules(letheRoot);
  const dir = modulesDir(letheRoot);
  if (!(0, import_node_fs.existsSync)(dir)) return [];
  const out2 = [];
  for (const f of (0, import_node_fs.readdirSync)(dir)) {
    if (!f.endsWith(".json")) continue;
    const doc = readJson((0, import_node_path14.join)(dir, f), null);
    if (!doc || !doc.id) continue;
    out2.push(moduleDocOf(doc));
  }
  return out2.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
function getModule(letheRoot, id) {
  const doc = readJson(modulePath(letheRoot, id), null);
  return doc ? moduleDocOf(doc) : null;
}
function createModule(letheRoot, { name, desc = "", prefix = "", kind = "skill" }) {
  const n = String(name || "").trim();
  if (!n) throw new SafetyError("\u6A21\u5757\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
  const id = "mod-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const at = nowIso();
  const doc = { version: META_VERSION, id, name: n, desc: String(desc), prefix: String(prefix), kind: String(kind || "skill"), test: false, editable: true, createdAt: at, updatedAt: at };
  writeFileAtomic(modulePath(letheRoot, id), JSON.stringify(doc, null, 2));
  return moduleDocOf(doc);
}
function updateModule(letheRoot, id, patch = {}) {
  const p = modulePath(letheRoot, id);
  const doc = readJson(p, null);
  if (!doc) throw new SafetyError("\u6A21\u5757\u4E0D\u5B58\u5728");
  if (doc.test || doc.editable === false) throw new SafetyError("\u6D4B\u8BD5\u6A21\u5757\u4E0D\u53EF\u7F16\u8F91");
  const next = {
    ...doc,
    name: patch.name !== void 0 ? String(patch.name).trim() || doc.name : doc.name,
    desc: patch.desc !== void 0 ? String(patch.desc) : doc.desc,
    prefix: patch.prefix !== void 0 ? String(patch.prefix) : doc.prefix || "",
    kind: patch.kind !== void 0 ? String(patch.kind) : doc.kind || "skill",
    updatedAt: nowIso()
  };
  writeFileAtomic(p, JSON.stringify(next, null, 2));
  return moduleDocOf(next);
}
function deleteModule(letheRoot, id) {
  const p = modulePath(letheRoot, id);
  const doc = readJson(p, null);
  if (!doc) throw new SafetyError("\u6A21\u5757\u4E0D\u5B58\u5728");
  if (doc.test || doc.editable === false) throw new SafetyError("\u6D4B\u8BD5\u6A21\u5757\u4E0D\u53EF\u5220\u9664");
  (0, import_node_fs.unlinkSync)(p);
  return { ok: true };
}

// src/lethe/skills.mjs
function walkJson(dir, out2 = [], depth = 0) {
  if (!(0, import_node_fs2.existsSync)(dir) || depth > 4) return out2;
  let items = [];
  try {
    items = (0, import_node_fs2.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return out2;
  }
  for (const it of items) {
    const p = (0, import_node_path15.join)(dir, it.name);
    if (it.isDirectory()) walkJson(p, out2, depth + 1);
    else if (it.name.toLowerCase().endsWith(".json")) out2.push(p);
  }
  return out2;
}
var cache2 = /* @__PURE__ */ new Map();
function stampOf(letheRoot) {
  const parts = [];
  const push = (p) => {
    try {
      parts.push(`${p}:${(0, import_node_fs2.statSync)(p).mtimeMs}`);
    } catch {
      parts.push(`${p}:-`);
    }
  };
  push((0, import_node_path15.join)(letheRoot, "dumpedData", "limbus_data", "skill"));
  push((0, import_node_path15.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "skillList.json"));
  push((0, import_node_path15.join)(letheRoot, "mods"));
  return parts.join("|");
}
function levelName(entry) {
  const levels = entry && Array.isArray(entry.levelList) ? entry.levelList : [];
  const hit = levels.find((l) => l && l.name) || levels[0];
  return String(hit && hit.name || "");
}
function vanillaLocaleNames(letheRoot) {
  const doc = readJson((0, import_node_path15.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "skillList.json"), null);
  const map = /* @__PURE__ */ new Map();
  if (doc && typeof doc === "object") {
    for (const [k, v] of Object.entries(doc)) map.set(String(k), levelName(v));
  }
  return map;
}
function gameSkillIndex(letheRoot) {
  const stamp2 = stampOf(letheRoot);
  const hit = cache2.get(letheRoot);
  if (hit && hit.stamp === stamp2) return hit.index;
  const byId = /* @__PURE__ */ new Map();
  const names = vanillaLocaleNames(letheRoot);
  const vanillaFiles = walkJson((0, import_node_path15.join)(letheRoot, "dumpedData", "limbus_data", "skill"));
  for (const file of vanillaFiles) {
    const doc = readJson(file, null);
    for (const e of entitiesOf(doc)) {
      const id = String(e.id ?? "");
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, { id, source: "vanilla", mod: "", file, rel: "" });
    }
  }
  let mods = [];
  try {
    mods = (0, import_node_fs2.readdirSync)((0, import_node_path15.join)(letheRoot, "mods"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
  }
  for (const mod of mods) {
    const base = (0, import_node_path15.join)(letheRoot, "mods", mod);
    for (const file of walkJson((0, import_node_path15.join)(base, "custom_limbus_data", "skill"))) {
      const doc = readJson(file, null);
      for (const e of entitiesOf(doc)) {
        const id = String(e.id ?? "");
        if (!id) continue;
        const prev = byId.get(id);
        byId.set(id, { id, source: prev ? prev.source : "mod", mod: prev && prev.source === "vanilla" ? prev.mod : mod, file: prev && prev.source === "vanilla" ? prev.file : file, overriddenBy: prev && prev.source === "vanilla" ? mod : "" });
      }
    }
  }
  for (const [id, rec] of byId) rec.name = names.get(id) || "";
  const index = { byId, names, letheRoot, builtAt: (/* @__PURE__ */ new Date()).toISOString() };
  cache2.set(letheRoot, { stamp: stamp2, index });
  return index;
}
function skillExistsAnywhere(letheRoot, id) {
  return gameSkillIndex(letheRoot).byId.has(String(id));
}
function searchSkillIndex(letheRoot, q, limit = 60) {
  const { byId } = gameSkillIndex(letheRoot);
  const query = String(q || "").trim().toLowerCase();
  const out2 = [];
  for (const rec of byId.values()) {
    const name = (rec.name || "").toLowerCase();
    if (query && !rec.id.includes(query) && !name.includes(query)) continue;
    out2.push({ id: rec.id, name: rec.name || "", source: rec.source, mod: rec.mod || "", overriddenBy: rec.overriddenBy || "" });
    if (out2.length >= limit) break;
  }
  out2.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return out2;
}
function skillRecOf(payload, id) {
  return (payload.data.skill || []).find((x) => String(x.id) === String(id)) || null;
}
function listSkills(letheRoot, modName) {
  const dir = modDirSafe(letheRoot, modName);
  const payload = readModPayload(dir);
  const index = gameSkillIndex(letheRoot);
  const vanillaNames3 = index.names;
  return (payload.data.skill || []).map((x) => {
    const loc = findLocaleEntry(payload.locales.EN?.skill, x.id);
    const meta = readSkillMeta(letheRoot, modName, x.id);
    const vanilla = index.byId.get(String(x.id));
    const sd = (x.entity.skillData || [])[0] || {};
    return {
      id: String(x.id),
      name: loc && levelName(loc.levelList ? loc : { levelList: loc.levelList }) || loc?.levelList?.[0]?.name || vanillaNames3.get(String(x.id)) || "",
      tier: Number(x.entity.skillTier) || 0,
      coins: Array.isArray(sd.coinList) ? sd.coinList.length : 0,
      updatedAt: meta.updatedAt || "",
      override: Boolean(vanilla && vanilla.source === "vanilla"),
      hasLocale: Boolean(loc)
    };
  });
}
function getSkill(letheRoot, modName, id) {
  const dir = modDirSafe(letheRoot, modName);
  const payload = readModPayload(dir);
  const rec = skillRecOf(payload, id);
  if (!rec) return null;
  const loc = findLocaleEntry(payload.locales.EN?.skill, id);
  const meta = readSkillMeta(letheRoot, modName, id);
  const index = gameSkillIndex(letheRoot);
  return {
    id: String(rec.id),
    rel: rec.rel,
    entity: rec.entity,
    locale: loc || null,
    meta,
    override: index.byId.get(String(rec.id))?.source === "vanilla"
  };
}
function createSkill(letheRoot, { name, id, displayName = "" }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dir = modDirSafe(letheRoot, modName);
  const sid = normalizeId(id);
  if (skillExistsAnywhere(letheRoot, sid)) {
    throw new SafetyError(`\u6280\u80FD id ${sid} \u5DF2\u5B58\u5728\uFF08\u539F\u7248\u6216\u67D0\u4E2A Mod\uFF09\uFF0C\u8BF7\u6362\u4E00\u4E2A`);
  }
  const entity = {
    id: Number(sid),
    skillType: "SKILL",
    skillTier: 1,
    requireIDList: [],
    skillData: [{
      actionScript: "",
      iconID: "",
      gaksungLevel: 1,
      informationID: -1,
      attributeType: "NEUTRAL",
      atkType: "SLASH",
      defType: "ATTACK",
      skillMotion: "S1",
      viewType: "BATTLE",
      parryingCloseType: "NEAR",
      canDuel: true,
      canChangeTarget: true,
      targetNum: 1,
      defaultValue: 4,
      abilityScriptList: [],
      mpUsage: 0,
      skillLevelCorrection: 0,
      range: -1,
      arearange: -1,
      isRandomAreaAttack: false,
      isManyCoinSkill: false,
      specialDuelIndex: -1,
      skillTargetType: "FRONT",
      canTeamKill: false,
      coinList: [{ operatorType: "ADD", color: "GOLD", grade: 1, scale: 3, prob: 0.5, actionIndex: -1, cutsceneStart: false, abilityScriptList: [] }],
      actionList: [],
      importanceLevel: 0,
      additionalSkillKeywordList: []
    }]
  };
  const entry = { id: sid, levelList: [{ level: 1, name: displayName || sid, desc: "" }] };
  ensureLayout(dir, "skill");
  const files = [
    { rel: `custom_limbus_data/skill/${sid}.json`, content: JSON.stringify({ list: [entity] }, null, 2) },
    { rel: `custom_limbus_locale/EN/skillList/${sid}.json`, content: JSON.stringify({ [sid]: entry }, null, 2) }
  ];
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  writeSkillMeta(letheRoot, modName, sid, { touch: true });
  return { id: sid, entity, locale: entry, ...result };
}
function importSkills(letheRoot, { name, ids, source = { kind: "vanilla" } }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dir = modDirSafe(letheRoot, modName);
  const index = gameSkillIndex(letheRoot);
  const list = (Array.isArray(ids) ? ids : [ids]).map(String).filter(Boolean);
  if (!list.length) throw new SafetyError("\u6CA1\u6709\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6280\u80FD");
  const files = [];
  const imported = [];
  for (const sid of list) {
    const rec = index.byId.get(sid);
    if (!rec) throw new SafetyError(`\u627E\u4E0D\u5230\u6280\u80FD ${sid}`);
    if (source.kind === "mod" && rec.source !== "mod") throw new SafetyError(`\u6280\u80FD ${sid} \u4E0D\u5C5E\u4E8E\u81EA\u5B9A\u4E49 Mod`);
    if (source.kind === "vanilla" && rec.source !== "vanilla") throw new SafetyError(`\u6280\u80FD ${sid} \u4E0D\u662F\u539F\u7248\u6280\u80FD`);
    const doc = readJson(rec.file, null);
    const arr = entitiesOf(doc);
    const ent = arr.find((e) => String(e.id) === sid);
    if (!ent) throw new SafetyError(`\u6280\u80FD\u6587\u4EF6\u91CC\u627E\u4E0D\u5230 ${sid}`);
    const wrapper = doc && typeof doc === "object" && !Array.isArray(doc) && Array.isArray(doc.list) ? { list: [ent] } : Array.isArray(doc) ? [ent] : { list: [ent] };
    files.push({ rel: `custom_limbus_data/skill/${sid}.json`, content: JSON.stringify(wrapper, null, 2) });
    const locDoc = source.kind === "mod" ? readModSkillLocale(letheRoot, rec.mod) : null;
    if (source.kind === "vanilla") {
      const names = readJson((0, import_node_path15.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "skillList.json"), null);
      const entry = names ? names[sid] : null;
      if (entry) files.push({ rel: `custom_limbus_locale/EN/skillList/${sid}.json`, content: JSON.stringify({ [sid]: entry }, null, 2) });
    } else if (locDoc) {
      const entry = locDoc[sid];
      if (entry) files.push({ rel: `custom_limbus_locale/EN/skillList/${sid}.json`, content: JSON.stringify({ [sid]: entry }, null, 2) });
    }
    imported.push(sid);
  }
  ensureLayout(dir, "skill");
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  for (const sid of imported) writeSkillMeta(letheRoot, modName, sid, { touch: true });
  return { imported, ...result };
}
function readModSkillLocale(letheRoot, mod) {
  const dir = (0, import_node_path15.join)(letheRoot, "mods", mod, "custom_limbus_locale", "EN", "skillList");
  const out2 = {};
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return out2;
  }
  for (const f of names) {
    if (!f.toLowerCase().endsWith(".json")) continue;
    const doc = readJson((0, import_node_path15.join)(dir, f), null);
    if (!doc || typeof doc !== "object") continue;
    for (const [k, v] of Object.entries(doc)) if (k && v && typeof v === "object") out2[k] = v;
  }
  return out2;
}
function skillsOfVanillaPersonality(letheRoot, personalityId) {
  const idx = vanillaPersonalityIndex(letheRoot);
  const p = idx.find((x) => String(x.id) === String(personalityId));
  if (!p) return [];
  const ids = [];
  for (const a of p.attributeList || []) if (a && a.skillId != null) ids.push(String(a.skillId));
  for (const d of p.defenseSkillIDList || []) ids.push(String(d));
  const names = gameSkillIndex(letheRoot).names;
  return ids.map((id) => ({ id, name: names.get(id) || "" }));
}
var vpCache = /* @__PURE__ */ new Map();
function vanillaPersonalityIndex(letheRoot) {
  const hit = vpCache.get(letheRoot);
  if (hit && Date.now() - hit.at < 6e4) return hit.list;
  const list = [];
  for (const file of walkJson((0, import_node_path15.join)(letheRoot, "dumpedData", "limbus_data", "personality"))) {
    const doc = readJson(file, null);
    for (const e of entitiesOf(doc)) list.push(e);
  }
  vpCache.set(letheRoot, { at: Date.now(), list });
  return list;
}

// src/lethe/passives.mjs
var import_node_fs3 = require("node:fs");
var import_node_path16 = require("node:path");
function walkJson2(dir, out2 = [], depth = 0) {
  if (!(0, import_node_fs3.existsSync)(dir) || depth > 4) return out2;
  let items = [];
  try {
    items = (0, import_node_fs3.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return out2;
  }
  for (const it of items) {
    const p = (0, import_node_path16.join)(dir, it.name);
    if (it.isDirectory()) walkJson2(p, out2, depth + 1);
    else if (it.name.toLowerCase().endsWith(".json")) out2.push(p);
  }
  return out2;
}
var cache3 = /* @__PURE__ */ new Map();
function stampOf2(letheRoot) {
  const parts = [];
  const push = (p) => {
    try {
      parts.push(p + ":" + (0, import_node_fs3.statSync)(p).mtimeMs);
    } catch {
      parts.push(p + ":-");
    }
  };
  push((0, import_node_path16.join)(letheRoot, "dumpedData", "limbus_data", "passive"));
  push((0, import_node_path16.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "passiveList.json"));
  push((0, import_node_path16.join)(letheRoot, "mods"));
  return parts.join("|");
}
function normalizePassiveId(id) {
  const s = String(id ?? "").trim();
  if (!/^\d{4,10}$/.test(s)) throw new SafetyError("\u88AB\u52A8 id \u5FC5\u987B\u662F 4\u201310 \u4F4D\u6570\u5B57");
  return s;
}
function vanillaNames(letheRoot) {
  const doc = readJson((0, import_node_path16.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "passiveList.json"), null);
  const map = /* @__PURE__ */ new Map();
  if (doc && typeof doc === "object") {
    for (const [k, v] of Object.entries(doc)) map.set(String(k), String(v && v.name || ""));
  }
  return map;
}
function passiveIndex(letheRoot) {
  const stamp2 = stampOf2(letheRoot);
  const hit = cache3.get(letheRoot);
  if (hit && hit.stamp === stamp2) return hit.index;
  const byId = /* @__PURE__ */ new Map();
  const names = vanillaNames(letheRoot);
  for (const file of walkJson2((0, import_node_path16.join)(letheRoot, "dumpedData", "limbus_data", "passive"))) {
    const doc = readJson(file, null);
    for (const e of entitiesOf(doc)) {
      const id = String(e.id ?? "");
      if (!id || byId.has(id)) continue;
      byId.set(id, { id, source: "vanilla", mod: "", file, name: names.get(id) || "" });
    }
  }
  let mods = [];
  try {
    mods = (0, import_node_fs3.readdirSync)((0, import_node_path16.join)(letheRoot, "mods"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
  }
  for (const mod of mods) {
    for (const file of walkJson2((0, import_node_path16.join)(letheRoot, "mods", mod, "custom_limbus_data", "passive"))) {
      const doc = readJson(file, null);
      for (const e of entitiesOf(doc)) {
        const id = String(e.id ?? "");
        if (!id) continue;
        const prev = byId.get(id);
        if (prev && prev.source === "vanilla") {
          prev.overriddenBy = mod;
          continue;
        }
        byId.set(id, { id, source: "mod", mod, file, name: prev ? prev.name : names.get(id) || "" });
      }
    }
  }
  const index = { byId, letheRoot };
  cache3.set(letheRoot, { stamp: stamp2, index });
  return index;
}
function passiveExistsAnywhere(letheRoot, id) {
  return passiveIndex(letheRoot).byId.has(String(id));
}
function searchPassiveIndex(letheRoot, q, limit = 80) {
  const query = String(q || "").trim().toLowerCase();
  const out2 = [];
  for (const rec of passiveIndex(letheRoot).byId.values()) {
    const name = (rec.name || "").toLowerCase();
    if (query && !rec.id.includes(query) && !name.includes(query)) continue;
    out2.push({ id: rec.id, name: rec.name || "", source: rec.source, mod: rec.mod || "", overriddenBy: rec.overriddenBy || "" });
    if (out2.length >= limit) break;
  }
  return out2.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
function recOf(payload, id) {
  return (payload.data.passive || []).find((x) => String(x.id) === String(id)) || null;
}
function scriptCount(entity) {
  return Array.isArray(entity && entity.requireIDList) ? entity.requireIDList.length : 0;
}
function listPassives(letheRoot, modName) {
  const dir = modDirSafe(letheRoot, modName);
  const payload = readModPayload(dir);
  const idx = passiveIndex(letheRoot);
  return (payload.data.passive || []).map((x) => {
    const loc = findLocaleEntry(payload.locales.EN?.passive, x.id);
    const meta = readPassiveMeta(letheRoot, modName, x.id);
    const vanilla = idx.byId.get(String(x.id));
    return {
      id: String(x.id),
      name: String(loc && loc.name || vanilla && vanilla.name || ""),
      desc: String(loc && loc.desc || ""),
      scripts: scriptCount(x.entity),
      updatedAt: meta.updatedAt || "",
      override: Boolean(vanilla && vanilla.source === "vanilla"),
      hasLocale: Boolean(loc)
    };
  });
}
function getPassive(letheRoot, modName, id) {
  const dir = modDirSafe(letheRoot, modName);
  const payload = readModPayload(dir);
  const rec = recOf(payload, id);
  if (!rec) return null;
  const loc = findLocaleEntry(payload.locales.EN?.passive, id);
  const meta = readPassiveMeta(letheRoot, modName, id);
  return {
    id: String(rec.id),
    rel: rec.rel,
    entity: rec.entity,
    locale: loc || null,
    meta,
    override: passiveIndex(letheRoot).byId.get(String(rec.id))?.source === "vanilla"
  };
}
function createPassive(letheRoot, { name, id, displayName = "", desc = "" }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dir = modDirSafe(letheRoot, modName);
  const pid = normalizePassiveId(id);
  if (passiveExistsAnywhere(letheRoot, pid)) throw new SafetyError("\u88AB\u52A8 id " + pid + " \u5DF2\u5B58\u5728\uFF08\u539F\u7248\u6216\u67D0\u4E2A Mod\uFF09\uFF0C\u8BF7\u6362\u4E00\u4E2A");
  const existing = readModPayload(dir).data.passive || [];
  if (existing.some((x) => String(x.id) === pid)) throw new SafetyError("\u672C Mod \u91CC\u5DF2\u7ECF\u6709\u88AB\u52A8 " + pid + "\uFF0C\u8BF7\u6362\u4E00\u4E2A id");
  const entity = { id: Number(pid), attributeResonanceCondition: [], requireIDList: [] };
  const entry = { id: pid, name: displayName || pid, desc: String(desc || ""), summary: "", flavor: "" };
  ensureLayout(dir, "passive");
  const files = [
    { rel: "custom_limbus_data/passive/" + pid + ".json", content: JSON.stringify({ list: [entity] }, null, 2) },
    { rel: "custom_limbus_locale/EN/passiveList/" + pid + ".json", content: JSON.stringify({ [pid]: entry }, null, 2) }
  ];
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  writePassiveMeta(letheRoot, modName, pid, { touch: true });
  return { id: pid, entity, locale: entry, ...result };
}
function readModPassiveLocale(letheRoot, mod) {
  const dir = (0, import_node_path16.join)(letheRoot, "mods", mod, "custom_limbus_locale", "EN", "passiveList");
  const out2 = {};
  let names = [];
  try {
    names = (0, import_node_fs3.readdirSync)(dir);
  } catch {
    return out2;
  }
  for (const f of names) {
    if (!f.toLowerCase().endsWith(".json")) continue;
    const doc = readJson((0, import_node_path16.join)(dir, f), null);
    if (!doc || typeof doc !== "object") continue;
    for (const [k, v] of Object.entries(doc)) if (k && v && typeof v === "object") out2[k] = v;
  }
  return out2;
}
function importPassives(letheRoot, { name, ids, source = { kind: "vanilla" } }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dir = modDirSafe(letheRoot, modName);
  const idx = passiveIndex(letheRoot);
  const list = (Array.isArray(ids) ? ids : [ids]).map(String).filter(Boolean);
  if (!list.length) throw new SafetyError("\u6CA1\u6709\u9009\u62E9\u8981\u5BFC\u5165\u7684\u88AB\u52A8");
  const files = [];
  for (const pid of list) {
    const rec = idx.byId.get(pid);
    if (!rec) throw new SafetyError("\u627E\u4E0D\u5230\u88AB\u52A8 " + pid);
    if (source.kind === "mod" && rec.source !== "mod") throw new SafetyError("\u88AB\u52A8 " + pid + " \u4E0D\u5C5E\u4E8E\u81EA\u5B9A\u4E49 Mod");
    if (source.kind === "vanilla" && rec.source !== "vanilla") throw new SafetyError("\u88AB\u52A8 " + pid + " \u4E0D\u662F\u539F\u7248\u88AB\u52A8");
    const doc = readJson(rec.file, null);
    const ent = entitiesOf(doc).find((e) => String(e.id) === pid);
    if (!ent) throw new SafetyError("\u88AB\u52A8\u6587\u4EF6\u91CC\u627E\u4E0D\u5230 " + pid);
    const wrapper = doc && !Array.isArray(doc) && Array.isArray(doc.list) ? { list: [ent] } : { list: [ent] };
    files.push({ rel: "custom_limbus_data/passive/" + pid + ".json", content: JSON.stringify(wrapper, null, 2) });
    const loc = source.kind === "mod" ? readModPassiveLocale(letheRoot, rec.mod)[pid] : (readJson((0, import_node_path16.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "passiveList.json"), null) || {})[pid];
    if (loc) files.push({ rel: "custom_limbus_locale/EN/passiveList/" + pid + ".json", content: JSON.stringify({ [pid]: loc }, null, 2) });
  }
  ensureLayout(dir, "passive");
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  for (const pid of list) writePassiveMeta(letheRoot, modName, pid, { touch: true });
  return { imported: list, ...result };
}
function patchPassiveMeta(letheRoot, modName, id, patch) {
  const change = writePassiveMeta(letheRoot, modName, id, patch);
  return { change, meta: change.doc };
}

// src/lethe/buffs.mjs
var import_node_fs4 = require("node:fs");
var import_node_path17 = require("node:path");
function walkJson3(dir, out2 = [], depth = 0) {
  if (!(0, import_node_fs4.existsSync)(dir) || depth > 4) return out2;
  let items = [];
  try {
    items = (0, import_node_fs4.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return out2;
  }
  for (const it of items) {
    const p = (0, import_node_path17.join)(dir, it.name);
    if (it.isDirectory()) walkJson3(p, out2, depth + 1);
    else if (it.name.toLowerCase().endsWith(".json")) out2.push(p);
  }
  return out2;
}
var cache4 = /* @__PURE__ */ new Map();
function stampOf3(letheRoot) {
  const parts = [];
  const push = (p) => {
    try {
      parts.push(p + ":" + (0, import_node_fs4.statSync)(p).mtimeMs);
    } catch {
      parts.push(p + ":-");
    }
  };
  push((0, import_node_path17.join)(letheRoot, "dumpedData", "limbus_data", "buff"));
  push((0, import_node_path17.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "bufList.json"));
  push((0, import_node_path17.join)(letheRoot, "mods"));
  return parts.join("|");
}
function normalizeBuffId(id) {
  const s = String(id ?? "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{1,39}$/.test(s)) throw new SafetyError("Buff id \u5FC5\u987B\u662F\u82F1\u6587\u5F00\u5934\u3001\u53EA\u542B\u5B57\u6BCD\u6570\u5B57\u4E0B\u5212\u7EBF\uFF082\u201340 \u5B57\u7B26\uFF09\uFF0C\u4F8B\u5982 BurnMark");
  return s;
}
function vanillaNames2(letheRoot) {
  const doc = readJson((0, import_node_path17.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "bufList.json"), null);
  const map = /* @__PURE__ */ new Map();
  if (doc && typeof doc === "object") for (const [k, v] of Object.entries(doc)) map.set(String(k), String(v && v.name || ""));
  return map;
}
function buffIndex(letheRoot) {
  const stamp2 = stampOf3(letheRoot);
  const hit = cache4.get(letheRoot);
  if (hit && hit.stamp === stamp2) return hit.index;
  const byId = /* @__PURE__ */ new Map();
  const names = vanillaNames2(letheRoot);
  for (const file of walkJson3((0, import_node_path17.join)(letheRoot, "dumpedData", "limbus_data", "buff"))) {
    const doc = readJson(file, null);
    for (const e of entitiesOf(doc)) {
      const id = String(e.id ?? "");
      if (!id || byId.has(id)) continue;
      byId.set(id, { id, source: "vanilla", mod: "", file, name: names.get(id) || "" });
    }
  }
  let mods = [];
  try {
    mods = (0, import_node_fs4.readdirSync)((0, import_node_path17.join)(letheRoot, "mods"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
  }
  for (const mod of mods) {
    for (const file of walkJson3((0, import_node_path17.join)(letheRoot, "mods", mod, "custom_limbus_data", "buff"))) {
      const doc = readJson(file, null);
      for (const e of entitiesOf(doc)) {
        const id = String(e.id ?? "");
        if (!id) continue;
        const prev = byId.get(id);
        if (prev && prev.source === "vanilla") {
          prev.overriddenBy = mod;
          continue;
        }
        byId.set(id, { id, source: "mod", mod, file, name: prev ? prev.name : names.get(id) || "" });
      }
    }
  }
  const index = { byId, letheRoot };
  cache4.set(letheRoot, { stamp: stamp2, index });
  return index;
}
function buffExistsAnywhere(letheRoot, id) {
  return buffIndex(letheRoot).byId.has(String(id));
}
function searchBuffIndex(letheRoot, q, limit = 80) {
  const query = String(q || "").trim().toLowerCase();
  const out2 = [];
  for (const rec of buffIndex(letheRoot).byId.values()) {
    const name = (rec.name || "").toLowerCase();
    if (query && !rec.id.toLowerCase().includes(query) && !name.includes(query)) continue;
    out2.push({ id: rec.id, name: rec.name || "", source: rec.source, mod: rec.mod || "", overriddenBy: rec.overriddenBy || "" });
    if (out2.length >= limit) break;
  }
  return out2.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
function buffLocale(payload) {
  const en = payload.locales && payload.locales.EN || {};
  return en.buff || en.buf || [];
}
function recOf2(payload, id) {
  return (payload.data.buff || []).find((x) => String(x.id) === String(id)) || null;
}
function listBuffs(letheRoot, modName) {
  const dir = modDirSafe(letheRoot, modName);
  const payload = readModPayload(dir);
  const idx = buffIndex(letheRoot);
  return (payload.data.buff || []).map((x) => {
    const loc = findLocaleEntry(buffLocale(payload), x.id);
    const meta = readBuffMeta(letheRoot, modName, x.id);
    const vanilla = idx.byId.get(String(x.id));
    return {
      id: String(x.id),
      name: String(loc && loc.name || vanilla && vanilla.name || ""),
      desc: String(loc && loc.desc || ""),
      buffClass: String(x.entity.buffClass || ""),
      buffType: String(x.entity.buffType || ""),
      maxStack: Number(x.entity.maxStack) || 0,
      updatedAt: meta.updatedAt || "",
      override: Boolean(vanilla && vanilla.source === "vanilla"),
      hasLocale: Boolean(loc)
    };
  });
}
function getBuff(letheRoot, modName, id) {
  const dir = modDirSafe(letheRoot, modName);
  const payload = readModPayload(dir);
  const rec = recOf2(payload, id);
  if (!rec) return null;
  const loc = findLocaleEntry(buffLocale(payload), id);
  const meta = readBuffMeta(letheRoot, modName, id);
  return {
    id: String(rec.id),
    rel: rec.rel,
    entity: rec.entity,
    locale: loc || null,
    meta,
    override: buffIndex(letheRoot).byId.get(String(rec.id))?.source === "vanilla"
  };
}
function createBuff(letheRoot, { name, id, displayName = "", desc = "", info = {} }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dir = modDirSafe(letheRoot, modName);
  const bid = normalizeBuffId(id);
  if (buffExistsAnywhere(letheRoot, bid)) throw new SafetyError("Buff id " + bid + " \u5DF2\u5B58\u5728\uFF08\u539F\u7248\u6216\u67D0\u4E2A Mod\uFF09\uFF0C\u8BF7\u6362\u4E00\u4E2A");
  const existing = readModPayload(dir).data.buff || [];
  if (existing.some((x) => String(x.id) === bid)) throw new SafetyError("\u672C Mod \u91CC\u5DF2\u7ECF\u6709 Buff " + bid + "\uFF0C\u8BF7\u6362\u4E00\u4E2A id");
  const entity = {
    id: bid,
    buffClass: info.buffClass || "NonvolatileBuff",
    buffType: info.buffType || "Positive",
    canBeDespelled: info.canBeDespelled !== false,
    destroyableOnZero: false,
    destroyableOnRetreat: false,
    maxStack: Math.max(1, Number(info.maxStack) || 1),
    maxTurn: Math.max(-1, Number(info.maxTurn) || 1),
    iconId: String(info.iconId || ""),
    list: [],
    categoryKeywordList: []
  };
  const entry = { id: bid, name: displayName || bid, desc: String(desc || "") };
  ensureLayout(dir, "buff");
  const files = [
    { rel: "custom_limbus_data/buff/" + bid + ".json", content: JSON.stringify({ list: [entity] }, null, 2) },
    { rel: "custom_limbus_locale/EN/bufList/" + bid + ".json", content: JSON.stringify({ [bid]: entry }, null, 2) },
    { rel: "custom_buffs/" + bid + ".txt", content: "" }
  ];
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  writeBuffMeta(letheRoot, modName, bid, {
    touch: true,
    info: {
      buffClass: entity.buffClass,
      buffType: entity.buffType,
      canBeDespelled: entity.canBeDespelled,
      maxStack: entity.maxStack,
      maxTurn: entity.maxTurn,
      iconId: entity.iconId,
      special: ""
    }
  });
  return { id: bid, entity, locale: entry, ...result };
}
function readModBuffLocale(letheRoot, mod) {
  const dir = (0, import_node_path17.join)(letheRoot, "mods", mod, "custom_limbus_locale", "EN", "bufList");
  const out2 = {};
  let names = [];
  try {
    names = (0, import_node_fs4.readdirSync)(dir);
  } catch {
    return out2;
  }
  for (const f of names) {
    if (!f.toLowerCase().endsWith(".json")) continue;
    const doc = readJson((0, import_node_path17.join)(dir, f), null);
    if (!doc || typeof doc !== "object") continue;
    for (const [k, v] of Object.entries(doc)) if (k && v && typeof v === "object") out2[k] = v;
  }
  return out2;
}
function importBuffs(letheRoot, { name, ids, source = { kind: "vanilla" } }) {
  const modName = cleanName(name, "Mod \u540D\u79F0");
  const dir = modDirSafe(letheRoot, modName);
  const idx = buffIndex(letheRoot);
  const list = (Array.isArray(ids) ? ids : [ids]).map(String).filter(Boolean);
  if (!list.length) throw new SafetyError("\u6CA1\u6709\u9009\u62E9\u8981\u5BFC\u5165\u7684 Buff");
  const files = [];
  for (const bid of list) {
    const rec = idx.byId.get(bid);
    if (!rec) throw new SafetyError("\u627E\u4E0D\u5230 Buff " + bid);
    if (source.kind === "mod" && rec.source !== "mod") throw new SafetyError("Buff " + bid + " \u4E0D\u5C5E\u4E8E\u81EA\u5B9A\u4E49 Mod");
    if (source.kind === "vanilla" && rec.source !== "vanilla") throw new SafetyError("Buff " + bid + " \u4E0D\u662F\u539F\u7248 Buff");
    const doc = readJson(rec.file, null);
    const ent = entitiesOf(doc).find((e) => String(e.id) === bid);
    if (!ent) throw new SafetyError("Buff \u6587\u4EF6\u91CC\u627E\u4E0D\u5230 " + bid);
    files.push({ rel: "custom_limbus_data/buff/" + bid + ".json", content: JSON.stringify({ list: [ent] }, null, 2) });
    const loc = source.kind === "mod" ? readModBuffLocale(letheRoot, rec.mod)[bid] : (readJson((0, import_node_path17.join)(letheRoot, "dumpedData", "limbus_locale", "EN", "bufList.json"), null) || {})[bid];
    if (loc) files.push({ rel: "custom_limbus_locale/EN/bufList/" + bid + ".json", content: JSON.stringify({ [bid]: loc }, null, 2) });
    files.push({ rel: "custom_buffs/" + bid + ".txt", content: "" });
  }
  ensureLayout(dir, "buff");
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  for (const bid of list) writeBuffMeta(letheRoot, modName, bid, { touch: true });
  return { imported: list, ...result };
}
function patchBuffMeta(letheRoot, modName, id, patch) {
  const change = writeBuffMeta(letheRoot, modName, id, patch);
  return { change, meta: change.doc };
}

// src/lethe/keywords.mjs
var import_node_fs5 = require("node:fs");
var import_node_path18 = require("node:path");

// src/knowledge/timings.mjs
var ENGINE_TIMINGS = [
  { "id": 0, "en": "StartBattle", "zh": "\u6218\u6597\u5F00\u59CB", "src": "game" },
  { "id": 1, "en": "WhenUse", "zh": "\u4F7F\u7528\u65F6", "src": "game" },
  { "id": 2, "en": "BeforeAttack", "zh": "\u653B\u51FB\u524D", "src": "game" },
  { "id": 3, "en": "StartDuel", "zh": "\u62FC\u70B9\u5F00\u59CB\u65F6", "src": "game" },
  { "id": 4, "en": "WinDuel", "zh": "\u62FC\u70B9\u80DC\u5229", "src": "game" },
  { "id": 5, "en": "DefeatDuel", "zh": "\u62FC\u70B9\u5931\u8D25", "src": "game" },
  { "id": 6, "en": "EndBattle", "zh": "\u56DE\u5408\u7ED3\u675F\u65F6", "src": "game" },
  { "id": 7, "en": "OnSucceedAttack", "zh": "\u547D\u4E2D\u65F6", "src": "game" },
  { "id": 8, "en": "WhenHit", "zh": "[\u88AB\u547D\u4E2D\u524D]", "src": "tutorial" },
  { "id": 9, "en": "EndSkill", "zh": "\u653B\u51FB\u540E", "src": "game" },
  { "id": 10, "en": "FakePower", "zh": "\u9884\u6D4B\u9636\u6BB5", "src": "tutorial" },
  { "id": 11, "en": "BeforeDefense", "zh": "", "src": "tutorial-native-off" },
  { "id": 12, "en": "OnDie", "zh": "", "src": "tutorial-native-off" },
  { "id": 13, "en": "OnOtherDie", "zh": "", "src": "tutorial-native-off" },
  { "id": 14, "en": "DuelClash", "zh": "\u62FC\u70B9\u8BA1\u6570", "src": "tutorial" },
  { "id": 15, "en": "AfterDuelClash", "zh": "", "src": "" },
  { "id": 16, "en": "OnSucceedEvade", "zh": "\u95EA\u907F\u6210\u529F\u65F6", "src": "game" },
  { "id": 17, "en": "OnDefeatEvade", "zh": "\u95EA\u907F\u5931\u8D25\u65F6", "src": "game" },
  { "id": 18, "en": "OnStartBehaviour", "zh": "[\u4F7F\u7528\u65F6]", "src": "tutorial" },
  { "id": 19, "en": "BeforeBehaviour", "zh": "[\u4F7F\u7528\u524D]", "src": "tutorial" },
  { "id": 20, "en": "OnEndBehaviour", "zh": "[\u653B\u51FB\u540E]", "src": "tutorial" },
  { "id": 21, "en": "EnemyKill", "zh": "\u51FB\u6740\u654C\u65B9\u65F6", "src": "game" },
  { "id": 22, "en": "OnBreak", "zh": "", "src": "tutorial-native-off" },
  { "id": 23, "en": "OnOtherBreak", "zh": "", "src": "tutorial-native-off" },
  { "id": 24, "en": "OnDiscard", "zh": "", "src": "tutorial-native-off" },
  { "id": 25, "en": "OnZeroHP", "zh": "", "src": "" },
  { "id": 26, "en": "EnemyEndSkill", "zh": "", "src": "tutorial-native-off" },
  { "id": 27, "en": "OnOtherBurst", "zh": "", "src": "" },
  { "id": 28, "en": "BeforeSA", "zh": "", "src": "tutorial-native-off" },
  { "id": 29, "en": "BeforeWhenHit", "zh": "[\u88AB\u547D\u4E2D\u524D]", "src": "tutorial" },
  { "id": 30, "en": "BeforeUse", "zh": "\u4F7F\u7528\u524D", "src": "game" },
  { "id": 31, "en": "Immortal", "zh": "", "src": "tutorial-native-off" },
  { "id": 32, "en": "ImmortalOther", "zh": "", "src": "tutorial-native-off" },
  { "id": 33, "en": "SpecialAction", "zh": "", "src": "tutorial-native-off" },
  { "id": 34, "en": "AfterSlots", "zh": "[\u56DE\u5408\u5F00\u59CB]", "src": "tutorial" },
  { "id": 35, "en": "AfterSlotsReady", "zh": "", "src": "" },
  { "id": 36, "en": "OnCoinToss", "zh": "\u5F53\u786C\u5E01\u88AB\u6295\u63B7\u65F6", "src": "tutorial" },
  { "id": 37, "en": "BeforeAnyFlip", "zh": "", "src": "" },
  { "id": 38, "en": "StartBattleSkill", "zh": "", "src": "" },
  { "id": 39, "en": "OnBurst", "zh": "", "src": "" },
  { "id": 40, "en": "StartVisualCoinToss", "zh": "", "src": "tutorial-native-off" },
  { "id": 41, "en": "StartVisualSkillUse", "zh": "", "src": "tutorial-native-off" },
  { "id": 42, "en": "VisualEndBehaviour", "zh": "", "src": "" },
  { "id": 43, "en": "WhenGained", "zh": "", "src": "" },
  { "id": 44, "en": "ChangeMotion", "zh": "", "src": "" },
  { "id": 45, "en": "IgnorePanic", "zh": "\u6050\u614C\u65F6", "src": "tutorial" },
  { "id": 46, "en": "IgnoreBreak", "zh": "\u6DF7\u4E71\u65F6", "src": "tutorial" },
  { "id": 47, "en": "OnRetreat", "zh": "", "src": "" },
  { "id": 48, "en": "OnGainBuff", "zh": "", "src": "" },
  { "id": 49, "en": "OnUseBuff", "zh": "", "src": "" },
  { "id": 50, "en": "EncounterStart", "zh": "", "src": "" },
  { "id": 51, "en": "WinParrying", "zh": "", "src": "" },
  { "id": 52, "en": "DefeatParrying", "zh": "", "src": "" },
  { "id": 53, "en": "ChangeTakeDamage", "zh": "", "src": "" },
  { "id": 54, "en": "OnCoinAfterAttack", "zh": "", "src": "" },
  { "id": 55, "en": "EnemyStartBehaviour", "zh": "", "src": "" },
  { "id": 56, "en": "AfterChangeShield", "zh": "", "src": "" },
  { "id": 57, "en": "AfterChangeHP", "zh": "", "src": "" },
  { "id": 58, "en": "BeforeChangeSanity", "zh": "", "src": "" },
  { "id": 59, "en": "AfterChangeSanity", "zh": "", "src": "" },
  { "id": 60, "en": "CanDealTarget", "zh": "", "src": "" },
  { "id": 61, "en": "DelayedStart", "zh": "", "src": "" },
  { "id": 62, "en": "StartVisualDuelEnd", "zh": "", "src": "" },
  { "id": 63, "en": "StartVisualGiveDamage", "zh": "", "src": "" },
  { "id": 64, "en": "StartVisualDuel", "zh": "", "src": "" },
  { "id": 65, "en": "StartVisualDie", "zh": "", "src": "" },
  { "id": 66, "en": "StartVisualPartDestroy", "zh": "", "src": "" },
  { "id": 67, "en": "StartVisualChaseTarget", "zh": "", "src": "" },
  { "id": 68, "en": "BufMaxStackAdder", "zh": "", "src": "" },
  { "id": 69, "en": "BufMaxTurnAdder", "zh": "", "src": "" },
  { "id": 70, "en": "ChangeAttackDamage", "zh": "", "src": "" },
  { "id": 71, "en": "BuffActivate", "zh": "", "src": "" },
  { "id": 72, "en": "EGOCost", "zh": "", "src": "" },
  { "id": 73, "en": "EGOCostMP", "zh": "", "src": "" },
  { "id": 74, "en": "ExpectedBasePower", "zh": "", "src": "" },
  { "id": 75, "en": "DefenseCycle", "zh": "", "src": "" },
  { "id": 76, "en": "DefenseSwitch", "zh": "", "src": "" },
  { "id": 77, "en": "TryForcedCoinResult", "zh": "", "src": "" },
  { "id": 78, "en": "OnInit", "zh": "", "src": "" },
  { "id": 79, "en": "CanDuel", "zh": "", "src": "" },
  { "id": 80, "en": "IsIgnoreDefense", "zh": "", "src": "" },
  { "id": 81, "en": "IsIgnoreSupportiveDefense", "zh": "", "src": "" },
  { "id": 82, "en": "SkillStaggerVictim", "zh": "", "src": "" },
  { "id": 83, "en": "OnFieldedFromBackup", "zh": "", "src": "" },
  { "id": 84, "en": "OnReturnFromRetreat", "zh": "", "src": "" },
  { "id": -1, "en": "RoundStart", "zh": "[\u56DE\u5408\u5F00\u59CB]", "src": "tutorial" }
];
var TIMING_BY_ID = new Map(ENGINE_TIMINGS.map((t) => [t.id, t]));
var TIMING_BY_EN = new Map(ENGINE_TIMINGS.map((t) => [t.en, t]));
var TIMING_BY_ZH = new Map(ENGINE_TIMINGS.filter((t) => t.zh).map((t) => [t.zh, t]));

// src/lethe/keywords.mjs
var strip = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/^\[/, "").replace(/\]$/, "").trim();
function readJsonSafe(p) {
  try {
    return JSON.parse((0, import_node_fs5.readFileSync)(p, "utf8"));
  } catch {
    return null;
  }
}
function entriesOf(doc) {
  if (!doc) return [];
  if (Array.isArray(doc)) return doc;
  if (Array.isArray(doc.list)) return doc.list;
  if (typeof doc !== "object") return [];
  return Object.entries(doc).map(([k, v]) => v && typeof v === "object" ? { id: k, ...v } : { id: k, name: v });
}
var hasCjk = (s) => /[\u3400-\u9fff]/.test(s);
var cache5 = /* @__PURE__ */ new Map();
function stampOf4(letheRoot) {
  const parts = [];
  const push = (p) => {
    try {
      const s = (0, import_node_fs5.statSync)(p);
      parts.push(`${p}:${s.mtimeMs}`);
    } catch {
      parts.push(`${p}:-`);
    }
  };
  const en = (0, import_node_path18.join)(letheRoot, "dumpedData", "limbus_locale", "EN");
  push((0, import_node_path18.join)(en, "skillTagList.json"));
  push((0, import_node_path18.join)(en, "bufList.json"));
  push((0, import_node_path18.join)(en, "keywordList.json"));
  push((0, import_node_path18.join)(en, "attributeList.json"));
  push((0, import_node_path18.join)(letheRoot, "mods"));
  return parts.join("|");
}
function pushName(map, name, id) {
  const key = strip(name);
  if (!key || !hasCjk(key)) return;
  if (String(id || "") === key) return;
  const cur = map.get(key);
  if (!cur) map.set(key, [String(id)]);
  else if (!cur.includes(String(id))) cur.push(String(id));
}
function keywordTables(letheRoot) {
  const stamp2 = stampOf4(letheRoot);
  const hit = cache5.get(letheRoot);
  if (hit && hit.stamp === stamp2) return hit.tables;
  const en = (0, import_node_path18.join)(letheRoot, "dumpedData", "limbus_locale", "EN");
  const tagById = /* @__PURE__ */ new Map();
  for (const e of entriesOf(readJsonSafe((0, import_node_path18.join)(en, "skillTagList.json")))) {
    const id = String(e.id ?? "");
    const zh = strip(e.name);
    if (id) tagById.set(id, zh);
  }
  const timings = ENGINE_TIMINGS.map((t) => ({ id: t.id, en: t.en, zh: t.zh || tagById.get(t.en) || "" }));
  const timingIds = new Set(timings.map((t) => t.en));
  const sinNames = /* @__PURE__ */ new Set(["\u66B4\u6012", "\u8272\u6B32", "\u6020\u60F0", "\u66B4\u98DF", "\u5FE7\u90C1", "\u50B2\u6162", "\u5AC9\u5992", "\u75AF\u72C2", "\u54C0\u53F9"]);
  const TIMING_LIKE = /时$|后$|开始时$|结束时$|前$|计数$|阶段$/;
  const displayTimings = [];
  const tags = [];
  const sins = [];
  for (const [id, zh] of tagById) {
    if (timingIds.has(id)) continue;
    if (sinNames.has(zh)) {
      sins.push({ id, zh });
      continue;
    }
    const clean = String(zh || "").replace(/^\[|\]$/g, "").trim();
    if (clean && TIMING_LIKE.test(clean)) {
      displayTimings.push({ id, zh: clean });
      continue;
    }
    tags.push({ id, zh });
  }
  displayTimings.sort((a, b) => String(a.zh).localeCompare(String(b.zh), "zh"));
  tags.sort((a, b) => (a.zh || "~").localeCompare(b.zh || "~", "zh"));
  sins.sort((a, b) => String(a.zh).localeCompare(String(b.zh), "zh"));
  const buffNameIds = /* @__PURE__ */ new Map();
  const buffIds = /* @__PURE__ */ new Map();
  const addBuff = (id, name) => {
    const key = String(id || "").trim();
    if (!key) return;
    const zh = strip(name);
    if (zh && !buffIds.has(key)) buffIds.set(key, zh);
    if (zh) pushName(buffNameIds, zh, key);
  };
  for (const e of entriesOf(readJsonSafe((0, import_node_path18.join)(en, "bufList.json")))) addBuff(e.id, e.name);
  let modNames = [];
  try {
    modNames = (0, import_node_fs5.readdirSync)((0, import_node_path18.join)(letheRoot, "mods"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
  }
  for (const mod of modNames) {
    const base = (0, import_node_path18.join)(letheRoot, "mods", mod);
    for (const dir of ["bufList", "keywordList"]) {
      const p = (0, import_node_path18.join)(base, "custom_limbus_locale", "EN", dir);
      if (!(0, import_node_fs5.existsSync)(p)) continue;
      for (const f of (0, import_node_fs5.readdirSync)(p)) {
        for (const e of entriesOf(readJsonSafe((0, import_node_path18.join)(p, f)))) addBuff(e.id, e.name);
      }
    }
    const cb = (0, import_node_path18.join)(base, "custom_buffs");
    if ((0, import_node_fs5.existsSync)(cb)) {
      for (const f of (0, import_node_fs5.readdirSync)(cb)) if (/\.txt$/i.test(f)) addBuff(f.replace(/\.txt$/i, ""), "");
    }
  }
  const kwNameIds = /* @__PURE__ */ new Map();
  const kwIds = /* @__PURE__ */ new Map();
  const addKw = (id, name) => {
    const key = String(id || "").trim();
    if (!key) return;
    const zh = strip(name);
    if (zh && !kwIds.has(key)) kwIds.set(key, zh);
    if (zh) pushName(kwNameIds, zh, key);
  };
  for (const e of entriesOf(readJsonSafe((0, import_node_path18.join)(en, "keywordList.json")))) addKw(e.id, e.name);
  for (const mod of modNames) {
    const p = (0, import_node_path18.join)(letheRoot, "mods", mod, "custom_limbus_locale", "EN", "keywordList");
    if (!(0, import_node_fs5.existsSync)(p)) continue;
    for (const f of (0, import_node_fs5.readdirSync)(p)) for (const e of entriesOf(readJsonSafe((0, import_node_path18.join)(p, f)))) addKw(e.id, e.name);
  }
  const buffs = [...buffNameIds.entries()].map(([zh, ids]) => ({ zh, id: ids[0], ids })).sort((a, b) => a.zh.localeCompare(b.zh, "zh"));
  const keywords = [...kwNameIds.entries()].map(([zh, ids]) => ({ zh, id: ids[0], ids })).sort((a, b) => a.zh.localeCompare(b.zh, "zh"));
  const tables = {
    timings,
    displayTimings,
    tags,
    sins,
    buffs,
    keywords,
    buffIds: [...buffIds.entries()].map(([id, zh]) => ({ id, zh })),
    keywordIds: [...kwIds.entries()].map(([id, zh]) => ({ id, zh })),
    stats: {
      timings: timings.length,
      timingsWithZh: timings.filter((t) => t.zh).length,
      displayTimings: displayTimings.length,
      tags: tags.length,
      sins: sins.length,
      buffNames: buffs.length,
      buffIds: buffIds.size,
      keywordNames: keywords.length,
      keywordIds: kwIds.size,
      ambiguousBuffNames: buffs.filter((b) => b.ids.length > 1).length,
      ambiguousKeywordNames: keywords.filter((k) => k.ids.length > 1).length
    }
  };
  cache5.set(letheRoot, { stamp: stamp2, tables });
  return tables;
}
var TOKEN = /\[([^\[\]\r\n]{1,80})\]/g;
function analyzeDescription(text, tables) {
  const timingByZh = /* @__PURE__ */ new Map();
  const timingByEn = /* @__PURE__ */ new Map();
  for (const t of tables.timings) {
    if (t.zh) timingByZh.set(t.zh, t);
    timingByEn.set(t.en, t);
  }
  const tagByZh = new Map(tables.tags.map((t) => [t.zh, t]));
  const tagById = new Map(tables.tags.map((t) => [t.id, t]));
  const dTimingByZh = new Map((tables.displayTimings || []).filter((t) => t.zh).map((t) => [t.zh, t]));
  const dTimingById = new Map((tables.displayTimings || []).map((t) => [t.id, t]));
  const buffByZh = new Map(tables.buffs.map((b) => [b.zh, b]));
  const buffById = new Map(tables.buffIds.map((b) => [b.id, b]));
  const kwByZh = new Map(tables.keywords.map((k) => [k.zh, k]));
  const kwById = new Map(tables.keywordIds.map((k) => [k.id, k]));
  const tokens = [];
  const unknown = [];
  const counts = { timing: 0, tag: 0, buff: 0, keyword: 0, unknown: 0 };
  String(text ?? "").replace(TOKEN, (raw, name) => {
    const key = name.trim();
    let kind = "unknown";
    let id = "";
    let candidates = [];
    let sub = false;
    const t = timingByZh.get(key) || timingByEn.get(key);
    if (t) {
      kind = "timing";
      id = t.en;
      candidates = [t.en];
    } else {
      const dt = dTimingByZh.get(key) || dTimingById.get(key);
      if (dt) {
        kind = "timing";
        id = dt.id;
        candidates = [dt.id];
        sub = true;
      }
    }
    if (kind === "unknown") {
      const g = tagByZh.get(key) || tagById.get(key);
      if (g) {
        kind = "tag";
        id = g.id;
        candidates = [g.id];
      } else {
        const b = buffByZh.get(key);
        if (b) {
          kind = "buff";
          id = b.id;
          candidates = b.ids;
        } else if (buffById.has(key)) {
          kind = "buff";
          id = key;
          candidates = [key];
        } else {
          const k = kwByZh.get(key);
          if (k) {
            kind = "keyword";
            id = k.id;
            candidates = k.ids;
          } else if (kwById.has(key)) {
            kind = "keyword";
            id = key;
            candidates = [key];
          }
        }
      }
    }
    counts[kind] = (counts[kind] || 0) + 1;
    tokens.push({ raw, name: key, kind, id, candidates, ...sub ? { sub: true } : {} });
    if (kind === "unknown") unknown.push(key);
    return raw;
  });
  return { tokens, unknown: [...new Set(unknown)], counts };
}
function toGameText(text, tables) {
  const display = tables.displayTimings || [];
  const timingByZh = new Map([
    ...display.filter((t) => t.zh).map((t) => [t.zh, t.id]),
    ...tables.timings.filter((t) => t.zh).map((t) => [t.zh, t.en])
  ]);
  const knownIds = /* @__PURE__ */ new Set([
    ...tables.timings.map((t) => t.en),
    ...display.map((t) => t.id),
    ...tables.tags.map((t) => t.id),
    ...tables.buffIds.map((b) => b.id),
    ...tables.keywordIds.map((k) => k.id)
  ]);
  const buffByZh = new Map(tables.buffs.map((b) => [b.zh, b.id]));
  const tagByZh = new Map(tables.tags.map((t) => [t.zh, t.id]));
  const kwByZh = new Map(tables.keywords.map((k) => [k.zh, k.id]));
  return String(text ?? "").replace(TOKEN, (raw, name) => {
    const key = name.trim();
    if (timingByZh.has(key)) return `[${timingByZh.get(key)}]`;
    if (knownIds.has(key)) return `[${key}]`;
    if (tagByZh.has(key)) return `[${tagByZh.get(key)}]`;
    if (buffByZh.has(key)) return `[${buffByZh.get(key)}]`;
    if (kwByZh.has(key)) return `[${kwByZh.get(key)}]`;
    return raw;
  });
}

// src/server/api-shared.mjs
function createApi(table) {
  const routes = /* @__PURE__ */ new Map();
  for (const [key, fn] of Object.entries(table)) {
    const [method, path] = key.split(" ");
    routes.set(`${method} ${path}`, fn);
  }
  return async function dispatch(method, pathname, query, body) {
    const fn = routes.get(`${method} ${pathname}`);
    if (!fn) return { __miss: true };
    return method === "GET" ? fn(query) : fn(body);
  };
}

// src/server/api.mjs
function buildApi(ctx) {
  const { state, log, session, autosave } = ctx;
  const need = () => {
    if (!state.letheRoot) {
      const err = new Error("\u8FD8\u6CA1\u6709\u5B9A\u4F4D\u5230\u79C1\u670D\u3002\u8BF7\u5148\u5728\u201C\u8BBE\u7F6E\u201D\u91CC\u6307\u5B9A Lethe \u76EE\u5F55\u3002");
      err.status = 428;
      throw err;
    }
    return { letheRoot: state.letheRoot, gameRoot: state.gameRoot };
  };
  const keyOf = (q, body) => {
    const mod = body?.name || q?.get("name") || "";
    const key = body?.key || q?.get("key") || "";
    return { mod, key };
  };
  const patchSkillMetaSafe = (letheRoot, mod, id, patch) => {
    const before = readSkillMeta(letheRoot, mod, id);
    const change = writeSkillMeta(letheRoot, mod, id, patch);
    return { before, change };
  };
  const api = {
    "GET /api/health": () => ({ ok: true, app: "The Lethe Workbench", version: ctx.version }),
    "GET /api/status": () => ({
      ok: true,
      version: ctx.version,
      appRoot: APP_ROOT,
      userDataDir: USER_DATA_DIR,
      configPath: configPath(),
      letheRoot: state.letheRoot,
      gameRoot: state.gameRoot,
      locatedAt: state.locatedAt,
      source: state.source,
      theme: state.config?.theme || "dark",
      editorName: readState(state.letheRoot || "").editorName || "\u4F46\u4E01"
    }),
    "GET /api/home": () => {
      let stats = null;
      if (state.letheRoot) {
        try {
          stats = homeStats(state.letheRoot, state.gameRoot);
        } catch (err) {
          stats = { error: err.message };
        }
      }
      return {
        ok: true,
        letheRoot: state.letheRoot || "",
        gameRoot: state.gameRoot || "",
        editorName: readState(state.letheRoot || "").editorName || "\u4F46\u4E01",
        stats
      };
    },
    "POST /api/locate": async (body) => {
      const result = locate({
        explicit: body.path || body.explicit,
        config: state.config,
        quick: body.quick !== false,
        budgetMs: Number(body.budgetMs) || 8e3
      });
      if (result.best) {
        state.letheRoot = result.best.letheRoot;
        state.gameRoot = result.best.gameRoot;
        state.locatedAt = (/* @__PURE__ */ new Date()).toISOString();
        state.source = result.best.from;
        markRunning(state.letheRoot);
        state.config = rememberRoot(result.best.gameRoot || result.best.letheRoot);
        log?.(`\u5B9A\u4F4D\u6210\u529F\uFF1A${state.letheRoot}`);
      }
      return { ok: Boolean(result.best), best: result.best, candidates: result.candidates, tried: result.tried, stats: { ...scanStats } };
    },
    "POST /api/root": async (body) => {
      const result = locate({ explicit: body.path, config: state.config, quick: true });
      if (!result.best) {
        const err = new Error("\u8FD9\u4E2A\u76EE\u5F55\u4E0D\u50CF Lethe \u7684\u6839\u76EE\u5F55\uFF08\u5E94\u5305\u542B mods \u6216 dumpedData\uFF09");
        err.status = 400;
        throw err;
      }
      state.letheRoot = result.best.letheRoot;
      state.gameRoot = result.best.gameRoot;
      state.locatedAt = (/* @__PURE__ */ new Date()).toISOString();
      state.source = "manual";
      markRunning(state.letheRoot);
      state.config = rememberRoot(result.best.gameRoot || result.best.letheRoot);
      return { ok: true, ...result.best };
    },
    "POST /api/config": async (body) => {
      state.config = saveConfig(body || {});
      if (body && typeof body.editorName === "string" && state.letheRoot) {
        updateState(state.letheRoot, (st) => ({ ...st, editorName: body.editorName.trim() || "\u4F46\u4E01" }));
      }
      return { ok: true, config: state.config };
    },
    "GET /api/mods": () => {
      const { letheRoot } = need();
      return { ok: true, mods: listMods(letheRoot) };
    },
    "GET /api/mod": (q) => {
      const { letheRoot } = need();
      const name = q.get("name");
      const found = resolveModDir(letheRoot, name);
      const payload = readModPayload(found.dir);
      const backups = listUserBackups(letheRoot, name);
      return {
        ok: true,
        name: found.name,
        dir: found.dir,
        enabled: !found.disabled,
        personalities: payload.personalities,
        sprites: payload.sprites,
        dataCategories: Object.keys(payload.data),
        localeCategories: Object.keys(payload.locales.EN || {}),
        backups,
        autoSave: slotInfo((0, import_node_path19.join)(autoBackupsDir(letheRoot), found.name))
      };
    },
    "POST /api/mod/create": async (body) => {
      const { letheRoot } = need();
      const created = createMod(letheRoot, body);
      return { ok: true, mod: created };
    },
    "POST /api/mod/disable": async (body) => {
      const { letheRoot } = need();
      return { ok: true, mod: disableMod(letheRoot, body.name) };
    },
    "POST /api/mod/enable": async (body) => {
      const { letheRoot } = need();
      return { ok: true, mod: enableMod(letheRoot, body.name) };
    },
    "POST /api/mod/backup": async (body) => {
      const { letheRoot } = need();
      return { ok: true, backup: createUserBackup(letheRoot, body.name) };
    },
    "GET /api/backup/read": (q) => {
      const { letheRoot } = need();
      return { ok: true, backup: readBackupPayload(letheRoot, q.get("name"), q.get("label")) };
    },
    "POST /api/mod/swap": async (body) => {
      const { letheRoot } = need();
      const result = swapBackup(letheRoot, body.name, body.label);
      session.clear(body.name);
      autosave.stop(body.name);
      return { ok: true, ...result };
    },
    /* ---------- 编辑会话：撤销 / 重做 / 保存点 ---------- */
    "GET /api/session": (q) => {
      const { letheRoot } = need();
      const { mod, key } = keyOf(q);
      return {
        ok: true,
        session: session.state(mod),
        target: key ? { canUndo: session.canUndo(mod, key), canRedo: session.canRedo(mod, key) } : null,
        autoSave: autosave.slot(mod)
      };
    },
    "POST /api/undo": async (body) => {
      const { mod, key } = keyOf(null, body);
      if (!mod || !key) {
        const e = new Error("\u64A4\u9500\u9700\u8981\u6307\u5B9A Mod \u4E0E\u7F16\u8F91\u76EE\u6807");
        e.status = 400;
        throw e;
      }
      return { ok: true, ...session.undo(mod, key) };
    },
    "POST /api/redo": async (body) => {
      const { mod, key } = keyOf(null, body);
      if (!mod || !key) {
        const e = new Error("\u91CD\u505A\u9700\u8981\u6307\u5B9A Mod \u4E0E\u7F16\u8F91\u76EE\u6807");
        e.status = 400;
        throw e;
      }
      return { ok: true, ...session.redo(mod, key) };
    },
    "POST /api/autosave/now": async (body) => {
      const { mod } = keyOf(null, body);
      const result = autosave.runNow(mod);
      return { ok: Boolean(result.ok), result, status: autosave.status() };
    },
    "GET /api/autosave": (q) => {
      const { mod } = keyOf(q);
      return { ok: true, status: autosave.status(), slot: mod ? autosave.slot(mod) : null };
    },
    /* ---------- 崩溃恢复 ---------- */
    "GET /api/recover-check": () => {
      const { letheRoot } = need();
      const marker = readSessionMarker(letheRoot);
      const unclean = Boolean(marker && marker.running && marker.pid !== process.pid);
      const mods = [];
      try {
        for (const d of fs13.readdirSync(autoBackupsDir(letheRoot), { withFileTypes: true })) {
          if (!d.isDirectory()) continue;
          const info = slotInfo((0, import_node_path19.join)(autoBackupsDir(letheRoot), d.name));
          if (info) mods.push({ name: d.name, ...info });
        }
      } catch {
      }
      return { ok: true, unclean, marker, mods };
    },
    "POST /api/recover": async (body) => {
      const { letheRoot } = need();
      const mod = body.name;
      const { dir } = resolveModDir(letheRoot, mod);
      const slot = (0, import_node_path19.join)(autoBackupsDir(letheRoot), mod);
      const safety = (0, import_node_path19.join)(journalDir(letheRoot), "recover", `${mod}-${Date.now()}`);
      fs13.mkdirSync((0, import_node_path19.join)(safety, ".."), { recursive: true });
      fs13.cpSync(dir, safety, { recursive: true });
      const result = restoreFromSlot(slot, dir);
      markCleanExit(letheRoot);
      return { ok: true, mod, ...result, safetyCopy: safety };
    },
    /* ---------- DLL ---------- */
    "GET /api/dlls": () => {
      const { gameRoot, letheRoot } = need();
      const dlls = listDlls(gameRoot).map((d) => ({ ...d, backups: listDllBackups(letheRoot, d.file) }));
      return { ok: true, dlls, plugins: (0, import_node_path19.join)(gameRoot, "BepInEx", "plugins") };
    },
    "POST /api/dll/toggle": async (body) => {
      const { gameRoot } = need();
      return { ok: true, dll: setDllEnabled(gameRoot, body.file, Boolean(body.enabled)) };
    },
    "POST /api/dll/backup": async (body) => {
      const { gameRoot, letheRoot } = need();
      return { ok: true, backup: createDllBackup(gameRoot, letheRoot, body.file) };
    },
    "GET /api/dll/backups": (q) => {
      const { letheRoot } = need();
      return { ok: true, backups: listDllBackups(letheRoot, q.get("file") || "") };
    },
    /* ---------- 人格 ---------- */
    "GET /api/personalities": (q) => {
      const { letheRoot } = need();
      const vanilla = vanillaIndex(letheRoot);
      const name = q.get("name");
      const custom = name ? listPersonalities(letheRoot, name) : [];
      return {
        ok: true,
        characters: vanilla.characters.length ? vanilla.characters : fallbackCharacters(),
        custom,
        vanillaCount: vanilla.personalities.length,
        vanillaAvailable: vanilla.available
      };
    },
    "GET /api/vanilla": (q) => {
      const { letheRoot } = need();
      const idx = vanillaIndex(letheRoot);
      const cid = Number(q.get("characterId") || 0);
      const list = idx.personalities.filter((p) => !cid || p.characterId === cid).map((p) => ({ id: p.id, characterId: p.characterId, name: p.name, title: p.title, rank: p.rank }));
      return { ok: true, characters: idx.characters, personalities: list };
    },
    "GET /api/personality": (q) => {
      const { letheRoot } = need();
      const one = getPersonality(letheRoot, q.get("name"), q.get("id"));
      if (!one) {
        const err = new Error("\u627E\u4E0D\u5230\u8FD9\u4E2A\u4EBA\u683C");
        err.status = 404;
        throw err;
      }
      return { ok: true, personality: one };
    },
    /** 编辑即应用：写入变化字段，记录一个撤销步骤 */
    "POST /api/personality/patch": async (body) => {
      const { letheRoot } = need();
      const result = savePersonality(letheRoot, body);
      const key = `personality:${body.id}`;
      if (result.changed) {
        session.record(body.name, key, `\u7F16\u8F91\u4EBA\u683C ${body.id}`, result.changes || []);
        autosave.touch(body.name);
      }
      return { ok: true, ...result, session: session.state(body.name) };
    },
    /** 保存点：清空该人格的撤销/重做栈（符合“保存成功后撤销栈清空”） */
    "POST /api/personality/save": async (body) => {
      session.clear(body.name, `personality:${body.id}`);
      return { ok: true, committed: true, session: session.state(body.name) };
    },
    "POST /api/personality/create": async (body) => {
      const { letheRoot } = need();
      const created = createPersonality(letheRoot, body);
      return { ok: true, personality: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },
    /* ---------- 技能编辑（v0.3） ---------- */
    "GET /api/keywords": () => {
      const { letheRoot } = need();
      const t = keywordTables(letheRoot);
      return {
        ok: true,
        timings: t.timings.map((x) => ({ id: x.id, en: x.en, zh: x.zh })),
        displayTimings: t.displayTimings,
        tags: t.tags,
        sins: t.sins,
        buffs: t.buffs,
        keywords: t.keywords.map((x) => ({ id: x.id, zh: x.zh })),
        stats: t.stats,
        physical: PHYSICAL_TYPES,
        sin: SIN_TYPES,
        coinColors: COIN_COLORS,
        passiveConditions: PASSIVE_CONDITION_TYPES,
        buffClasses: BUFF_CLASSES,
        buffTypes: BUFF_TYPES,
        moduleKinds: MODULE_KINDS,
        passiveDefaults: DEFAULT_PASSIVE_INFO,
        buffDefaults: DEFAULT_BUFF_INFO
      };
    },
    "POST /api/description/check": (body) => {
      const { letheRoot } = need();
      const tables = keywordTables(letheRoot);
      const text = String(body?.text ?? "");
      const res = analyzeDescription(text, tables);
      return { ok: true, ...res, game: toGameText(text, tables) };
    },
    "GET /api/skills": (q) => {
      const { letheRoot } = need();
      const name = q.get("name") || "";
      return {
        ok: true,
        skills: name ? listSkills(letheRoot, name) : [],
        modules: listModules(letheRoot),
        defaults: DEFAULT_INFO
      };
    },
    "GET /api/skill": (q) => {
      const { letheRoot } = need();
      const one = getSkill(letheRoot, q.get("name"), q.get("id"));
      if (!one) {
        const e = new Error("\u627E\u4E0D\u5230\u8FD9\u4E2A\u6280\u80FD");
        e.status = 404;
        throw e;
      }
      const lv = one.locale && one.locale.levelList || [];
      const name = lv[0] && lv[0].name || one.locale && one.locale.name || "";
      return {
        ok: true,
        skill: {
          id: one.id,
          rel: one.rel,
          name,
          override: Boolean(one.override),
          hasLocale: Boolean(one.locale),
          updatedAt: one.meta.updatedAt || "",
          info: one.meta.info,
          code: one.meta.code,
          description: one.meta.description,
          coinDescs: one.meta.coinDescs
        }
      };
    },
    "POST /api/skill/create": (body) => {
      const { letheRoot } = need();
      const created = createSkill(letheRoot, { name: body.name, id: body.id, displayName: body.displayName });
      return { ok: true, skill: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },
    "POST /api/skill/meta": (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const patch = {};
      if (body.info) patch.info = body.info;
      if (body.description !== void 0) patch.description = String(body.description);
      if (Array.isArray(body.coinDescs)) patch.coinDescs = body.coinDescs.map((x) => String(x ?? ""));
      const res = patchSkillMetaSafe(letheRoot, body.name, id, patch);
      if (res.change && res.change.before !== res.change.after) {
        session.record(body.name, "skill:" + id, "\u7F16\u8F91\u6280\u80FD " + id, [{ rel: null, abs: res.change.abs, before: res.change.before, after: res.change.after }]);
        autosave.touch(body.name);
      }
      return { ok: true, meta: res.change.doc, session: session.state(body.name) };
    },
    "POST /api/skill/code": (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const meta = readSkillMeta(letheRoot, body.name, id);
      const change = writeSkillCode(letheRoot, body.name, id, { ...body.code || {}, coinCount: body.code && body.code.coins ? body.code.coins.length : meta.info.coinCount });
      const merged = readSkillMeta(letheRoot, body.name, id);
      return { ok: true, meta: merged, changed: change.before !== change.after };
    },
    "POST /api/skill/save": (body) => {
      const id = String(body.id);
      session.clear(body.name, "skill:" + id);
      return { ok: true, committed: true, session: session.state(body.name) };
    },
    "GET /api/skill-search": (q) => {
      const { letheRoot } = need();
      return { ok: true, results: searchSkillIndex(letheRoot, q.get("q") || "", Number(q.get("limit") || 60)) };
    },
    "GET /api/vanilla-skills": (q) => {
      const { letheRoot } = need();
      return { ok: true, skills: skillsOfVanillaPersonality(letheRoot, q.get("personalityId")) };
    },
    "POST /api/skill/import": (body) => {
      const { letheRoot } = need();
      const res = importSkills(letheRoot, { name: body.name, ids: body.ids, source: body.source || { kind: "vanilla" } });
      return { ok: true, ...res };
    },
    /* ---------- 模块编辑（v0.4） ---------- */
    "GET /api/modules": () => {
      const { letheRoot } = need();
      return { ok: true, modules: listModules(letheRoot) };
    },
    "GET /api/module": (q) => {
      const { letheRoot } = need();
      const one = getModule(letheRoot, q.get("id"));
      if (!one) {
        const e = new Error("\u627E\u4E0D\u5230\u8FD9\u4E2A\u6A21\u5757");
        e.status = 404;
        throw e;
      }
      return { ok: true, module: one };
    },
    "POST /api/module/create": (body) => {
      const { letheRoot } = need();
      const one = createModule(letheRoot, { name: body.name, desc: body.desc, prefix: body.prefix, kind: body.kind });
      return { ok: true, module: one };
    },
    "POST /api/module/save": (body) => {
      const { letheRoot } = need();
      const one = updateModule(letheRoot, body.id, { name: body.name, desc: body.desc, prefix: body.prefix, kind: body.kind });
      return { ok: true, module: one };
    },
    "POST /api/module/delete": (body) => {
      const { letheRoot } = need();
      return { ok: true, ...deleteModule(letheRoot, body.id) };
    },
    /* ---------- 被动编辑（v0.4） ---------- */
    "GET /api/passives": (q) => {
      const { letheRoot } = need();
      const name = q.get("name") || "";
      return {
        ok: true,
        passives: name ? listPassives(letheRoot, name) : [],
        modules: listModules(letheRoot),
        defaults: DEFAULT_PASSIVE_INFO
      };
    },
    "GET /api/passive": (q) => {
      const { letheRoot } = need();
      const one = getPassive(letheRoot, q.get("name"), q.get("id"));
      if (!one) {
        const e = new Error("\u627E\u4E0D\u5230\u8FD9\u4E2A\u88AB\u52A8");
        e.status = 404;
        throw e;
      }
      return {
        ok: true,
        passive: {
          id: one.id,
          rel: one.rel,
          name: one.locale && one.locale.name || "",
          override: Boolean(one.override),
          hasLocale: Boolean(one.locale),
          updatedAt: one.meta.updatedAt || "",
          info: one.meta.info,
          code: one.meta.code,
          description: one.meta.description
        }
      };
    },
    "POST /api/passive/create": (body) => {
      const { letheRoot } = need();
      const created = createPassive(letheRoot, { name: body.name, id: body.id, displayName: body.displayName, desc: body.desc });
      return { ok: true, passive: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },
    "POST /api/passive/meta": (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const patch = {};
      if (body.info) patch.info = body.info;
      if (body.description !== void 0) patch.description = String(body.description);
      const before = readPassiveMeta(letheRoot, body.name, id);
      const res = patchPassiveMeta(letheRoot, body.name, id, patch);
      if (res.change && res.change.before !== res.change.after) {
        session.record(body.name, "passive:" + id, "\u7F16\u8F91\u88AB\u52A8 " + id, [{ rel: null, abs: res.change.abs, before: res.change.before, after: res.change.after }]);
        autosave.touch(body.name);
      }
      return { ok: true, meta: res.meta, session: session.state(body.name) };
    },
    "POST /api/passive/code": (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const change = writePassiveMeta(letheRoot, body.name, id, { code: body.code || {} });
      return { ok: true, meta: change.doc, changed: change.before !== change.after };
    },
    "POST /api/passive/save": (body) => {
      const id = String(body.id);
      session.clear(body.name, "passive:" + id);
      return { ok: true, committed: true, session: session.state(body.name) };
    },
    "GET /api/passive-search": (q) => {
      const { letheRoot } = need();
      return { ok: true, results: searchPassiveIndex(letheRoot, q.get("q") || "", Number(q.get("limit") || 80)) };
    },
    "POST /api/passive/import": (body) => {
      const { letheRoot } = need();
      const res = importPassives(letheRoot, { name: body.name, ids: body.ids, source: body.source || { kind: "vanilla" } });
      return { ok: true, ...res };
    },
    /* ---------- Buff 编辑（v0.4） ---------- */
    "GET /api/buffs": (q) => {
      const { letheRoot } = need();
      const name = q.get("name") || "";
      return {
        ok: true,
        buffs: name ? listBuffs(letheRoot, name) : [],
        modules: listModules(letheRoot),
        defaults: DEFAULT_BUFF_INFO
      };
    },
    "GET /api/buff": (q) => {
      const { letheRoot } = need();
      const one = getBuff(letheRoot, q.get("name"), q.get("id"));
      if (!one) {
        const e = new Error("\u627E\u4E0D\u5230\u8FD9\u4E2A Buff");
        e.status = 404;
        throw e;
      }
      return {
        ok: true,
        buff: {
          id: one.id,
          rel: one.rel,
          name: one.locale && one.locale.name || "",
          override: Boolean(one.override),
          hasLocale: Boolean(one.locale),
          updatedAt: one.meta.updatedAt || "",
          info: one.meta.info,
          code: one.meta.code,
          description: one.meta.description
        }
      };
    },
    "POST /api/buff/create": (body) => {
      const { letheRoot } = need();
      const created = createBuff(letheRoot, { name: body.name, id: body.id, displayName: body.displayName, desc: body.desc, info: body.info });
      return { ok: true, buff: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },
    "POST /api/buff/meta": (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const patch = {};
      if (body.info) patch.info = body.info;
      if (body.description !== void 0) patch.description = String(body.description);
      const res = patchBuffMeta(letheRoot, body.name, id, patch);
      if (res.change && res.change.before !== res.change.after) {
        session.record(body.name, "buff:" + id, "\u7F16\u8F91 Buff " + id, [{ rel: null, abs: res.change.abs, before: res.change.before, after: res.change.after }]);
        autosave.touch(body.name);
      }
      return { ok: true, meta: res.meta, session: session.state(body.name) };
    },
    "POST /api/buff/code": (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const change = writeBuffMeta(letheRoot, body.name, id, { code: body.code || {} });
      return { ok: true, meta: change.doc, changed: change.before !== change.after };
    },
    "POST /api/buff/save": (body) => {
      const id = String(body.id);
      session.clear(body.name, "buff:" + id);
      return { ok: true, committed: true, session: session.state(body.name) };
    },
    "GET /api/buff-search": (q) => {
      const { letheRoot } = need();
      return { ok: true, results: searchBuffIndex(letheRoot, q.get("q") || "", Number(q.get("limit") || 80)) };
    },
    "POST /api/buff/import": (body) => {
      const { letheRoot } = need();
      const res = importBuffs(letheRoot, { name: body.name, ids: body.ids, source: body.source || { kind: "vanilla" } });
      return { ok: true, ...res };
    },
    "POST /api/reveal": async (body) => {
      const p = String(body.path || "");
      const { letheRoot } = need();
      const okRoot = letheRoot && p.toLowerCase().startsWith(letheRoot.toLowerCase());
      const okUser = p.toLowerCase().startsWith(USER_DATA_DIR.toLowerCase());
      if (!okRoot && !okUser) {
        const err = new Error("\u53EA\u5141\u8BB8\u6253\u5F00\u79C1\u670D\u6216\u7528\u6237\u6570\u636E\u76EE\u5F55\u5185\u7684\u8DEF\u5F84");
        err.status = 400;
        throw err;
      }
      const { spawn: spawn2 } = await import("node:child_process");
      spawn2("explorer.exe", [p], { detached: true, stdio: "ignore" }).unref();
      return { ok: true };
    }
  };
  return createApi(api);
}
function fallbackCharacters() {
  return [
    { id: 1, name: "\u674E\u7BB1" },
    { id: 2, name: "\u6D6E\u58EB\u5FB7" },
    { id: 3, name: "\u5802\u5409\u8BC3\u5FB7" },
    { id: 4, name: "\u826F\u79C0" },
    { id: 5, name: "\u9ED8\u5C14\u7D22" },
    { id: 6, name: "\u9E3F\u7490" },
    { id: 7, name: "\u5E0C\u65AF\u514B\u5229\u592B" },
    { id: 8, name: "\u4EE5\u5B9E\u739B\u5229" },
    { id: 9, name: "\u7F57\u4F73" },
    { id: 10, name: "\u8F9B\u514B\u83B1" },
    { id: 11, name: "\u5965\u63D0\u65AF" },
    { id: 12, name: "\u683C\u91CC\u9AD8\u5C14" }
  ];
}

// src/server/http.mjs
var fs14 = __toESM(require("node:fs"), 1);
var import_node_path20 = require("node:path");
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store"
  });
  res.end(body);
}
function sendError(res, err) {
  const status = err?.status || (err?.name === "SafetyError" ? 400 : 500);
  sendJson(res, status, { ok: false, error: err?.message || String(err) });
}
function readBody(req) {
  return new Promise((resolve3, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("\u8BF7\u6C42\u4F53\u8FC7\u5927"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve3({});
      const text = Buffer.concat(chunks).toString("utf8");
      try {
        resolve3(JSON.parse(text));
      } catch {
        reject(Object.assign(new Error("JSON \u89E3\u6790\u5931\u8D25"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}
function checkToken(req, token) {
  if (!token) return true;
  const got = req.headers["x-wb-token"];
  return typeof got === "string" && got === token;
}
var ALLOWED_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;
function checkHost(req) {
  const host = String(req.headers.host || "");
  if (!ALLOWED_HOST.test(host)) return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      const u = new URL(origin);
      if (!/^(127\.0\.0\.1|localhost|\[::1\])$/i.test(u.hostname)) return false;
    } catch {
      return false;
    }
  }
  return true;
}
function serveStatic(req, res, webRoot, urlPath, { token = "" } = {}) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/" || rel === "") rel = "/index.html";
  const virtual = assetText("web/" + rel.split("/").filter(Boolean).join("/"));
  if (virtual != null) {
    let body2 = Buffer.from(virtual, "utf8");
    const ext2 = (0, import_node_path20.extname)(rel).toLowerCase();
    if (ext2 === ".html") body2 = Buffer.from(body2.toString("utf8").split("%%WB_TOKEN%%").join(token), "utf8");
    res.writeHead(200, { "content-type": MIME[ext2] || "text/html; charset=utf-8", "content-length": body2.length, "cache-control": "no-store" });
    res.end(body2);
    return true;
  }
  const abs = (0, import_node_path20.normalize)((0, import_node_path20.join)(webRoot, ...rel.split("/").filter(Boolean)));
  if (!isInside(webRoot, abs)) {
    sendJson(res, 403, { ok: false, error: "forbidden" });
    return true;
  }
  if (!fs14.existsSync(abs) || !fs14.statSync(abs).isFile()) return false;
  let body = fs14.readFileSync(abs);
  const ext = (0, import_node_path20.extname)(abs).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  if (ext === ".html") body = Buffer.from(body.toString("utf8").split("%%WB_TOKEN%%").join(token), "utf8");
  res.writeHead(200, {
    "content-type": type,
    "content-length": body.length,
    "cache-control": "no-store"
  });
  res.end(body);
  return true;
}

// src/lethe/session.mjs
var fs15 = __toESM(require("node:fs"), 1);
var import_node_path21 = require("node:path");
var EditSession = class {
  constructor(rootOrFn) {
    this.getRoot = typeof rootOrFn === "function" ? rootOrFn : () => rootOrFn;
    this.targets = /* @__PURE__ */ new Map();
  }
  key(mod, key) {
    return `${mod}::${key}`;
  }
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
    return (0, import_node_path21.join)(journalDir(this.getRoot()), cleanName(mod, "Mod \u540D\u79F0"), "ops.jsonl");
  }
  appendJournal(mod, op) {
    try {
      const p = this.journalPath(mod);
      fs15.mkdirSync((0, import_node_path21.join)(p, ".."), { recursive: true });
      fs15.appendFileSync(p, JSON.stringify(op) + "\n", "utf8");
    } catch {
    }
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
    const target = direction === "undo" ? "before" : "after";
    const files = op.files;
    for (const f of files) {
      const abs = f.abs || (0, import_node_path21.join)(dir, String(f.rel).split("/").join("\\"));
      let cur = null;
      try {
        cur = fs15.readFileSync(abs, "utf8");
      } catch {
        cur = null;
      }
      const expect = direction === "undo" ? f.after : f.before;
      if ((cur === null ? null : cur) !== expect) {
        throw new SafetyError("\u64A4\u56DE\u5931\u6548\uFF1A\u6587\u4EF6\u5185\u5BB9\u5DF2\u88AB\u5916\u90E8\u4FEE\u6539\uFF0C\u65E0\u6CD5\u5B89\u5168\u56DE\u9000");
      }
    }
    for (const f of files) {
      const abs = f.abs || (0, import_node_path21.join)(dir, String(f.rel).split("/").join("\\"));
      const content = f[target];
      if (content === null) {
        try {
          fs15.rmSync(abs, { force: true });
        } catch {
        }
      } else writeFileAtomic(abs, content);
    }
  }
  undo(mod, key) {
    const t = this.target(mod, key);
    if (!t || !t.undo.length) throw new SafetyError("\u6CA1\u6709\u53EF\u64A4\u9500\u7684\u64CD\u4F5C");
    const op = t.undo[t.undo.length - 1];
    op.modName = mod;
    this._apply(op, "undo");
    t.undo.pop();
    t.redo.push(op);
    return { ok: true, label: op.label, undo: t.undo.length, redo: t.redo.length };
  }
  redo(mod, key) {
    const t = this.target(mod, key);
    if (!t || !t.redo.length) throw new SafetyError("\u6CA1\u6709\u53EF\u91CD\u505A\u7684\u64CD\u4F5C");
    const op = t.redo[t.redo.length - 1];
    op.modName = mod;
    this._apply(op, "redo");
    t.redo.pop();
    t.undo.push(op);
    return { ok: true, label: op.label, undo: t.undo.length, redo: t.redo.length };
  }
  /** 保存成功后清空该目标（或整个 Mod）的栈 */
  clear(mod, key) {
    if (key) {
      const t = this.target(mod, key);
      if (t) {
        t.undo.length = 0;
        t.redo.length = 0;
        t.firstAt = Date.now();
      }
      return;
    }
    for (const k of [...this.targets.keys()]) if (k.startsWith(`${mod}::`)) this.targets.delete(k);
  }
  /** 未保存改动最早的编辑时间（用于 30 分钟计时） */
  firstDirtyAt(mod) {
    const st = this.state(mod);
    return st.firstDirtyAt;
  }
};

// src/lethe/autosave.mjs
var import_node_path22 = require("node:path");
var AUTOSAVE_INTERVAL_MS = 30 * 60 * 1e3;
var AutoSaver = class {
  constructor({ session, getLetheRoot, log }) {
    this.session = session;
    this.getLetheRoot = getLetheRoot;
    this.log = log;
    this.timers = /* @__PURE__ */ new Map();
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
    if (!letheRoot) return { ok: false, reason: "no-root" };
    const st = this.session.state(mod);
    if (!st.dirty) return { ok: false, reason: "clean" };
    const { dir } = resolveModDir(letheRoot, mod);
    const slot = (0, import_node_path22.join)(autoBackupsDir(letheRoot), mod);
    const result = mirrorMod(dir, slot);
    const at = (/* @__PURE__ */ new Date()).toISOString();
    this.logs.unshift({ mod, at, files: result.files, bytes: result.bytes, copied: result.copied, linked: result.linked, ms: result.ms });
    this.logs = this.logs.slice(0, 20);
    try {
      const state = readState(letheRoot);
      writeState(letheRoot, {
        ...state,
        autoSave: { ...state.autoSave || {}, [mod]: { at, files: result.files, bytes: result.bytes } }
      });
    } catch {
    }
    this.log?.(`\u81EA\u52A8\u5FEB\u7167\uFF1A${mod} \xB7 ${result.files} \u6587\u4EF6 \xB7 ${result.copied} \u590D\u5236 / ${result.linked} \u94FE\u63A5 \xB7 ${result.ms}ms`);
    return { ok: true, ...result, at };
  }
  run(mod) {
    this.timers.delete(mod);
    let result = { ok: false };
    try {
      result = this.runNow(mod);
    } catch (err) {
      this.logs.unshift({ mod, at: (/* @__PURE__ */ new Date()).toISOString(), error: err.message });
    }
    if (this.session.state(mod).dirty) this.touch(mod);
    return result;
  }
  stop(mod) {
    const t = this.timers.get(mod);
    if (t) {
      clearTimeout(t);
      this.timers.delete(mod);
    }
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
    return slotInfo((0, import_node_path22.join)(autoBackupsDir(letheRoot), mod));
  }
};

// src/server/index.mjs
var VERSION = "0.4.1";
var WEB_ROOT = (0, import_node_path23.join)(SRC_DIR, "web");
function createServer2({ token, state, log, session, autosave } = {}) {
  const ctx = { version: VERSION, state, log, session, autosave };
  const dispatch = buildApi(ctx);
  return http.createServer(async (req, res) => {
    try {
      if (!checkHost(req)) {
        sendJson(res, 403, { ok: false, error: "host/origin \u4E0D\u88AB\u5141\u8BB8" });
        return;
      }
      const url = new URL(req.url, "http://127.0.0.1");
      const pathname = url.pathname;
      if (pathname === "/api/health") {
        sendJson(res, 200, { ok: true, app: "The Lethe Workbench", version: VERSION });
        return;
      }
      if (pathname.startsWith("/api/")) {
        if (!checkToken(req, token)) {
          sendJson(res, 401, { ok: false, error: "\u4EE4\u724C\u65E0\u6548" });
          return;
        }
        if (req.method !== "GET" && req.headers["content-type"]?.includes("application/json") === false) {
          sendJson(res, 415, { ok: false, error: "\u9700\u8981 application/json" });
          return;
        }
        const body = req.method === "GET" ? {} : await readBody(req);
        const result = await dispatch(req.method, pathname, url.searchParams, body);
        if (result && result.__miss) {
          sendJson(res, 404, { ok: false, error: `\u6CA1\u6709\u8FD9\u4E2A\u63A5\u53E3\uFF1A${req.method} ${pathname}` });
          return;
        }
        sendJson(res, 200, result);
        return;
      }
      if (serveStatic(req, res, WEB_ROOT, pathname, { token })) return;
      sendJson(res, 404, { ok: false, error: "not found" });
    } catch (err) {
      log?.(`${req.method} ${req.url} -> ${err.message}`);
      sendError(res, err);
    }
  });
}
function startServer({ port = 3081, host = "127.0.0.1", explicit, locateNow = true, log, token: givenToken } = {}) {
  const config = loadConfig();
  const state = {
    config,
    letheRoot: config.letheRoot || "",
    gameRoot: config.gameRoot || "",
    locatedAt: config.letheRoot ? "config" : "",
    source: config.letheRoot ? "config" : ""
  };
  if (explicit || locateNow) {
    const found = locate({ explicit, config, quick: !explicit, budgetMs: 6e3 });
    if (found.best) {
      state.letheRoot = found.best.letheRoot;
      state.gameRoot = found.best.gameRoot;
      state.locatedAt = (/* @__PURE__ */ new Date()).toISOString();
      state.source = found.best.from;
    }
  }
  const session = new EditSession(() => state.letheRoot);
  const autosave = new AutoSaver({ session, getLetheRoot: () => state.letheRoot, log });
  if (state.letheRoot) markRunning(state.letheRoot);
  const finish = () => {
    try {
      if (state.letheRoot) markCleanExit(state.letheRoot);
    } catch {
    }
  };
  process.once("SIGINT", () => {
    finish();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    finish();
    process.exit(0);
  });
  process.once("exit", finish);
  const token = givenToken || (0, import_node_crypto.randomBytes)(18).toString("hex");
  const server = createServer2({ token, state, log, session, autosave });
  return new Promise((resolve3, reject) => {
    let attempt = 0;
    const tryListen = () => {
      server.once("error", (err) => {
        if (err.code === "EADDRINUSE" && attempt < 20) {
          attempt += 1;
          setTimeout(() => tryListen(), 40);
          return;
        }
        reject(err);
      });
      server.listen(port, host, () => {
        const actual = server.address().port;
        log?.(`\u670D\u52A1\u5DF2\u542F\u52A8\uFF1Ahttp://${host}:${actual}  Lethe=${state.letheRoot || "(\u672A\u5B9A\u4F4D)"}`);
        if (process.env.LETHE_WB_HANDSHAKE === "1") {
          process.stdout.write(`WB-READY ${JSON.stringify({ port: actual, token, letheRoot: state.letheRoot, version: VERSION })}
`);
        }
        resolve3({ server, port: actual, url: `http://${host}:${actual}/`, token, state, session, autosave });
      });
    };
    tryListen();
  });
}

// src/main.mjs
function arg(name, dflt = "") {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return dflt;
  if (hit.includes("=")) return hit.slice(hit.indexOf("=") + 1);
  return dflt;
}
var has = (name) => process.argv.includes(`--${name}`);
var json = has("json");
function out(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}
`);
}
async function main() {
  const cmd = (process.argv[2] || "serve").toLowerCase();
  const config = loadConfig();
  if (cmd === "version" || cmd === "--version") {
    const info = { name: "the-lethe-workbench", version: VERSION, appRoot: APP_ROOT, userDataDir: USER_DATA_DIR, configPath: config.configPath, node: process.version, standalone: IS_SEA };
    json ? out(info) : console.log(JSON.stringify(info, null, 2));
    return info;
  }
  if (cmd === "locate") {
    const found = locate({ explicit: arg("root"), config, quick: has("quick"), budgetMs: Number(arg("budget", "8000")) });
    const result = { ok: Boolean(found.best), best: found.best, candidates: found.candidates.map((c) => ({ root: c.letheRoot, score: c.score, from: c.from, mods: c.modCount })), tried: found.tried };
    if (found.best) rememberRoot(found.best.gameRoot || found.best.letheRoot);
    json ? out(result) : console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (cmd === "mods" || cmd === "list") {
    const found = locate({ explicit: arg("root"), config, quick: true });
    if (!found.best) throw new Error("\u672A\u5B9A\u4F4D\u5230\u79C1\u670D\uFF0C\u8BF7\u7528 --root=<Lethe \u6839> \u6307\u5B9A");
    const result = listMods(found.best.letheRoot).map((m) => ({ name: m.name, enabled: m.enabled, personalities: m.personalityCount, files: m.files, bytes: m.bytes }));
    json ? out({ ok: true, letheRoot: found.best.letheRoot, mods: result }) : console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (cmd === "dlls") {
    const found = locate({ explicit: arg("root"), config, quick: true });
    if (!found.best) throw new Error("\u672A\u5B9A\u4F4D\u5230\u79C1\u670D");
    const result = listDlls(found.best.gameRoot);
    json ? out({ ok: true, dlls: result }) : console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (cmd === "personalities") {
    const found = locate({ explicit: arg("root"), config, quick: true });
    if (!found.best) throw new Error("\u672A\u5B9A\u4F4D\u5230\u79C1\u670D");
    const result = listPersonalities(found.best.letheRoot, arg("mod"));
    json ? out({ ok: true, personalities: result }) : console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (cmd === "serve" || cmd === "app") {
    const started = await startServer({
      port: Number(arg("port", "3081")),
      explicit: arg("root"),
      log: (m) => console.log(`[wb] ${m}`)
    });
    if (!has("no-open")) openBrowser(started.url);
    return started;
  }
  console.error(`\u672A\u77E5\u547D\u4EE4\uFF1A${cmd}`);
  process.exitCode = 2;
  return null;
}
function openBrowser(url) {
  try {
    const p = (0, import_node_child_process.spawn)("cmd.exe", ["/c", "start", '""', url], { detached: true, stdio: "ignore" });
    p.unref();
  } catch {
  }
}

// build/sea-entry.mjs
setAssets(ASSETS);
main().catch((err) => {
  console.error(err?.stack || err);
  process.exitCode = 1;
});
