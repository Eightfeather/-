/**
 * 落地层：把编辑器里的「模块 + 草稿」真正写回游戏文件。
 *
 * 补的是变体版本唯一比我们多的那一段（模块 → abilityScriptList / requireIDList / list[].ability），
 * 但模块不再像变体那样存字符串数组，而是把积木程序交给 program.mjs 编译成脚本行。
 *
 * 三类写入都走 writeFilesTransactional：临时文件 → 备份 → 原子替换 → 失败回滚。
 */

import { join } from 'node:path';
import { readJson, writeFilesTransactional } from '../atomic.mjs';
import { SafetyError } from '../safety.mjs';
import { entitiesOf, modDirSafe, readModPayload } from './mods.mjs';
import { getModule, readBuffMeta, readPassiveMeta, readSkillMeta, writeBuffMeta, writePassiveMeta, writeSkillMeta } from './meta.mjs';
import { compileProgram } from './program.mjs';
import { keywordTables, toGameText } from './keywords.mjs';

/** 把一个或多个模块编译成脚本行（每条都是完整 Modular/… ） */
export function moduleScripts(letheRoot, ids) {
  const lines = [];
  const missing = [];
  for (const id of ids || []) {
    const doc = getModule(letheRoot, String(id));
    if (!doc) { missing.push(String(id)); continue; }
    for (const line of compileProgram(doc.program)) if (line) lines.push(line);
  }
  return { lines, missing };
}

function buffLocale(payload) {
  const en = (payload.locales && payload.locales.EN) || {};
  return en.buff || en.buf || [];
}

function findEntity(payload, cat, id) {
  const found = (payload.data[cat] || []).find((x) => String(x.id) === String(id));
  if (!found) throw new SafetyError('在 Mod 里找不到 ' + cat + ' ' + id);
  return found;
}

function loadEntityDoc(dir, found) {
  const doc = readJson(join(dir, found.rel), null);
  if (!doc) throw new SafetyError('无法读取文件：' + found.rel);
  const list = entitiesOf(doc);
  const ent = list[found.index];
  if (!ent) throw new SafetyError('实体丢失：' + found.rel + ' #' + found.index);
  return { doc, ent };
}

function writeBack(letheRoot, dir, mod, files) {
  const result = writeFilesTransactional({ modDir: dir, files, root: letheRoot, mod });
  return result;
}

const SPECIAL_COIN = { red: { color: 'RED', script: 'SuperCoin' }, green: { color: 'GREEN', script: 'ExtractCoin' }, purple: { color: 'PURPLE', script: null } };

function normalizeCoinColor(value) {
  const c = String(value || '').toLowerCase();
  if (c === 'red' || c === 'redcoin') return 'red';
  if (c === 'green' || c === 'greencoin') return 'green';
  if (c === 'purple') return 'purple';
  return 'normal';
}

/**
 * 技能落地：模块 → skillData[0].abilityScriptList 与每枚 coinList[i].abilityScriptList，
 * 外加 basePower/atkCorrection/targetNum/physical/sin/硬币数量/正负硬币，以及描述与硬币描述。
 */
