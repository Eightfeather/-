import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, writeFileAtomic } from '../atomic.mjs';
import { cleanName, SafetyError } from '../safety.mjs';
import { workbenchDir } from './state.mjs';

/**
 * 编辑器侧元数据（不写进游戏数据）：
 *  - meta/skills/<mod>/<skillId>.json：修改日期、基础信息占位字段、代码区（模块/硬币）、描述草稿
 *  - meta/modules/<moduleId>.json：模块库（当前仅 3 个测试模块，模块编辑上线后由它接管）
 * 说明：字段与游戏 JSON 的映射尚未落实，见 docs/06-待落实：编辑器↔游戏映射.md
 */
export const META_VERSION = 1;

export const DEFAULT_INFO = {
  basePower: 4,
  coinCount: 1,
  atkCorrection: 0,
  targetNum: 1,
  physical: 'SLASH',
  sin: 'AZURE',
  sign: 'positive',
};

/** 物理属性：与游戏 atkType 枚举一一对应（突刺=PENETRATE、打击=HIT） */
export const PHYSICAL_TYPES = [
  { id: 'SLASH', zh: '斩击' },
  { id: 'HIT', zh: '打击' },
  { id: 'PENETRATE', zh: '突刺' },
  { id: 'NONE', zh: '无' },
];
/** 罪孽属性：严格按 dumpedData/limbus_locale/EN/attributeList.json 的 9 条顺序
 *  NEUTRAL 是 attributeType 的合法取值（数据里 402 次），但不是 attributeList 里的罪孽，
 *  因此排在最后并标注「无属性」。 */
export const SIN_TYPES = [
  { id: 'CRIMSON', zh: '暴怒' },
  { id: 'SCARLET', zh: '色欲' },
  { id: 'AMBER', zh: '怠惰' },
  { id: 'SHAMROCK', zh: '暴食' },
  { id: 'AZURE', zh: '忧郁' },
  { id: 'INDIGO', zh: '傲慢' },
  { id: 'VIOLET', zh: '嫉妒' },
  { id: 'WHITE', zh: '疯狂' },
  { id: 'BLACK', zh: '哀叹' },
  { id: 'NEUTRAL', zh: '无属性' },
];
/** 硬币颜色：数据里出现过的枚举是 GREY/GREEN/PURPLE，RED 为保留项（样本中未出现） */
export const COIN_COLORS = [
  { id: 'GREY', zh: '灰' },
  { id: 'GREEN', zh: '绿' },
  { id: 'PURPLE', zh: '紫' },
  { id: 'RED', zh: '红' },
];
/** 旧版本占位 id（normal/red/green/purple）→ 游戏枚举 的兼容映射 */
const COIN_COLOR_ALIAS = { normal: 'GREY', grey: 'GREY', green: 'GREEN', purple: 'PURPLE', red: 'RED' };

/** 3 个测试模块：可拖动，无映射、无实际效果 */
export const TEST_MODULES = [
  { id: 'test-burn-quake', name: '测试模块 · 烧伤+震颤', desc: '[使用时]若目标的[烧伤]强度与[震颤]强度之和不低于6级，则使本技能的硬币威力+1' },
  { id: 'test-power-gain', name: '测试模块 · 硬币威力', desc: '[使用时]使本技能的硬币威力+1' },
  { id: 'test-heal-sp', name: '测试模块 · 回复理智', desc: '[命中时]恢复自身2点理智值' },
];

export const DEFAULT_PASSIVE_INFO = {
  needCondition: false,
  sin: 'CRIMSON',
  conditionType: 'have',
  count: 0,
};

export const PASSIVE_CONDITION_TYPES = [
  { id: 'have', zh: '拥有' },
  { id: 'resonance', zh: '共鸣' },
];

export const DEFAULT_BUFF_INFO = {
  buffClass: 'NonvolatileBuff',
  buffType: 'Positive',
  canBeDespelled: true,
  maxStack: 1,
  maxTurn: 1,
  iconId: '',
  special: '',
};

/** Buff 类别：游戏枚举名，官方中文未在 locale 中给出，这里保留英文枚举并附中文说明 */
export const BUFF_CLASSES = [
  { id: 'NonvolatileBuff', zh: '常驻（NonvolatileBuff）' },
  { id: 'VolatileBuff', zh: '挥发（VolatileBuff）' },
];

