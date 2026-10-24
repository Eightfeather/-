import * as fs from 'node:fs';
import { join } from 'node:path';

let cache = null;
let cacheKey = '';

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function entitiesOf(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.list)) return data.list;
  if (data && typeof data === 'object') return [data];
  return [];
}

function dirFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.json'))
      .map((d) => join(dir, d.name));
  } catch { return []; }
}

/**
 * 原版索引：从 dumpedData 读（角色表 + 人格实体 + 人格文本）。
 * 缓存以 dumpedData 内三个来源的 mtime 作为键，游戏内按 0 更新后自动失效。
 */
export function vanillaIndex(letheRoot) {
  const dump = join(letheRoot, 'dumpedData');
  const charFile = join(dump, 'limbus_locale', 'EN', 'characterList.json');
  const nameFile = join(dump, 'limbus_locale', 'EN', 'personalityList.json');
  const dataDir = join(dump, 'limbus_data', 'personality');
  let key = dump;
  for (const p of [charFile, nameFile, dataDir]) {
    try { key += `|${p}:${fs.statSync(p).mtimeMs}`; } catch { key += `|${p}:0`; }
  }
  if (cache && cacheKey === key) return cache;

  const characters = readJson(charFile, {});
  const names = readJson(nameFile, {});
  const personalities = [];
  for (const file of dirFiles(dataDir)) {
    const data = readJson(file, null);
    for (const ent of entitiesOf(data)) {
      if (!ent || ent.id == null) continue;
      const loc = names[String(ent.id)] || {};
      personalities.push({
        id: ent.id,
        characterId: Number(ent.characterId) || 0,
        appearance: ent.appearance || '',
        rank: ent.rank,
        hp: ent.hp,
        name: loc.name || '',
        title: loc.title || '',
        desc: loc.desc || '',
        file,
        entity: ent,
      });
    }
  }

  cache = {
    dump,
    available: personalities.length > 0,
    characters: Object.values(characters).map((c) => ({ id: Number(c.id), name: c.name })),
    personalities,
    byId: new Map(personalities.map((p) => [String(p.id), p])),
  };
  cacheKey = key;
  return cache;
}

/** 为一个新人格找一份可用的原版模板实体 */
export function vanillaTemplate(letheRoot, characterId) {
  const idx = vanillaIndex(letheRoot);
  return idx.personalities.find((p) => p.characterId === Number(characterId)) || idx.personalities[0] || null;
}