import * as fs from 'node:fs';
import { join } from 'node:path';
import { readJson, readJsonFile, writeFilesTransactional } from '../atomic.mjs';
import { cleanName, SafetyError } from '../safety.mjs';
import { entitiesOf, findLocaleEntry, localeEntriesOf, modDirSafe, readModPayload } from './mods.mjs';
import { ensureLayout } from './layout.mjs';
import { vanillaTemplate } from './vanilla.mjs';

const ENTITY_FIELDS = ['appearance', 'rank', 'hp', 'defCorrection', 'minSpeedList', 'maxSpeedList',
  'uniqueAttribute', 'panicType', 'panicSkillOnErosion', 'attributeList', 'defenseSkillIDList',
  'mentalConditionInfo', 'breakSection', 'resistInfo', 'unitKeywordList', 'associationList',
  'skillKeywordList', 'slotWeightConditionList', 'season'];
const LOCALE_FIELDS = ['name', 'title', 'desc', 'oneLineTitle', 'acquisitionMethod', 'skinItemTitle', 'skinItemDesc'];

function pick(obj, fields) {
  const out = {};
  for (const f of fields) if (obj && Object.hasOwn(obj, f)) out[f] = obj[f];
  return out;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function getPersonality(letheRoot, name, id) {
  const dir = modDirSafe(letheRoot, name);
  const p = readModPayload(dir);
  const entry = (p.data.personality || []).find((x) => String(x.id) === String(id));
  if (!entry) return null;
  const loc = findLocaleEntry(p.locales.EN?.personality, id);
  return { id: entry.id, entity: entry.entity, locale: loc, rel: entry.rel, hasLocale: Boolean(loc) };
}

export function listPersonalities(letheRoot, name) {
  const dir = modDirSafe(letheRoot, name);
  const p = readModPayload(dir);
  return (p.data.personality || []).map((x) => {
    const loc = findLocaleEntry(p.locales.EN?.personality, x.id) || {};
    return {
      id: x.id,
      characterId: Number(x.entity.characterId) || 0,
      name: loc.name || '',
      title: loc.title || '',
      appearance: x.entity.appearance || '',
      rank: x.entity.rank,
      skillIds: skillIdsOf(x.entity),
      hasLocale: loc.name !== undefined,
    };
  });
}

export function skillIdsOf(entity) {
  const ids = [];
  for (const a of entity?.attributeList || []) if (a && a.skillId != null) ids.push(a.skillId);
  for (const d of entity?.defenseSkillIDList || []) ids.push(d);
  return ids;
}

/**
 * 保存人格：只写真正变化的字段（未知字段原样保留）。
 * 返回 changes（before/after），供编辑会话记录撤销/重做。
 */
export function savePersonality(letheRoot, { name, id, entity = {}, locale = {} }) {
  const dir = modDirSafe(letheRoot, name);
  const p = readModPayload(dir);
  const found = (p.data.personality || []).find((x) => String(x.id) === String(id));
  if (!found) throw new SafetyError(`人格不存在：${id}`);

  const files = [];
  const labels = [];
  const entPatch = pick(entity, ENTITY_FIELDS);
  const entDiff = {};
  for (const [k, v] of Object.entries(entPatch)) {
    if (!same(found.entity?.[k], v)) entDiff[k] = v;
  }
  if (Object.keys(entDiff).length) {
    const doc = readJson(join(dir, found.rel), null);
    if (!doc) throw new SafetyError(`无法读取数据文件：${found.rel}`);
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
    if (!locEntry) throw new SafetyError('该人格没有本地化条目，无法写文本字段');
    const locRef = (p.locales.EN.personality || []).find((x) => String(x.key) === String(id));
    const doc = readJson(join(dir, locRef.rel), null);
    if (!doc || typeof doc !== 'object') throw new SafetyError(`无法读取本地化文件：${locRef.rel}`);
    if (Array.isArray(doc.list)) {
      const hit = doc.list.find((e) => String(e.id) === String(id));
      if (!hit) throw new SafetyError('本地化条目丢失');
      Object.assign(hit, locDiff);
    } else {
      doc[String(id)] = { ...(doc[String(id)] || {}), ...locDiff };
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
  const base = Number(characterId) * 10000;
  for (let i = 501; i < 1000; i += 1) {
    const id = String(base + i);
    if (!used.has(id)) return id;
  }
  throw new SafetyError('该罪人的人格编号已用尽，请手动指定 id');
}

/**
 * 新建人格：以原版同罪人实体为模板（保证字段合法），清空技能引用，写入本 Mod。
 */
export function createPersonality(letheRoot, { name, characterId, id, displayName, title = '', desc = '', appearance = '', rank, hp }) {
  const modName = cleanName(name, 'Mod 名称');
  const dir = modDirSafe(letheRoot, modName);
  if (!fs.existsSync(dir)) throw new SafetyError(`Mod 不存在：${name}`);
  const cid = Number(characterId);
  if (!Number.isInteger(cid) || cid <= 0) throw new SafetyError('characterId 必须是正整数');

  const tmpl = vanillaTemplate(letheRoot, cid);
  if (!tmpl) throw new SafetyError('找不到可用的原版模板（dumpedData 未导出？）');

  const pid = id ? String(id) : nextId(letheRoot, modName, cid);
  if (!/^\d{3,10}$/.test(pid)) throw new SafetyError('人格 id 必须是 3–10 位数字');
  const existing = getPersonality(letheRoot, modName, pid);
  if (existing) throw new SafetyError(`本 Mod 已有人格 id：${pid}`);

  const entity = {
    ...JSON.parse(JSON.stringify(tmpl.entity)),
    id: Number(pid),
    characterId: cid,
    updatedDate: Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')),
    appearance: appearance || tmpl.appearance || '',
    attributeList: [],
    defenseSkillIDList: [],
  };
  if (rank != null) entity.rank = Number(rank);
  if (hp && typeof hp === 'object') entity.hp = { ...entity.hp, ...hp };

  const entry = {
    id: String(pid),
    name: displayName || '',
    title,
    desc,
    oneLineTitle: title,
    acquisitionMethod: 'Custom',
    skinItemTitle: '',
    skinItemDesc: '',
  };

  ensureLayout(dir, 'personality');
  const created = ensureLayout(dir, 'appearance').filter((x) => x.startsWith('custom_sprites') || x.startsWith('custom_appearance'));
  const files = [
    { rel: `custom_limbus_data/personality/${pid}.json`, content: JSON.stringify({ list: [entity] }, null, 2) },
    { rel: `custom_limbus_locale/EN/personalityList/${pid}.json`, content: JSON.stringify({ [pid]: entry }, null, 2) },
  ];
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod: modName });
  return { id: pid, entity, locale: entry, created, ...result };
}

export { localeEntriesOf, readJsonFile };