/** Buff 正负：游戏文案使用「增益 / 减益」 */
export const BUFF_TYPES = [
  { id: 'Positive', zh: '增益' },
  { id: 'Negative', zh: '减益' },
  { id: 'Neutral', zh: '中性' },
];

export function metaRoot(letheRoot) { return join(workbenchDir(letheRoot), 'meta'); }
export function modulesDir(letheRoot) { return join(metaRoot(letheRoot), 'modules'); }
export function skillsMetaDir(letheRoot, mod) { return join(metaRoot(letheRoot), 'skills', cleanName(mod, 'Mod 名称')); }
export function passivesMetaDir(letheRoot, mod) { return join(metaRoot(letheRoot), 'passives', cleanName(mod, 'Mod 名称')); }
export function buffsMetaDir(letheRoot, mod) { return join(metaRoot(letheRoot), 'buffs', cleanName(mod, 'Mod 名称')); }

export function normalizeId(id) {
  const s = String(id ?? '').trim();
  if (!/^\d{3,10}$/.test(s)) throw new SafetyError('技能 id 必须是 3–10 位数字');
  return s;
}

function nowIso() { return new Date().toISOString(); }

/** 硬币颜色归一：兼容旧占位 id（normal/red/green/purple）与游戏枚举（GREY/GREEN/PURPLE/RED） */
export function coinColor(value) {
  const raw = String(value ?? '').trim();
  const id = COIN_COLOR_ALIAS[raw] || COIN_COLOR_ALIAS[raw.toLowerCase()] || raw;
  return COIN_COLORS.some((x) => x.id === id) ? id : 'GREY';
}

function padCoins(coins, count) {
  const list = Array.isArray(coins) ? coins.slice(0, count) : [];
  while (list.length < count) list.push({ color: 'GREY', value: 0, modules: [] });
  return list.map((c) => ({
    color: coinColor(c && c.color),
    value: Number(c && c.value) || 0,
    modules: Array.isArray(c && c.modules) ? [...c.modules] : [],
  }));
}

function normalizeSkillMeta(doc, id) {
  const src = doc && typeof doc === 'object' ? doc : {};
  const info = { ...DEFAULT_INFO, ...(src.info || {}) };
  const count = Math.max(1, Math.min(12, Number(info.coinCount) || 1));
  info.coinCount = count;
  const code = src.code && typeof src.code === 'object' ? src.code : {};
  return {
    version: META_VERSION,
    id: String(id),
    updatedAt: src.updatedAt || '',
    createdAt: src.createdAt || '',
    info,
    code: {
      skill: Array.isArray(code.skill) ? code.skill.map(String) : [],
      coins: padCoins(code.coins, count),
    },
    description: typeof src.description === 'string' ? src.description : '',
    coinDescs: padStrings(src.coinDescs, count),
  };
}

function padStrings(list, count) {
  const src = Array.isArray(list) ? list : [];
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(typeof src[i] === 'string' ? src[i] : '');
  return out;
}

export function skillMetaPath(letheRoot, mod, id) {
  return join(skillsMetaDir(letheRoot, mod), `${normalizeId(id)}.json`);
}

export function skillCodePath(letheRoot, mod, id) {
  return join(skillsMetaDir(letheRoot, mod), `${normalizeId(id)}.code.json`);
}

export function readSkillMeta(letheRoot, mod, id) {
  const doc = readJson(skillMetaPath(letheRoot, mod, id), null) || {};
  const codeDoc = readJson(skillCodePath(letheRoot, mod, id), null);
  return normalizeSkillMeta({ ...doc, code: codeDoc && codeDoc.code ? codeDoc.code : (doc.code || {}) }, id);
}

/**
 * 写入技能元数据（草稿）。返回变更记录，可直接交给 EditSession 记录撤销。
 * patch: { info?, code?, description?, touch?: boolean }
 */
export function writeSkillMeta(letheRoot, mod, id, patch = {}) {
  const p = skillMetaPath(letheRoot, mod, id);
  const before = existsSync(p) ? readFileSync(p, 'utf8') : null;
  const prev = normalizeSkillMeta(before ? JSON.parse(before) : null, id);
  const next = normalizeSkillMeta({
    ...prev,
    info: { ...prev.info, ...(patch.info || {}) },
    description: patch.description !== undefined ? patch.description : prev.description,
    coinDescs: patch.coinDescs !== undefined ? patch.coinDescs : prev.coinDescs,
    updatedAt: patch.touch === false ? prev.updatedAt : nowIso(),
  }, id);
  const after = JSON.stringify(next, null, 2);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileAtomic(p, after);
  return { rel: null, abs: p, before, after, doc: next };
}


