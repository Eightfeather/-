import * as fs from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../atomic.mjs';

/**
 * 单位级索引：人格 / 技能 / 被动 / Buff（原版 + 全部 Mod，含被禁用 Mod）。
 * 用途：id 全局查重、按 id 搜索并标注来源。
 */
const KINDS = ['personality', 'skill', 'passive', 'buff'];
const CAT_DIR = { personality: 'personality', skill: 'skill', passive: 'passive', buff: 'buff' };
const LOC_CAT = { personality: 'personalityList', skill: 'skillList', passive: 'passiveList', buff: 'bufList' };

let cache = null;
let cacheAt = 0;
const TTL = 60 * 1000;

function walkJson(dir, cb) {
  let list = [];
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of list) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkJson(p, cb);
    else if (/\.json$/i.test(e.name)) cb(p);
  }
}

const entitiesOf = (doc) => {
  if (!doc) return [];
  if (Array.isArray(doc)) return doc;
  if (Array.isArray(doc.list)) return doc.list;
  if (typeof doc === 'object' && doc.id !== undefined) return [doc];
  return [];
};

function addEntities(map, doc, meta) {
  for (const e of entitiesOf(doc)) {
    if (!e || e.id === undefined || e.id === null) continue;
    const id = String(e.id);
    const cur = map.get(id);
    if (cur) { cur.refs.push(meta); if (!cur.entity) { cur.entity = e; } continue; }
    map.set(id, { id, entity: e, refs: [meta] });
  }
}

function localeName(doc, id) {
  if (!doc) return '';
  const hit = Array.isArray(doc.list) ? doc.list.find((x) => String(x.id) === String(id)) : doc[String(id)];
  if (!hit) return '';
  // 技能/被动/人格的 locale 条目是对象，名字可能在 levelList[0].name
  const fromLevels = Array.isArray(hit.levelList) && hit.levelList.length ? hit.levelList.find((l) => l && l.name) : null;
  const nm = hit.name || (fromLevels && fromLevels.name) || '';
  return typeof nm === 'string' ? nm : '';
}

function scanRoot(root, meta, out) {
  for (const kind of KINDS) {
    const dir = join(root, 'custom_limbus_data', CAT_DIR[kind]);
    if (!fs.existsSync(dir) && kind !== 'buff') {
      // custom_buffs 目录也登记（0 字节关键词注册）
    }
    walkJson(dir, (file) => addEntities(out[kind], readJson(file, null), { ...meta, file }));
  }
  // mod 自定义 buff 关键词注册（0 字节 txt → 只有 id，无实体）
  const cbDir = join(root, 'custom_buffs');
  let txt = [];
  try { txt = fs.readdirSync(cbDir).filter((n) => n.toLowerCase().endsWith('.txt')); } catch { txt = []; }
  for (const n of txt) {
    const id = n.replace(/\.txt$/i, '');
    if (!out.buff.has(id)) out.buff.set(id, { id, entity: null, refs: [{ ...meta, keywordOnly: true }] });
  }
  // 本地化名字
  for (const kind of KINDS) {
    walkJson(join(root, 'custom_limbus_locale', 'EN', LOC_CAT[kind]), (file) => {
      const doc = readJson(file, null);
      if (!doc || typeof doc !== 'object') return;
      const keys = Array.isArray(doc.list) ? doc.list.map((x) => String(x.id)) : Object.keys(doc);
      for (const k of keys) {
        const nm = localeName(doc, k);
        const row = out[kind].get(String(k));
        if (!row) {
          if (!nm) continue;
          out[kind].set(String(k), { id: String(k), entity: null, name: nm, refs: [{ ...meta, file, localeOnly: true }] });
          continue;
        }
        if (!row.name && nm) row.name = nm;
      }
    });
  }
}

function build(letheRoot) {
  const out = { personality: new Map(), skill: new Map(), passive: new Map(), buff: new Map() };
  // 原版
  const dump = join(letheRoot, 'dumpedData');
  for (const kind of KINDS) {
    walkJson(join(dump, 'limbus_data', CAT_DIR[kind]), (file) => addEntities(out[kind], readJson(file, null), { source: 'vanilla', mod: '', file }));
  }
  for (const kind of KINDS) {
    const doc = readJson(join(dump, 'limbus_locale', 'EN', LOC_CAT[kind] + '.json'), null);
    if (!doc) continue;
    const keys = Array.isArray(doc.list) ? doc.list.map((x) => String(x.id)) : Object.keys(doc);
    for (const k of keys) {
      const nm = localeName(doc, k);
      const row = out[kind].get(String(k));
      if (!row) {
        if (!nm) continue;
        out[kind].set(String(k), { id: String(k), entity: null, name: nm, refs: [{ source: 'vanilla', mod: '', file: join(dump, 'limbus_locale', 'EN', LOC_CAT[kind] + '.json'), localeOnly: true }] });
        continue;
      }
      if (!row.name && nm) row.name = nm;
    }
  }
  // 启用中的 Mod
  const modsRoot = join(letheRoot, 'mods');
  let mods = [];
  try { mods = fs.readdirSync(modsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { mods = []; }
  for (const m of mods) scanRoot(join(modsRoot, m.name), { source: 'mod', mod: m.name, disabled: false }, out);
  // 被禁用的 Mod
  const disRoot = join(letheRoot, '.lethe-workbench', 'disabled', 'mods');
  let dis = [];
  try { dis = fs.readdirSync(disRoot, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { dis = []; }
  for (const m of dis) scanRoot(join(disRoot, m.name), { source: 'mod', mod: m.name, disabled: true }, out);
  return out;
}

export function unitIndex(letheRoot, force = false) {
  const now = Date.now();
  if (!force && cache && now - cacheAt < TTL) return cache;
  cache = build(letheRoot);
  cacheAt = now;
  return cache;
}

export function clearUnitCache() { cache = null; cacheAt = 0; }

export const UNIT_ZH = { personality: '人格', skill: '技能', passive: '被动', buff: 'Buff' };

export function isUnitIdTaken(letheRoot, kind, id) {
  const idx = unitIndex(letheRoot);
  const row = idx[kind]?.get(String(id));
  if (!row) return null;
  return { id: String(id), kind, source: row.refs[0]?.source || '', mod: row.refs[0]?.mod || '', disabled: Boolean(row.refs[0]?.disabled), name: row.name || '' };
}

export function searchUnits(letheRoot, kind, query, limit = 40) {
  const idx = unitIndex(letheRoot)[kind];
  if (!idx) return [];
  const q = String(query || '').trim().toLowerCase();
  const rows = [];
  for (const row of idx.values()) {
    const nm = row.name || '';
    if (q && !String(row.id).toLowerCase().includes(q) && !nm.toLowerCase().includes(q)) continue;
    const ref = row.refs.find((r) => !r.localeOnly && !r.keywordOnly) || row.refs.find((r) => !r.localeOnly) || row.refs[0] || {};
    rows.push({
      id: String(row.id),
      name: nm,
      kind,
      source: ref.source === 'vanilla' ? '原版' : (ref.disabled ? `${ref.mod}（已禁用）` : ref.mod || 'Mod'),
      disabled: Boolean(ref.disabled),
      hasEntity: Boolean(row.entity),
    });
    if (rows.length >= limit * 6) break;
  }
  rows.sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1) || a.id.localeCompare(b.id, 'en', { numeric: true }));
  return rows.slice(0, limit);
}

export function unitCounts(letheRoot) {
  const idx = unitIndex(letheRoot);
  return Object.fromEntries(KINDS.map((k) => [k, idx[k].size]));
}