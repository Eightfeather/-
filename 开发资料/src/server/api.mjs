import * as fs from 'node:fs';
import { ARG_COUNTS } from '../knowledge/arg-counts.mjs';
import { join } from 'node:path';
import { APP_ROOT, USER_DATA_DIR } from '../paths.mjs';
import { configPath, rememberRoot, saveConfig } from '../config.mjs';
import { locate, scanStats } from '../locate.mjs';
import { createMod, disableMod, dirOf, enableMod, listMods, modDir, readModPayload, resolveModDir } from '../lethe/mods.mjs';
import { listDlls, setDllEnabled } from '../lethe/dlls.mjs';
import { createPersonality, getPersonality, listPersonalities, savePersonality } from '../lethe/personality.mjs';
import { vanillaIndex } from '../lethe/vanilla.mjs';
import { createDllBackup, createUserBackup, listDllBackups, listUserBackups, readBackupPayload, swapBackup } from '../lethe/backups.mjs';
import { autoBackupsDir, journalDir, markCleanExit, markRunning, readSessionMarker, readState, updateState, writeState } from '../lethe/state.mjs';
import { restoreFromSlot, slotInfo } from '../lethe/snapshot.mjs';
import { homeStats } from '../lethe/stats.mjs';
import { createSkill, getSkill, importSkills, listSkills, searchSkillIndex, skillsOfVanillaPersonality } from '../lethe/skills.mjs';
import {
  BUFF_CLASSES, BUFF_TYPES, COIN_COLORS, DEFAULT_BUFF_INFO, DEFAULT_INFO, DEFAULT_PASSIVE_INFO, MODULE_KINDS,
  PASSIVE_CONDITION_TYPES, PHYSICAL_TYPES, SIN_TYPES,
  createModule, deleteModule, getModule, listModules, readSkillMeta, readPassiveMeta, readBuffMeta,
  updateModule, writeSkillCode, writeSkillMeta, writePassiveMeta, writeBuffMeta, writeModuleProgram } from '../lethe/meta.mjs';
import { createPassive, getPassive, importPassives, listPassives, patchPassiveMeta, searchPassiveIndex } from '../lethe/passives.mjs';
import { createBuff, getBuff, importBuffs, listBuffs, patchBuffMeta, searchBuffIndex } from '../lethe/buffs.mjs';
import { analyzeDescription, buffIconIndex, keywordTables, toGameText } from '../lethe/keywords.mjs';
import { TIMING_ARGS } from '../knowledge/timing-args.mjs';
import { ARG_ENUMS } from '../knowledge/arg-enums.mjs';
import { ARG_OPTIONAL } from '../knowledge/arg-optional.mjs';
import { COMMANDS, ACQUIRERS, CONSEQUENCES, modularStats } from '../knowledge/modular-tables.mjs';
import { SCOPES, TIMING_SCOPE, COMMAND_SCOPE, TIMING_CONTAINERS, COMMAND_CONTAINERS } from '../knowledge/scopes.mjs';
import { createApi } from './api-shared.mjs';
import { compileProgram, compileTimingRows } from '../lethe/program.mjs';
import { saveCompiledBuff, saveCompiledPassive, saveCompiledSkill } from '../lethe/apply.mjs';