/** 代码区（模块/硬币）：独立文件，不进撤销栈 */
export function writeSkillCode(letheRoot, mod, id, code = {}) {
  const p = skillCodePath(letheRoot, mod, id);
  const before = existsSync(p) ? readFileSync(p, 'utf8') : null;
  const prev = readJson(p, null) || {};
  const prevCoins = prev.code && Array.isArray(prev.code.coins) ? prev.code.coins : [];
  const count = Math.max(1, Math.min(12, Number(code.coinCount) || (code.coins ? code.coins.length : prevCoins.length) || 1));
  const doc = {
    version: META_VERSION,
    id: String(id),
    updatedAt: nowIso(),
    code: {
      skill: Array.isArray(code.skill) ? code.skill.map(String) : (Array.isArray(prev.code?.skill) ? prev.code.skill : []),
      coins: padCoins(Array.isArray(code.coins) ? code.coins : prevCoins, count),
    },
  };
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileAtomic(p, JSON.stringify(doc, null, 2));
  return { rel: null, abs: p, before, after: JSON.stringify(doc, null, 2), doc: { ...doc } };
}

/* ----------------------------- 被动 / buff 元数据 ----------------------------- */

function normalizePassiveMeta(doc, id) {
  const src = doc && typeof doc === 'object' ? doc : {};
  const info = { ...DEFAULT_PASSIVE_INFO, ...(src.info || {}) };
  info.count = Math.max(0, Math.min(99, Number(info.count) || 0));
  if (!PASSIVE_CONDITION_TYPES.some((x) => x.id === info.conditionType)) info.conditionType = 'have';
  if (!SIN_TYPES.some((x) => x.id === info.sin)) info.sin = 'CRIMSON';
  const code = src.code && typeof src.code === 'object' ? src.code : {};
  return {
    version: META_VERSION,
    id: String(id),
    updatedAt: src.updatedAt || '',
    createdAt: src.createdAt || '',
    info,
    code: { modules: Array.isArray(code.modules) ? code.modules.map(String) : [] },
    description: typeof src.description === 'string' ? src.description : '',
  };
}

function normalizeBuffMeta(doc, id) {
  const src = doc && typeof doc === 'object' ? doc : {};
  const info = { ...DEFAULT_BUFF_INFO, ...(src.info || {}) };
  info.maxStack = Math.max(1, Math.min(999, Number(info.maxStack) || 1));
  info.maxTurn = Math.max(-1, Math.min(999, Number(info.maxTurn) || 1));
  if (!BUFF_CLASSES.some((x) => x.id === info.buffClass)) info.buffClass = 'NonvolatileBuff';
  if (!BUFF_TYPES.some((x) => x.id === info.buffType)) info.buffType = 'Positive';
  const code = src.code && typeof src.code === 'object' ? src.code : {};
  return {
    version: META_VERSION,
    id: String(id),
    updatedAt: src.updatedAt || '',
    createdAt: src.createdAt || '',
    info,
    code: { modules: Array.isArray(code.modules) ? code.modules.map(String) : [] },
    description: typeof src.description === 'string' ? src.description : '',
  };
}

function readMetaDoc(p, norm, id) {
  const doc = readJson(p, null) || {};
  return norm(doc, id);
}

function writeMetaDoc(p, norm, id, patch = {}) {
  const before = existsSync(p) ? readFileSync(p, 'utf8') : null;
  const prev = norm(before ? JSON.parse(before) : null, id);
  const next = norm({
    ...prev,
    info: { ...prev.info, ...(patch.info || {}) },
    code: { ...prev.code, ...(patch.code || {}) },
    description: patch.description !== undefined ? patch.description : prev.description,
    updatedAt: patch.touch === false ? prev.updatedAt : nowIso(),
  }, id);
  const after = JSON.stringify(next, null, 2);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileAtomic(p, after);
  return { rel: null, abs: p, before, after, doc: next };
}

export function passiveMetaPath(letheRoot, mod, id) { return join(passivesMetaDir(letheRoot, mod), String(id) + '.json'); }
export function readPassiveMeta(letheRoot, mod, id) { return readMetaDoc(passiveMetaPath(letheRoot, mod, id), normalizePassiveMeta, id); }
export function writePassiveMeta(letheRoot, mod, id, patch = {}) { return writeMetaDoc(passiveMetaPath(letheRoot, mod, id), normalizePassiveMeta, id, patch); }

