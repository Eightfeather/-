import * as fs from 'node:fs';
import { join } from 'node:path';

/** 骨架按需生长：所有“该建哪些目录”的知识只在这张表里 */
export const LAYOUT = {
  personality: [
    'custom_limbus_data/personality',
    'custom_limbus_locale/EN/personalityList',
  ],
  skill: [
    'custom_limbus_data/skill',
    'custom_limbus_locale/EN/skillList',
  ],
  passive: [
    'custom_limbus_data/passive',
    'custom_limbus_data/personality-passive',
    'custom_limbus_locale/EN/passiveList',
  ],
  buff: [
    'custom_limbus_data/buff',
    'custom_buffs',
    'custom_limbus_locale/EN/bufList',
    'custom_limbus_locale/EN/keywordList',
  ],
  appearance: [
    'custom_limbus_data/personality',
    'custom_sprites',
    'custom_appearance',
  ],
};

export function layoutFor(kind) {
  return LAYOUT[kind] || [];
}

export function hasLayout(modDir, kind) {
  return layoutFor(kind).every((rel) => fs.existsSync(join(modDir, ...rel.split('/'))));
}

/** 只创建“缺的那个”，不动已有目录；返回本次新建的相对路径 */
export function ensureLayout(modDir, kind) {
  const created = [];
  for (const rel of layoutFor(kind)) {
    const abs = join(modDir, ...rel.split('/'));
    if (!fs.existsSync(abs)) {
      fs.mkdirSync(abs, { recursive: true });
      created.push(rel);
    }
  }
  return created;
}