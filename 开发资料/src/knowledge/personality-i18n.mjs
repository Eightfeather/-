import { join } from 'node:path';
import { readJson } from '../atomic.mjs';

/**
 * 人格相关枚举的中英对照。来源全部是游戏导出的 locale（不硬编码中文）：
 * - 罪孽属性：limbus_locale/EN/attributeList.json
 * - 技能关键词（7 个基础 status）：limbus_locale/EN/bufList.json
 * - 单位词条 / 阵营词条：limbus_locale/EN/uiList.json 的 UnitKeyword_* / associationName_*
 */
const SKILL_KEYWORD_IDS = ['Combustion', 'Laceration', 'Vibration', 'Burst', 'Sinking', 'Charge', 'Breath'];
const RANK_LABEL = { 1: '0', 2: '00', 3: '000' };

let cache = null;
let cacheAt = 0;
const TTL = 60 * 1000;

export function i18nTables(letheRoot, force = false) {
  const now = Date.now();
  if (!force && cache && now - cacheAt < TTL) return cache;
  const dir = join(letheRoot, 'dumpedData', 'limbus_locale', 'EN');
  const attrs = readJson(join(dir, 'attributeList.json'), {}) || {};
  const buf = readJson(join(dir, 'bufList.json'), {}) || {};
  const ui = readJson(join(dir, 'uiList.json'), {}) || {};

  const SIN_FALLBACK = [
    { id: 'CRIMSON', zh: '\u66b4\u6012' }, { id: 'SCARLET', zh: '\u8272\u6b32' }, { id: 'AMBER', zh: '\u6020\u60f0' },
    { id: 'SHAMROCK', zh: '\u66b4\u98df' }, { id: 'AZURE', zh: '\u5fe7\u90c1' }, { id: 'INDIGO', zh: '\u50b2\u6162' },
    { id: 'VIOLET', zh: '\u5ac9\u5992' }, { id: 'WHITE', zh: '\u75af\u72c2' }, { id: 'BLACK', zh: '\u54c0\u53f9' },
  ];
  const sinsFound = Object.values(attrs).map((x) => ({ id: x.id, zh: x.name || x.id }));
  const sins = sinsFound.length ? sinsFound : SIN_FALLBACK;
  const skillKeywords = SKILL_KEYWORD_IDS.map((id) => ({ id, zh: (buf[id] && buf[id].name) || id }));

  const unitKeyword = {};
  const association = {};
  for (const [k, v] of Object.entries(ui)) {
    const text = typeof v === 'string' ? v : (v && (v.content || v.name)) || '';
    if (!text || /[{}]/.test(text)) continue;
    if (k.startsWith('UnitKeyword_')) unitKeyword[k.slice('UnitKeyword_'.length)] = text;
    else if (k.startsWith('associationName_')) association[k.slice('associationName_'.length)] = text;
  }

  cache = { sins, skillKeywords, rankLabel: RANK_LABEL, unitKeyword, association, at: new Date().toISOString() };
  cacheAt = now;
  return cache;
}

export function unitKeywordLabel(tables, key) {
  return (tables.unitKeyword && tables.unitKeyword[key]) || '';
}

export function associationLabel(tables, key) {
  return (tables.association && tables.association[key]) || '';
}