export function buffMetaPath(letheRoot, mod, id) { return join(buffsMetaDir(letheRoot, mod), String(id) + '.json'); }
export function readBuffMeta(letheRoot, mod, id) { return readMetaDoc(buffMetaPath(letheRoot, mod, id), normalizeBuffMeta, id); }
export function writeBuffMeta(letheRoot, mod, id, patch = {}) { return writeMetaDoc(buffMetaPath(letheRoot, mod, id), normalizeBuffMeta, id, patch); }

/* --------------------------------- 模块库 --------------------------------- */

export const MODULE_KINDS = [
  { id: 'skill', zh: '技能' },
  { id: 'passive', zh: '被动' },
  { id: 'buff', zh: 'Buff' },
];

function safeModuleId(id) { return String(id).replace(/[^a-zA-Z0-9_-]/g, ''); }
function modulePath(letheRoot, id) { return join(modulesDir(letheRoot), safeModuleId(id) + '.json'); }

/** 首次读取时生成 3 个测试模块；之后不再改动已有模块 */
export function ensureTestModules(letheRoot) {
  const dir = modulesDir(letheRoot);
  mkdirSync(dir, { recursive: true });
  const created = [];
  TEST_MODULES.forEach((m, i) => {
    const p = modulePath(letheRoot, m.id);
    if (existsSync(p)) return;
    const at = new Date(Date.now() - (TEST_MODULES.length - i) * 60_000).toISOString();
    const doc = { version: META_VERSION, id: m.id, name: m.name, desc: m.desc, prefix: '', kind: 'skill', test: true, editable: false, createdAt: at, updatedAt: at };
    writeFileAtomic(p, JSON.stringify(doc, null, 2));
    created.push(doc);
  });
  return created;
}

function moduleDocOf(doc) {
  return {
    id: String(doc.id),
    name: String(doc.name || doc.id),
    desc: String(doc.desc || ''),
    prefix: String(doc.prefix || ''),
    kind: String(doc.kind || 'skill'),
    test: Boolean(doc.test),
    editable: doc.editable !== false,
    createdAt: doc.createdAt || '',
    updatedAt: doc.updatedAt || doc.createdAt || '',
  };
}

export function listModules(letheRoot) {
  ensureTestModules(letheRoot);
  const dir = modulesDir(letheRoot);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const doc = readJson(join(dir, f), null);
    if (!doc || !doc.id) continue;
    out.push(moduleDocOf(doc));
  }
  return out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function getModule(letheRoot, id) {
  const doc = readJson(modulePath(letheRoot, id), null);
  return doc ? moduleDocOf(doc) : null;
}

export function createModule(letheRoot, { name, desc = '', prefix = '', kind = 'skill' }) {
  const n = String(name || '').trim();
  if (!n) throw new SafetyError('模块名称不能为空');
  const id = 'mod-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const at = nowIso();
  const doc = { version: META_VERSION, id, name: n, desc: String(desc), prefix: String(prefix), kind: String(kind || 'skill'), test: false, editable: true, createdAt: at, updatedAt: at };
  writeFileAtomic(modulePath(letheRoot, id), JSON.stringify(doc, null, 2));
  return moduleDocOf(doc);
}

export function updateModule(letheRoot, id, patch = {}) {
  const p = modulePath(letheRoot, id);
  const doc = readJson(p, null);
  if (!doc) throw new SafetyError('模块不存在');
  if (doc.test || doc.editable === false) throw new SafetyError('测试模块不可编辑');
  const next = {
    ...doc,
    name: patch.name !== undefined ? String(patch.name).trim() || doc.name : doc.name,
    desc: patch.desc !== undefined ? String(patch.desc) : doc.desc,
    prefix: patch.prefix !== undefined ? String(patch.prefix) : (doc.prefix || ''),
    kind: patch.kind !== undefined ? String(patch.kind) : (doc.kind || 'skill'),
    updatedAt: nowIso(),
  };
  writeFileAtomic(p, JSON.stringify(next, null, 2));
  return moduleDocOf(next);
}

export function deleteModule(letheRoot, id) {
  const p = modulePath(letheRoot, id);
  const doc = readJson(p, null);
  if (!doc) throw new SafetyError('模块不存在');
  if (doc.test || doc.editable === false) throw new SafetyError('测试模块不可删除');
  unlinkSync(p);
  return { ok: true };
}