export function saveCompiledSkill(letheRoot, { name, id, info = {}, name: displayName, tier, scripts, code, description, coinDescs } = {}) {
  const mod = String(name || '');
  const dir = modDirSafe(letheRoot, mod);
  const payload = readModPayload(dir);
  const found = findEntity(payload, 'skill', id);
  const { doc, ent } = loadEntityDoc(dir, found);
  const sid = String(id);

  if (tier != null) ent.skillTier = Number(tier);
  ent.skillData = Array.isArray(ent.skillData) && ent.skillData.length ? ent.skillData : [{}];
  const sd = ent.skillData[0] || (ent.skillData[0] = {});

  if (info.basePower != null) sd.defaultValue = Number(info.basePower);
  if (info.atkCorrection != null) sd.skillLevelCorrection = Number(info.atkCorrection);
  if (info.targetNum != null) sd.targetNum = Number(info.targetNum);
  if (info.physical) sd.atkType = String(info.physical);
  if (info.sin) sd.attributeType = String(info.sin);

  if (info.randomArea === 'random_last_all') {
    sd.isRandomAreaAttack = true;
    sd.abilityScriptList = Array.isArray(sd.abilityScriptList) ? sd.abilityScriptList : [];
    if (!sd.abilityScriptList.some((s) => s && s.scriptName === 'WideAreaRampageDealAllAtLastCoin')) {
      sd.abilityScriptList.unshift({ scriptName: 'WideAreaRampageDealAllAtLastCoin' });
    }
  } else if (info.randomArea === 'random' || info.randomArea === 'none') {
    sd.isRandomAreaAttack = info.randomArea === 'random';
    if (Array.isArray(sd.abilityScriptList)) {
      sd.abilityScriptList = sd.abilityScriptList.filter((s) => !s || s.scriptName !== 'WideAreaRampageDealAllAtLastCoin');
    }
  }

  const refIds = (code && code.skill) || [];
  const { lines, missing } = Array.isArray(scripts)
    ? { lines: scripts.map(String), missing: [] }
    : moduleScripts(letheRoot, refIds);
  if (!lines.length && missing.length) {
    throw new SafetyError('这些模块已经不存在：' + missing.join('、') + '（为避免把技能脚本清空，本次没有写入）');
  }
  sd.abilityScriptList = lines.map((scriptName) => ({ scriptName }));

  const codeCoins = (code && Array.isArray(code.coins)) ? code.coins : [];
  const targetCount = info.coinCount != null ? Number(info.coinCount) : (codeCoins.length || (Array.isArray(sd.coinList) ? sd.coinList.length : 1));
  const count = Math.max(1, Math.min(12, targetCount || 1));
  const opType = info.sign === 'negative' ? 'SUB' : 'ADD';

  sd.coinList = Array.isArray(sd.coinList) ? sd.coinList : [];
  while (sd.coinList.length < count) sd.coinList.push({ operatorType: opType, color: 'GREY', scale: 3, prob: 0.5, abilityScriptList: [] });
  while (sd.coinList.length > count) sd.coinList.pop();

  for (let i = 0; i < sd.coinList.length; i++) {
    const coin = sd.coinList[i] || (sd.coinList[i] = {});
    coin.operatorType = opType;
    const src = codeCoins[i];
    if (!src) continue;
    if (src.value != null && src.value !== '') coin.scale = Number(src.value);
    const kind = normalizeCoinColor(src.color);
    const special = SPECIAL_COIN[kind];
    if (special) coin.color = special.color;
    const specialLines = special && special.script ? [special.script] : [];
    const coinLines = moduleScripts(letheRoot, src.modules || []).lines;
    if (specialLines.length || coinLines.length) {
      coin.abilityScriptList = [...specialLines, ...coinLines].map((scriptName) => ({ scriptName }));
    }
  }

  const files = [{ rel: found.rel, content: JSON.stringify(doc, null, 2) }];

  const tables = keywordTables(letheRoot);
  const locFound = (payload.locales.EN && payload.locales.EN.skill ? payload.locales.EN.skill : []).find((x) => String(x.key) === sid);
  if (locFound) {
    const locDoc = readJson(join(dir, locFound.rel), null);
    if (locDoc) {
      let entry = Array.isArray(locDoc.list) ? locDoc.list.find((e) => String(e.id) === sid) : locDoc[sid];
      if (!entry && !Array.isArray(locDoc.list)) { entry = locDoc[sid] = { a: 0, id: sid, levelList: [] }; }
      if (entry) {
        entry.levelList = Array.isArray(entry.levelList) && entry.levelList.length ? entry.levelList : [{ level: 1, name: displayName || sid, desc: '', coinlist: [] }];
        for (const lv of entry.levelList) {
          if (displayName) lv.name = String(displayName);
          if (description !== undefined) lv.desc = toGameText(String(description || ''), tables);
          if (Array.isArray(coinDescs)) {
            lv.coinlist = Array.isArray(lv.coinlist) ? lv.coinlist : [];
            while (lv.coinlist.length < count) lv.coinlist.push({ coindescs: [{ desc: '', summary: '' }] });
            while (lv.coinlist.length > count) lv.coinlist.pop();
            for (let ci = 0; ci < count; ci++) {
              const g = toGameText(String(coinDescs[ci] || ''), tables);
              const parts = g.split('\n').map((s) => s.trim()).filter(Boolean);
              lv.coinlist[ci] = { coindescs: parts.length ? parts.map((d) => ({ desc: d, summary: '' })) : [{ desc: g, summary: '' }] };
            }
          }
        }
      }
      files.push({ rel: locFound.rel, content: JSON.stringify(locDoc, null, 2) });
    }
  }

  const result = writeBack(letheRoot, dir, mod, files);
  writeSkillMeta(letheRoot, mod, sid, { touch: true });
  return { id: sid, scripts: lines.length, missing, ...result };
}