export function buildApi(ctx) {
  const { state, log, session, autosave } = ctx;
  const need = () => {
    if (!state.letheRoot) {
      const err = new Error('还没有定位到私服。请先在“设置”里指定 Lethe 目录。');
      err.status = 428;
      throw err;
    }
    return { letheRoot: state.letheRoot, gameRoot: state.gameRoot };
  };

  const keyOf = (q, body) => {
    const mod = body?.name || q?.get('name') || '';
    const key = body?.key || q?.get('key') || '';
    return { mod, key };
  };

  const patchSkillMetaSafe = (letheRoot, mod, id, patch) => {
    const before = readSkillMeta(letheRoot, mod, id);
    const change = writeSkillMeta(letheRoot, mod, id, patch);
    return { before, change };
  };

  const api = {
    'GET /api/health': () => ({ ok: true, app: 'The Lethe Workbench', version: ctx.version }),

    'GET /api/status': () => ({
      ok: true,
      version: ctx.version,
      appRoot: APP_ROOT,
      userDataDir: USER_DATA_DIR,
      configPath: configPath(),
      letheRoot: state.letheRoot,
      gameRoot: state.gameRoot,
      locatedAt: state.locatedAt,
      source: state.source,
      theme: state.config?.theme || 'dark',
      editorName: readState(state.letheRoot || '').editorName || '但丁',
    }),

    'GET /api/home': () => {
      let stats = null;
      if (state.letheRoot) {
        try { stats = homeStats(state.letheRoot, state.gameRoot); } catch (err) { stats = { error: err.message }; }
      }
      return {
        ok: true,
        letheRoot: state.letheRoot || '',
        gameRoot: state.gameRoot || '',
        editorName: readState(state.letheRoot || '').editorName || '但丁',
        stats,
      };
    },

    'POST /api/locate': async (body) => {
      const result = locate({
        explicit: body.path || body.explicit,
        config: state.config,
        quick: body.quick !== false,
        budgetMs: Number(body.budgetMs) || 8000,
      });
      if (result.best) {
        state.letheRoot = result.best.letheRoot;
        state.gameRoot = result.best.gameRoot;
        state.locatedAt = new Date().toISOString();
        state.source = result.best.from;
        markRunning(state.letheRoot);
        state.config = rememberRoot(result.best.gameRoot || result.best.letheRoot);
        log?.(`定位成功：${state.letheRoot}`);
      }
      return { ok: Boolean(result.best), best: result.best, candidates: result.candidates, tried: result.tried, stats: { ...scanStats } };
    },

    'POST /api/root': async (body) => {
      const result = locate({ explicit: body.path, config: state.config, quick: true });
      if (!result.best) {
        const err = new Error('这个目录不像 Lethe 的根目录（应包含 mods 或 dumpedData）');
        err.status = 400;
        throw err;
      }
      state.letheRoot = result.best.letheRoot;
      state.gameRoot = result.best.gameRoot;
      state.locatedAt = new Date().toISOString();
      state.source = 'manual';
      markRunning(state.letheRoot);
      state.config = rememberRoot(result.best.gameRoot || result.best.letheRoot);
      return { ok: true, ...result.best };
    },

    'POST /api/config': async (body) => {
      state.config = saveConfig(body || {});
      if (body && typeof body.editorName === 'string' && state.letheRoot) {
        updateState(state.letheRoot, (st) => ({ ...st, editorName: body.editorName.trim() || '但丁' }));
      }
      return { ok: true, config: state.config };
    },

    'GET /api/mods': () => {
      const { letheRoot } = need();
      return { ok: true, mods: listMods(letheRoot) };
    },

    'GET /api/mod': (q) => {
      const { letheRoot } = need();
      const name = q.get('name');
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
        autoSave: slotInfo(join(autoBackupsDir(letheRoot), found.name)),
      };
    },

    'POST /api/mod/create': async (body) => {
      const { letheRoot } = need();
      const created = createMod(letheRoot, body);
      return { ok: true, mod: created };
    },

    'POST /api/mod/disable': async (body) => {
      const { letheRoot } = need();
      return { ok: true, mod: disableMod(letheRoot, body.name) };
    },

    'POST /api/mod/enable': async (body) => {
      const { letheRoot } = need();
      return { ok: true, mod: enableMod(letheRoot, body.name) };
    },

    'POST /api/mod/backup': async (body) => {
      const { letheRoot } = need();
      return { ok: true, backup: createUserBackup(letheRoot, body.name) };
    },

    'GET /api/backup/read': (q) => {
      const { letheRoot } = need();
      return { ok: true, backup: readBackupPayload(letheRoot, q.get('name'), q.get('label')) };
    },

    'POST /api/mod/swap': async (body) => {
      const { letheRoot } = need();
      const result = swapBackup(letheRoot, body.name, body.label);
      session.clear(body.name);
      autosave.stop(body.name);
      return { ok: true, ...result };
    },

    /* ---------- 编辑会话：撤销 / 重做 / 保存点 ---------- */
    'GET /api/session': (q) => {
      const { letheRoot } = need();
      const { mod, key } = keyOf(q);
      return {
        ok: true,
        session: session.state(mod),
        target: key ? { canUndo: session.canUndo(mod, key), canRedo: session.canRedo(mod, key) } : null,
        autoSave: autosave.slot(mod),
      };
    },

    'POST /api/undo': async (body) => {
      const { mod, key } = keyOf(null, body);
      if (!mod || !key) { const e = new Error('撤销需要指定 Mod 与编辑目标'); e.status = 400; throw e; }
      return { ok: true, ...session.undo(mod, key) };
    },

    'POST /api/redo': async (body) => {
      const { mod, key } = keyOf(null, body);
      if (!mod || !key) { const e = new Error('重做需要指定 Mod 与编辑目标'); e.status = 400; throw e; }
      return { ok: true, ...session.redo(mod, key) };
    },

    'POST /api/autosave/now': async (body) => {
      const { mod } = keyOf(null, body);
      const result = autosave.runNow(mod);
      return { ok: Boolean(result.ok), result, status: autosave.status() };
    },

    'GET /api/autosave': (q) => {
      const { mod } = keyOf(q);
      return { ok: true, status: autosave.status(), slot: mod ? autosave.slot(mod) : null };
    },

    /* ---------- 崩溃恢复 ---------- */
    'GET /api/recover-check': () => {
      const { letheRoot } = need();
      const marker = readSessionMarker(letheRoot);
      const unclean = Boolean(marker && marker.running && marker.pid !== process.pid);
      const mods = [];
      try {
        for (const d of fs.readdirSync(autoBackupsDir(letheRoot), { withFileTypes: true })) {
          if (!d.isDirectory()) continue;
          const info = slotInfo(join(autoBackupsDir(letheRoot), d.name));
          if (info) mods.push({ name: d.name, ...info });
        }
      } catch { /* none */ }
      return { ok: true, unclean, marker, mods };
    },

    'POST /api/recover': async (body) => {
      const { letheRoot } = need();
      const mod = body.name;
      const { dir } = resolveModDir(letheRoot, mod);
      const slot = join(autoBackupsDir(letheRoot), mod);
      const safety = join(journalDir(letheRoot), 'recover', `${mod}-${Date.now()}`);
      fs.mkdirSync(join(safety, '..'), { recursive: true });
      fs.cpSync(dir, safety, { recursive: true });
      const result = restoreFromSlot(slot, dir);
      markCleanExit(letheRoot);
      return { ok: true, mod, ...result, safetyCopy: safety };
    },

    /* ---------- DLL ---------- */
    'GET /api/dlls': () => {
      const { gameRoot, letheRoot } = need();
      const dlls = listDlls(gameRoot).map((d) => ({ ...d, backups: listDllBackups(letheRoot, d.file) }));
      return { ok: true, dlls, plugins: join(gameRoot, 'BepInEx', 'plugins') };
    },

    'POST /api/dll/toggle': async (body) => {
      const { gameRoot } = need();
      return { ok: true, dll: setDllEnabled(gameRoot, body.file, Boolean(body.enabled)) };
    },

    'POST /api/dll/backup': async (body) => {
      const { gameRoot, letheRoot } = need();
      return { ok: true, backup: createDllBackup(gameRoot, letheRoot, body.file) };
    },

    'GET /api/dll/backups': (q) => {
      const { letheRoot } = need();
      return { ok: true, backups: listDllBackups(letheRoot, q.get('file') || '') };
    },

    /* ---------- 人格 ---------- */
    'GET /api/personalities': (q) => {
      const { letheRoot } = need();
      const vanilla = vanillaIndex(letheRoot);
      const name = q.get('name');
      const custom = name ? listPersonalities(letheRoot, name) : [];
      return {
        ok: true,
        characters: vanilla.characters.length ? vanilla.characters : fallbackCharacters(),
        custom,
        vanillaCount: vanilla.personalities.length,
        vanillaAvailable: vanilla.available,
      };
    },

    'GET /api/vanilla': (q) => {
      const { letheRoot } = need();
      const idx = vanillaIndex(letheRoot);
      const cid = Number(q.get('characterId') || 0);
      const list = idx.personalities
        .filter((p) => !cid || p.characterId === cid)
        .map((p) => ({ id: p.id, characterId: p.characterId, name: p.name, title: p.title, rank: p.rank }));
      return { ok: true, characters: idx.characters, personalities: list };
    },

    'GET /api/personality': (q) => {
      const { letheRoot } = need();
      const one = getPersonality(letheRoot, q.get('name'), q.get('id'));
      if (!one) {
        const err = new Error('找不到这个人格');
        err.status = 404;
        throw err;
      }
      return { ok: true, personality: one };
    },

    /** 编辑即应用：写入变化字段，记录一个撤销步骤 */
    'POST /api/personality/patch': async (body) => {
      const { letheRoot } = need();
      const result = savePersonality(letheRoot, body);
      const key = `personality:${body.id}`;
      if (result.changed) {
        session.record(body.name, key, `编辑人格 ${body.id}`, result.changes || []);
        autosave.touch(body.name);
      }
      return { ok: true, ...result, session: session.state(body.name) };
    },

    /** 保存点：清空该人格的撤销/重做栈（符合“保存成功后撤销栈清空”） */
    'POST /api/personality/save': async (body) => {
      session.clear(body.name, `personality:${body.id}`);
      return { ok: true, committed: true, session: session.state(body.name) };
    },

    'POST /api/personality/create': async (body) => {
      const { letheRoot } = need();
      const created = createPersonality(letheRoot, body);
      return { ok: true, personality: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },

    /* ---------- 技能编辑（v0.3） ---------- */
    'GET /api/modular-tables': (q) => {
      const kind = String(q.get('kind') || '').trim();
      const text = String(q.get('q') || '').trim().toLowerCase();
      let rows = COMMANDS;
      if (kind === 'consequence' || kind === 'acquirer') rows = rows.filter((c) => c.kind === kind);
      if (text) {
        rows = rows.filter((c) =>
          c.name.toLowerCase().includes(text) ||
          String(c.cls || '').toLowerCase().includes(text) ||
          String(c.summary || '').toLowerCase().includes(text));
      }
      return {
        ok: true,
        stats: modularStats(),
        counts: { consequences: CONSEQUENCES.length, acquirers: ACQUIRERS.length },
        rows: rows.map((c) => ({
          kind: c.kind, name: c.name, zh: c.zh, cls: c.cls, sig: c.sig, args: c.args,
            aliasOf: c.aliasOf || [],
          summary: c.summary, params: c.params,
        })),
      };
    },
    'GET /api/keywords': () => {
      const { letheRoot } = need();
      const t = keywordTables(letheRoot);
      return {
        ok: true,
        timings: t.timings.map((x) => ({ id: x.id, en: x.en, zh: x.zh })),
        displayTimings: t.displayTimings,
        tags: t.tags,
        sins: t.sins,
        buffs: (() => {
          const icons = buffIconIndex(letheRoot);
          return t.buffs.map((b) => {
            const ids = Array.isArray(b.ids) ? b.ids : (b.id ? [b.id] : []);
            const hit = ids.map((x) => icons.get(String(x))).find(Boolean) || null;
            return hit ? Object.assign({}, b, { icon: hit }) : b;
          });
        })(),
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
        buffDefaults: DEFAULT_BUFF_INFO,
        timingArgs: TIMING_ARGS, argEnums: ARG_ENUMS,
      argOptional: ARG_OPTIONAL, argCounts: ARG_COUNTS,
      };
    },

    'POST /api/description/check': (body) => {
      const { letheRoot } = need();
      const tables = keywordTables(letheRoot);
      const text = String(body?.text ?? '');
      const res = analyzeDescription(text, tables);
      return { ok: true, ...res, game: toGameText(text, tables) };
    },

    'GET /api/skills': (q) => {
      const { letheRoot } = need();
      const name = q.get('name') || '';
      return {
        ok: true,
        skills: name ? listSkills(letheRoot, name) : [],
        modules: listModules(letheRoot),
        defaults: DEFAULT_INFO,
      };
    },

    'GET /api/skill': (q) => {
      const { letheRoot } = need();
      const one = getSkill(letheRoot, q.get('name'), q.get('id'));
      if (!one) { const e = new Error('找不到这个技能'); e.status = 404; throw e; }
      const lv = (one.locale && one.locale.levelList) || [];
      const name = (lv[0] && lv[0].name) || (one.locale && one.locale.name) || '';
      return {
        ok: true,
        skill: {
          id: one.id,
          rel: one.rel,
          name,
          override: Boolean(one.override),
          hasLocale: Boolean(one.locale),
          updatedAt: one.meta.updatedAt || '',
          info: one.meta.info,
          code: one.meta.code,
          description: one.meta.description,
          coinDescs: one.meta.coinDescs,
        },
      };
    },

    'POST /api/skill/create': (body) => {
      const { letheRoot } = need();
      const created = createSkill(letheRoot, { name: body.name, id: body.id, displayName: body.displayName });
      return { ok: true, skill: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },

    'POST /api/skill/meta': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const patch = {};
      if (body.info) patch.info = body.info;
      if (body.description !== undefined) patch.description = String(body.description);
      if (Array.isArray(body.coinDescs)) patch.coinDescs = body.coinDescs.map((x) => String(x ?? ''));
      const res = patchSkillMetaSafe(letheRoot, body.name, id, patch);
      if (res.change && res.change.before !== res.change.after) {
        session.record(body.name, 'skill:' + id, '编辑技能 ' + id, [{ rel: null, abs: res.change.abs, before: res.change.before, after: res.change.after }]);
        autosave.touch(body.name);
      }
      return { ok: true, meta: res.change.doc, session: session.state(body.name) };
    },

    'POST /api/skill/code': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const meta = readSkillMeta(letheRoot, body.name, id);
      const change = writeSkillCode(letheRoot, body.name, id, { ...(body.code || {}), coinCount: (body.code && body.code.coins ? body.code.coins.length : meta.info.coinCount) });
      const merged = readSkillMeta(letheRoot, body.name, id);
      return { ok: true, meta: merged, changed: change.before !== change.after };
    },

    'POST /api/skill/save': (body) => {
      const id = String(body.id);
      session.clear(body.name, 'skill:' + id);
      return { ok: true, committed: true, session: session.state(body.name) };
    },

    'GET /api/skill-search': (q) => {
      const { letheRoot } = need();
      return { ok: true, results: searchSkillIndex(letheRoot, q.get('q') || '', Number(q.get('limit') || 60)) };
    },

    'GET /api/vanilla-skills': (q) => {
      const { letheRoot } = need();
      return { ok: true, skills: skillsOfVanillaPersonality(letheRoot, q.get('personalityId')) };
    },

    'POST /api/skill/import': (body) => {
      const { letheRoot } = need();
      const res = importSkills(letheRoot, { name: body.name, ids: body.ids, source: body.source || { kind: 'vanilla' } });
      return { ok: true, ...res };
    },


    /* ---------- 模块编辑（v0.4） ---------- */
      'GET /api/scopes': () => ({ ok: true, scopes: SCOPES, timingScope: TIMING_SCOPE, commandScope: COMMAND_SCOPE, timingContainers: TIMING_CONTAINERS, commandContainers: COMMAND_CONTAINERS }),

    'GET /api/modules': () => {
      const { letheRoot } = need();
      return { ok: true, modules: listModules(letheRoot) };
    },

    'GET /api/module': (q) => {
      const { letheRoot } = need();
      const one = getModule(letheRoot, q.get('id'));
      if (!one) { const e = new Error('找不到这个模块'); e.status = 404; throw e; }
      return { ok: true, module: one };
    },

    'POST /api/module/create': (body) => {
      const { letheRoot } = need();
      const one = createModule(letheRoot, { name: body.name, desc: body.desc, prefix: body.prefix, kind: body.kind, scope: body.scope });
      return { ok: true, module: one };
    },

    'POST /api/module/save': (body) => {
      const { letheRoot } = need();
      const one = updateModule(letheRoot, body.id, { name: body.name, desc: body.desc, prefix: body.prefix, kind: body.kind, scope: body.scope });
      return { ok: true, module: one };
    },

    'POST /api/module/program': (body) => {
      const { letheRoot } = need();
      const one = writeModuleProgram(letheRoot, body.id, body.program, { expectUpdatedAt: body.expectUpdatedAt, force: !!body.force });
      return { ok: true, module: one };
    },

    'GET /api/module/compiled': (q) => {
      const { letheRoot } = need();
      const one = getModule(letheRoot, q.get('id'));
      if (!one) { const e = new Error('找不到这个模块'); e.status = 404; throw e; }
      return { ok: true, id: one.id, lines: compileProgram(one.program), rows: compileTimingRows(one.program), manual: one.program.manual || {} };
    },

    'POST /api/skill/apply': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const meta = readSkillMeta(letheRoot, body.name, id);
      const res = saveCompiledSkill(letheRoot, {
        name: body.name, id,
        displayName: body.displayName,
        info: meta.info || {}, code: meta.code || {},
        description: meta.description, coinDescs: meta.coinDescs,
      });
      session.clear(body.name, 'skill:' + id);
      autosave.touch(body.name);
      log ? log('[wb] 技能已写回 ' + body.name + '/' + id + '（' + res.scripts + ' 个脚本）') : 0;
      return { ok: true, applied: res.scripts, missing: res.missing || [], backups: res.backups || [], written: res.written || [] };
    },

    'POST /api/passive/apply': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const meta = readPassiveMeta(letheRoot, body.name, id);
      const res = saveCompiledPassive(letheRoot, { name: body.name, id, displayName: body.displayName, info: meta.info || {}, code: meta.code || {}, description: meta.description });
      session.clear(body.name, 'passive:' + id);
      autosave.touch(body.name);
      return { ok: true, applied: res.scripts, missing: res.missing || [], backups: res.backups || [] };
    },

    'POST /api/buff/apply': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const meta = readBuffMeta(letheRoot, body.name, id);
      const res = saveCompiledBuff(letheRoot, { name: body.name, id, displayName: body.displayName, info: meta.info || {}, code: meta.code || {}, description: meta.description });
      session.clear(body.name, 'buff:' + id);
      autosave.touch(body.name);
      return { ok: true, applied: res.scripts, missing: res.missing || [], backups: res.backups || [] };
    },

    'POST /api/module/delete': (body) => {
      const { letheRoot } = need();
      return { ok: true, ...deleteModule(letheRoot, body.id, { allowTest: !!body.allowTest }) };
    },

    /* ---------- 被动编辑（v0.4） ---------- */
    'GET /api/passives': (q) => {
      const { letheRoot } = need();
      const name = q.get('name') || '';
      return {
        ok: true,
        passives: name ? listPassives(letheRoot, name) : [],
        modules: listModules(letheRoot),
        defaults: DEFAULT_PASSIVE_INFO,
      };
    },

    'GET /api/passive': (q) => {
      const { letheRoot } = need();
      const one = getPassive(letheRoot, q.get('name'), q.get('id'));
      if (!one) { const e = new Error('找不到这个被动'); e.status = 404; throw e; }
      return {
        ok: true,
        passive: {
          id: one.id,
          rel: one.rel,
          name: (one.locale && one.locale.name) || '',
          override: Boolean(one.override),
          hasLocale: Boolean(one.locale),
          updatedAt: one.meta.updatedAt || '',
          info: one.meta.info,
          code: one.meta.code,
          description: one.meta.description,
        },
      };
    },

    'POST /api/passive/create': (body) => {
      const { letheRoot } = need();
      const created = createPassive(letheRoot, { name: body.name, id: body.id, displayName: body.displayName, desc: body.desc });
      return { ok: true, passive: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },

    'POST /api/passive/meta': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const patch = {};
      if (body.info) patch.info = body.info;
      if (body.description !== undefined) patch.description = String(body.description);
      const before = readPassiveMeta(letheRoot, body.name, id);
      const res = patchPassiveMeta(letheRoot, body.name, id, patch);
      if (res.change && res.change.before !== res.change.after) {
        session.record(body.name, 'passive:' + id, '编辑被动 ' + id, [{ rel: null, abs: res.change.abs, before: res.change.before, after: res.change.after }]);
        autosave.touch(body.name);
      }
      return { ok: true, meta: res.meta, session: session.state(body.name) };
    },

    'POST /api/passive/code': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const change = writePassiveMeta(letheRoot, body.name, id, { code: body.code || {} });
      return { ok: true, meta: change.doc, changed: change.before !== change.after };
    },

    'POST /api/passive/save': (body) => {
      const id = String(body.id);
      session.clear(body.name, 'passive:' + id);
      return { ok: true, committed: true, session: session.state(body.name) };
    },

    'GET /api/passive-search': (q) => {
      const { letheRoot } = need();
      return { ok: true, results: searchPassiveIndex(letheRoot, q.get('q') || '', Number(q.get('limit') || 80)) };
    },

    'POST /api/passive/import': (body) => {
      const { letheRoot } = need();
      const res = importPassives(letheRoot, { name: body.name, ids: body.ids, source: body.source || { kind: 'vanilla' } });
      return { ok: true, ...res };
    },

    /* ---------- Buff 编辑（v0.4） ---------- */
    'GET /api/buffs': (q) => {
      const { letheRoot } = need();
      const name = q.get('name') || '';
      return {
        ok: true,
        buffs: name ? listBuffs(letheRoot, name) : [],
        modules: listModules(letheRoot),
        defaults: DEFAULT_BUFF_INFO,
      };
    },

    'GET /api/buff': (q) => {
      const { letheRoot } = need();
      const one = getBuff(letheRoot, q.get('name'), q.get('id'));
      if (!one) { const e = new Error('找不到这个 Buff'); e.status = 404; throw e; }
      return {
        ok: true,
        buff: {
          id: one.id,
          rel: one.rel,
          name: (one.locale && one.locale.name) || '',
          override: Boolean(one.override),
          hasLocale: Boolean(one.locale),
          updatedAt: one.meta.updatedAt || '',
          info: one.meta.info,
          code: one.meta.code,
          description: one.meta.description,
        },
      };
    },

    'POST /api/buff/create': (body) => {
      const { letheRoot } = need();
      const created = createBuff(letheRoot, { name: body.name, id: body.id, displayName: body.displayName, desc: body.desc, info: body.info });
      return { ok: true, buff: { id: created.id, entity: created.entity, locale: created.locale }, written: created.written };
    },

    'POST /api/buff/meta': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const patch = {};
      if (body.info) patch.info = body.info;
      if (body.description !== undefined) patch.description = String(body.description);
      const res = patchBuffMeta(letheRoot, body.name, id, patch);
      if (res.change && res.change.before !== res.change.after) {
        session.record(body.name, 'buff:' + id, '编辑 Buff ' + id, [{ rel: null, abs: res.change.abs, before: res.change.before, after: res.change.after }]);
        autosave.touch(body.name);
      }
      return { ok: true, meta: res.meta, session: session.state(body.name) };
    },

    'POST /api/buff/code': (body) => {
      const { letheRoot } = need();
      const id = String(body.id);
      const change = writeBuffMeta(letheRoot, body.name, id, { code: body.code || {} });
      return { ok: true, meta: change.doc, changed: change.before !== change.after };
    },

    'POST /api/buff/save': (body) => {
      const id = String(body.id);
      session.clear(body.name, 'buff:' + id);
      return { ok: true, committed: true, session: session.state(body.name) };
    },

    'GET /api/buff-search': (q) => {
      const { letheRoot } = need();
      return { ok: true, results: searchBuffIndex(letheRoot, q.get('q') || '', Number(q.get('limit') || 80)) };
    },

    'POST /api/buff/import': (body) => {
      const { letheRoot } = need();
      const res = importBuffs(letheRoot, { name: body.name, ids: body.ids, source: body.source || { kind: 'vanilla' } });
      return { ok: true, ...res };
    },

    'POST /api/reveal': async (body) => {      const p = String(body.path || '');
      const { letheRoot } = need();
      const okRoot = letheRoot && p.toLowerCase().startsWith(letheRoot.toLowerCase());
      const okUser = p.toLowerCase().startsWith(USER_DATA_DIR.toLowerCase());
      if (!okRoot && !okUser) {
        const err = new Error('只允许打开私服或用户数据目录内的路径');
        err.status = 400;
        throw err;
      }
      const { spawn } = await import('node:child_process');
      spawn('explorer.exe', [p], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true };
    },
  };

  return createApi(api);
}

export function fallbackCharacters() {
  return [
    { id: 1, name: '李箱' }, { id: 2, name: '浮士德' }, { id: 3, name: '堂吉诃德' },
    { id: 4, name: '良秀' }, { id: 5, name: '默尔索' }, { id: 6, name: '鸿璐' },
    { id: 7, name: '希斯克利夫' }, { id: 8, name: '以实玛利' }, { id: 9, name: '罗佳' },
    { id: 10, name: '辛克莱' }, { id: 11, name: '奥提斯' }, { id: 12, name: '格里高尔' },
  ];
}