/** 被动落地：罪孽条件 + requireIDList + 描述 */
export function saveCompiledPassive(letheRoot, { name, id, info = {}, displayName, code, description } = {}) {
  const mod = String(name || '');
  const dir = modDirSafe(letheRoot, mod);
  const payload = readModPayload(dir);
  const found = findEntity(payload, 'passive', id);
  const { doc, ent } = loadEntityDoc(dir, found);
  const pid = String(id);

  ent.attributeStockCondition = [];
  ent.attributeResonanceCondition = [];
  const cType = info.conditionType;
  const sin = info.sin || 'CRIMSON';
  const value = Math.max(1, Number(info.count) || 1);
  if (info.needCondition) {
    if (cType === 'resonance') ent.attributeResonanceCondition = [{ type: sin, value }];
    else ent.attributeStockCondition = [{ type: sin, value }];
  }

  const refIds = (code && code.modules) || [];
  const { lines, missing } = moduleScripts(letheRoot, refIds);
  if (!lines.length && missing.length) {
    throw new SafetyError('这些模块已经不存在：' + missing.join('、') + '（为避免把被动脚本清空，本次没有写入）');
  }
  ent.requireIDList = lines;

  const files = [{ rel: found.rel, content: JSON.stringify(doc, null, 2) }];
  const tables = keywordTables(letheRoot);
  const locFound = (payload.locales.EN && payload.locales.EN.passive ? payload.locales.EN.passive : []).find((x) => String(x.key) === pid);
  if (locFound) {
    const locDoc = readJson(join(dir, locFound.rel), null);
    if (locDoc) {
      let entry = Array.isArray(locDoc.list) ? locDoc.list.find((e) => String(e.id) === pid) : locDoc[pid];
      if (!entry && !Array.isArray(locDoc.list)) entry = locDoc[pid] = { id: pid, name: displayName || pid, desc: '' };
      if (entry) {
        if (displayName) entry.name = String(displayName);
        if (description !== undefined) entry.desc = toGameText(String(description || ''), tables);
      }
      files.push({ rel: locFound.rel, content: JSON.stringify(locDoc, null, 2) });
    }
  }

  const result = writeBack(letheRoot, dir, mod, files);
  writePassiveMeta(letheRoot, mod, pid, { touch: true });
  return { id: pid, scripts: lines.length, missing, ...result };
}

/** Buff 落地：类别/正负/最大强度/最大层数/图标 + list[{ability}] + 描述 */
export function saveCompiledBuff(letheRoot, { name, id, info = {}, displayName, code, description } = {}) {
  const mod = String(name || '');
  const dir = modDirSafe(letheRoot, mod);
  const payload = readModPayload(dir);
  const found = findEntity(payload, 'buff', id);
  const { doc, ent } = loadEntityDoc(dir, found);
  const bid = String(id);

  if (info.buffClass) ent.buffClass = String(info.buffClass);
  if (info.buffType) ent.buffType = String(info.buffType);
  if (info.canBeDespelled !== undefined) ent.canBeDespelled = Boolean(info.canBeDespelled);
  if (info.maxStack != null) ent.maxStack = Math.max(1, Number(info.maxStack) || 1);
  if (info.maxTurn != null) ent.maxTurn = Number(info.maxTurn) || 1;
  if (info.iconId !== undefined) ent.iconId = String(info.iconId || '');

  const refIds = (code && code.modules) || [];
  const { lines, missing } = moduleScripts(letheRoot, refIds);
  if (!lines.length && missing.length) {
    throw new SafetyError('这些模块已经不存在：' + missing.join('、') + '（为避免把 Buff 脚本清空，本次没有写入）');
  }
  ent.list = lines.map((ability) => ({ ability }));

  const files = [{ rel: found.rel, content: JSON.stringify(doc, null, 2) }];
  const tables = keywordTables(letheRoot);
  const locFound = buffLocale(payload).find((x) => String(x.key) === bid);
  if (locFound) {
    const locDoc = readJson(join(dir, locFound.rel), null);
    if (locDoc) {
      let entry = Array.isArray(locDoc.list) ? locDoc.list.find((e) => String(e.id) === bid) : locDoc[bid];
      if (!entry && !Array.isArray(locDoc.list)) entry = locDoc[bid] = { id: bid, name: displayName || bid, desc: '' };
      if (entry) {
        if (displayName) entry.name = String(displayName);
        if (description !== undefined) entry.desc = toGameText(String(description || ''), tables);
      }
      files.push({ rel: locFound.rel, content: JSON.stringify(locDoc, null, 2) });
    }
  }

  const result = writeBack(letheRoot, dir, mod, files);
  writeBuffMeta(letheRoot, mod, bid, { touch: true });
  return { id: bid, scripts: lines.length, missing, ...result };
}
