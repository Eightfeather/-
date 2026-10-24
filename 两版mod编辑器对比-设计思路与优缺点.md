# 两个 Lethe mod 编辑器对比：编辑器1（LE简单编辑）vs 编辑器2（LBC Mod Creator）

> 对象：`E:\辅助文件\新建文件夹\编辑器1`（二进制，无源码）与 `E:\辅助文件\新建文件夹\编辑器2`（Node 全源码）。
> 方法：编辑器2 逐文件通读源码（2,323 行）＋ 本地实跑一次服务；编辑器1 读其可执行文件内的前端包（brotli 还原的 React 产物）、导出样本与既有取证清单（`LE简单编辑_取证/`）。
> 结论性质：**只汇总，未改动任何代码/文件**。同目录的 `编辑器3(妮娅).7z` 按要求未纳入。
> 日期：2026-10-22。

---

## 0. 一句话结论

| | 编辑器1 LE简单编辑 0.5 | 编辑器2 LBC Mod Creator 0.1 |
|---|---|---|
| 本质 | **积木式规则编译器 + 交付流水线**：把"意图"编译成 Modular 脚本，再打成规范 Lethe 包并负责安装/隔离/卸载 | **原生 JSON 就地编辑器 + 体检工具**：直接读写 `mods/<mod>/` 下游戏要读的那几个 JSON，另配诊断、贴图、本地化润色 |
| 目标用户 | 想"做一整套能发布的人格 mod"，且不熟悉 Modular 语法的人 | 已经有一个能跑的 mod、想改字段/改数值/改描述/查为什么不生效的人 |
| 强项 | 引擎知识准确、编译期拦截、全生命周期管理、失败可回滚 | 全源码可审计可改、排错直接对着游戏实际数据、交互细节扎实 |
| 硬伤 | 不可维护（无源码）、流程重、无法就地小改、缺运行期诊断 | 服务端安全欠账（`..` 未过滤、非原子写、无备份）、数据只改到 Lv1、读操作有写副作用 |

---

## 1. 定位与产品哲学（各自的"世界观"）

**编辑器1** 的自述是「更简单的技能编辑 / Lethe 模组积木工作台」，它假定：*用户不知道 Modular 脚本该怎么写，但知道自己想要什么效果*。于是它把"时点 + 条件树 + 动作"做成积木，编译成 `Modular/TIMING:<时点>/…` 的脚本行，**并且在编译期就拒绝掉那些它没把握在实机上成立的东西**（源码里 311 条含"不能/仅/必须"的守卫文案，例如「每回合／每场战斗次数限制尚未完成运行时隔离验证；可保存设计但不能生成」）。

**编辑器2** 的 README 首句是「直接读写 mods 目录下的 Limbus 原生 JSON」——它假定：*用户面对的是已经存在于磁盘上的 mod，编辑器的职责是别在搬运过程中弄坏它*。因此没有中间格式、没有编译器，**界面上的每个输入框就是 JSON 里的那个字段**，保存即覆盖原文件，游戏软重启（按 8）后立即验证。

两者其实是同一条流水线的上下游：编辑器1 负责"从无到有并交付"，编辑器2 负责"交付之后的修补与体检"。

---

## 2. 架构与工程量对比

| 维度 | 编辑器1 | 编辑器2 |
|---|---|---|
| 技术栈 | Tauri 2.11.5（Rust 后端 + WebView2）＋ React 18.3.1 打包前端 | Node ≥18 内置 `node:http` 服务 ＋ 原生 DOM（无框架、无构建） |
| 可得代码量 | **0 行**（前端为 3,039,265 B 的 minified 包；后端是 9.55 MB 的 exe） | **2,323 行**：`server.mjs` 846 行 / `public/app.mjs` 1,477 行 |
| 样式体积 | `index-BgBO5ngS.css` 211,925 B | `public/style.css` 12,977 B |
| 对外接口 | Rust 侧 27 个命令（`inspect_lethe_root`、`install_lethe_mod_directory`、`isolate_lethe_mod`、`write_personality_library_package` …），前端显式调用 24 个 | 19 个 HTTP 端点（`/api/root`…`/api/delete-mod`），前端 17 处调用 |
| 依赖 | 无 fs/shell/dialog/store 插件，文件操作全走自研命令；需 WebView2 | **零 npm 依赖**，全部 `node:` 内置模块 |
| 分发 | 单 exe 10,014,720 B ＋ NSIS 安装器 2,459,684 B，双击即用 | 1.09 MB 目录 ＋ 98 KB 的 `LBC Mod Creator.7z`，需先装 Node，由 `start.bat → start.ps1` 起服务并开浏览器（含三级打开兜底、端口占用探测） |
| 启动路径 | 原生窗口，进程内直接调命令 | `http://127.0.0.1:3081`，浏览器标签页 |

**含义**：编辑器1 的分发质量与运行环境安全性远高（用户机器上什么都不用装），但**它的行为只能靠逆向观察**；编辑器2 功能少得多，却是**唯一可以被读懂、被改、被接管的实现**。

---

## 3. 数据模型与"落到磁盘"的路径（最本质的差异）

### 3.1 编辑器1：自有工程 → 编译 → 规范包

工程文件格式为 `simple-skill-editor-complete-project-v1`（样本 `20901-完整工程-v0.5.json`，261,354 B），顶层结构：

```
workspaceFormat / version / editorVersion / createdAt
personality      → {sourceFileName, shape, root, entries}
skillWorkspace   → {workspaceFormat, envelope, entries, draftNotes, skillRuleDrafts,
                    skillTextDrafts, letheEntrySourceKeys, letheSourceByKey, integrity}
buffs            → {library, attachments}
passives         → {library, workspaces}
verification     → {personalityIds, skillCount, coinCount, buffCount, 各类草稿计数…}
```

要点：
- **单文件承载整包工程**，含 Buff 库、被动库、被动工作区、Buff 挂载关系，和 `verification` 自检计数 → 一个 JSON 就是一次可复现的构建。
- `letheSourceByKey` / `letheEntrySourceKeys` 保留**导入时的原始来源**；`integrity` 记录一致性 → 支持"导入现有 mod → 改 → 再导出"的往返，并且知道哪些内容不是自己生成的。
- 反向识别（可理解为"反编译回积木"）预设库：`modular.*` 15 条、`game.native.*` 34 条、`game-family.*` 6 条、`game.*` 38 条，匹配方式 `regular-expression | exact | modular-call`；认不出的保留 `raw-ability`（原样保存、绝不猜测）。
- 积木目录项是**声明式**的，例如（取自前端包）：

  ```js
  {id:"modular.reusecoin", call:"reusecoin", nameZh:"复用硬币", category:"coin",
   defaultLayer:"coin-entry", templateScriptName:"Modular/TIMING:WhenUse/reusecoin(0)",
   fields:[{key:"args", label:"插件参数", type:"raw"}],
   description:"让当前技能复用一个或多个硬币；参数按索引／运行时表达式传入，-1 表示当前硬币。"}
  ```

  编译器输出是脚本行数组，例如某条件积木生成：

  ```js
  ["Modular","TIMING:WhenUse", `VALUE_0:getbuff(${i},${n},${a})`,
   `VALUE_2:math(VALUE_0+VALUE_1)`, `VALUE_3:math(VALUE_2%${c})`, `IF(VALUE_4>${m}):…`]
  ```

- 落地：编译 → 规范包（样本 37 项：`custom_limbus_data/{personality,skill,passive,personality-passive,buff}` ＋ `custom_limbus_locale/EN/{personalityList,skillList,passiveList,bufList,keywordList}` ＋ `custom_buffs/*.txt`）＋ `MANIFEST.json` / `SHA256SUMS.txt` / `验证报告.json` / `未实现与行为差异.md` → 由 `install_lethe_mod_directory` / `register_lethe_mod` / `isolate_lethe_mod` 装进 Lethe，并登记进 `editor_managed_mods.json`，可 `uninstall_lethe_mod` / `restore_lethe_mod` 反向撤销。

### 3.2 编辑器2：原生 JSON 原地改

- 读：`readModPayload()` 只是**按目录名分桶地读**——`custom_limbus_data/{personality,skill,passive,buff}`、`custom_limbus_locale/<lang>/<类目>/**.json`、`custom_sprites/*.{png,webp,jpg,jpeg,gif}`；每个文件记 `{ok,data,raw,size}`，解析失败保留原文（不丢数据）。
- 视图模型：`makeVM()` 取"第一个含 `custom_limbus_data` 的 personality 文件 + 第一个 skill 文件"，**没有工程概念**，也没有导入/导出。
- 写：`/api/save`（`server.mjs:710-725`）把前端挑出来的 `[personality.json, skill.json, …locale]` 直接 `writeFile(abs, JSON.stringify(content,null,2)+'\n')`。
- 派生规则内置在代码里：`atkId=(pid,n)=>pid*100+n`、`defId=(pid,k)=>pid*1000+k`（`app.mjs:58-59`），并在 UI 上标注 "id = 人格id×100 + n"。
- 新建 mod = 复制自带 `template/ModTemplate`（Lethe 全量目录模板）；另配 `slim-mod`（删"所有值都是空数组"的 json ＋ 自底向上删空目录）与 `rename-mod`（改名文件夹 ＋ 把目录内**所有** json 改成 `<新名>.json`，重名加 `_1/_2`）。

### 3.3 模型差异的后果

| | 编辑器1 | 编辑器2 |
|---|---|---|
| 能不能改"别人的 mod" | 能：导入 → 工程 → 改 → 导出/安装（**格式会被规范化重排**） | 能：直接打开就改（**保留原文件其他字段**，只重写被编辑的那几个文件） |
| 能不能只改一个数字 | 不能，要走完整工程流程 | 能，改完保存即可 |
| 结构错误会不会被拦住 | 会（编译期 + 字段校验 + 32 位整数校验） | 基本不会（无 schema，字段名拼错也照样存盘） |
| 可回溯性 | 工程单文件 + SHA256SUMS + 备份（`original_personality_backups`） | 无备份、无 diff、无版本；只能靠 git 或用户自觉 |
| 写盘安全性 | tmp → backup → 失败回滚；拒绝路径逃逸/符号链接/junction；限额 256 MiB/64 MiB/20000/100000/32 层 | `writeFile` 直接覆盖（**非原子**）；`safeRel` 只挡绝对路径与 `..`；**无限额** |

---

## 4. 引擎知识的来源：反编译快照 vs 数据投票

这是两个项目最有趣的分歧：**同一个问题（"这个脚本在哪个时点触发"），一个用静态知识回答，一个用数据统计回答。**

| | 编辑器1 | 编辑器2 |
|---|---|---|
| 来源 | 反编译 `ModularSkillScripts.dll` 得到的元数据：582 条 / 240 个源文件；时点表 **86 条**（含 `RoundStart=-1`），与引擎 `timingDict` 逐条一致；另含 DSL 文法（分隔符 `/ : , + EXC`，指令 `TIMING/LUA/LOOP/LUAMAIN/RESETWHENUSE/CLEARVALUES/EXPECTED`） | 从游戏 `dumpedData` 里**共现投票**挖掘：时点名取自 `limbus_locale/EN/skillTagList.json`，脚本取自 `limbus_data/skill`/`skills` 与 `skillList.json`，硬币级权重 2、技能级 1、脚本名含时点 id 再兜底 1 票；产出 `timings.json`（**73 个时点**）＋ `script-timings.json`（**3,757 个脚本**，带 `confidence/votes/alternatives[3]`，例 `GiveBuffOnSucceedAttack → OnSucceedAttack` 置信 0.91） |
| 优点 | 准确、可解释、能覆盖引擎里存在但没人用过的时点；能直接给出"此动作在此无效"的结论 | 可重生成、不绑定引擎版本；工具 `tools/build-timing-db.mjs`（191 行）随包发布，dump 更新即重跑；带置信度，用户能判断该不该信 |
| 缺点 | **静态快照会过期**：编辑器内嵌快照为 2026-09-05（`lethe.runtime-knowledge/v1`，ModularSkillScripts.dll sha256 `5fe39ae8…`/528384 B），本机实际 DLL 已是 2026-09-18 的兼容补丁版（`e34fad9a…`/528896 B）——虽然两边时点表仍一致，但机制性结论可能滞后 | 只能"推断"，无法区分"没出现"与"不适用"；对低频脚本（`scripts: 0` 的时点很多）置信度低；依赖用户机上有完整 dump |
| 版本可见性 | 有指纹与快照日期（`snapshot_hashes.txt`），过期风险显式 | `timings.json` 记录 `generatedAt: 2026-10-04T08:06:42.217Z` 与 `source` 绝对路径（`D:\Games\LetheLauncher-Distribution-7\…\skillTagList.json`，README 示例路径，本机已不存在） |

---

## 5. 功能覆盖矩阵

| 能力 | 编辑器1 | 编辑器2 |
|---|---|---|
| 人格基础（id/名称/外观/属性/抗性/速度/break/rank） | ✔（7 分区之"身份与外观/战斗基础/理智系统"） | ✔（characterId 1–12、resistField 实时归类、速度只填一个值写满 4 档） |
| 攻击技能 | ✔ 积木/源码双模式 | ✔（但只编辑 `skillData[0]`，见 §7） |
| 守备技能 | ✔ | ✔（id = pid×1000+k） |
| 硬币（数值/脚本/SuperCoin） | ✔（默认落 `coin-entry` 层） | ✔（`coinCard` 有 SuperCoin 开关，勾选写 `{"scriptName":"SuperCoin"}`） |
| Buff 制作 | ✔ 完整（库 + 挂载 + 两套文本 + 动态文本块 LUA） | ✘ |
| 被动 | ✔ 四模式（简单/积木/完整/源码） | ✘ |
| 本地化文本 | ✔ 按"文本 ID/键"编辑五类目（personalityList/skillList/passiveList/bufList/keywordList），**固定写 EN**（UI 原文："语言目录（固定 EN）"） | ✔ 按"人格/技能等级/硬币行"结构化编辑，条数随 `coinList` 自动伸缩，可"同步到全部等级 1–4"，**同样只做 EN** |
| 描述里的时点分段 | 未结构化（走文本 ID 草稿） | ✔ 亮点：`parseTimingLine` 正则 `^(\s*)\[([A-Za-z][A-Za-z0-9_]*)\](\s*)([\s\S]*)$` 无损保留前后空白，`composeTimingLine` 原样拼回，未知标签记自定义；空时点可**自动填入**（用 `scriptTimings` 推断） |
| 贴图 | ✔ `custom_sprites`（`profile_`/`skill_` 命名约定，含 base64 上传） | ✔ profile/cg/skill 三槽，支持上传/删除/重命名，改 id 时自动迁移文件名 |
| 新建 mod | ✔ 人格创建向导 + 资产库（人格库可导入/导出/安装） | ✔ 复制 `template/ModTemplate` |
| 安装/注册/隔离/卸载/恢复 | ✔ 全套 27 命令 + `editor_managed_mods.json` | ✘（只写目录，注册交给用户在别处做） |
| 导出 | ✔ 8 种导出物（工程/人格/包/…）+ MANIFEST + SHA256SUMS + 验证报告 | ✘（保存即生效，没有"交付物"概念） |
| 诊断 | ✔ 编译期校验 + 《积木规则检查与实机验收清单》（自述"没有执行游戏，不代表实机通过"） | ✔ 运行期诊断 6 节：加载顺序、locale 键跨 mod 冲突、键与 id 不匹配、`LogOutput.log` 里**实际加载**了哪些 mod、id 溢出、**与游戏 dump 逐字段对比** |
| id 32 位溢出 | ✔ 校验（"数值必须在 32 位整数范围内"） | ✔ 即时红字徽标"⚠ id 溢出（游戏内不会显示技能文字）" |
| 一键精简/重命名 | 部分（isolate/uninstall 清理） | ✔ `slim-mod` / `rename-mod` |
| 撤销/重做 | ✘（仅 Buff"撤回来源替换"） | ✘ |
| 关闭/切人未保存拦截 | ✘（无 `beforeunload`/`onCloseRequested`） | ✔（`app.mjs:1476` `beforeunload`；切人格 dirty 时 confirm） |
| 原生目录选择器 | 有 `pick_lethe_root`/`pick_mod_source_directory` 一类命令（实现未验证） | ✔ `IFileOpenDialog`+`FOS_PICKFOLDERS`，隐藏 TopMost 1×1 属主窗体防遮挡，哨兵 `__LBC_CANCELLED__` 区分"取消/失败"，回退 `FolderBrowserDialog`，temp ps1 带 BOM |
| 主题/其他 | 未见 | ✔ 深/浅色（localStorage）、toast、通用 modal、文件树 |

---

## 6. 安全性对比（编辑器2 的具体问题）

编辑器1 的设计是"**假设输入是敌意的**"：拒绝 `..`、拒绝绝对路径、拒绝符号链接与 junction、限额（256 MiB 技能 / 64 MiB 单资源 / 20,000 资源 / 100,000 目录项 / 32 层）、tmp→backup→失败回滚。

编辑器2 明显更信任本机用户，逐条列出可复现的问题：

1. **`cleanModName` 不过滤 `..`（`server.mjs:62`）**：`name => String(name).trim().replace(/[\\/:*?"<>|\r\n]/g,'_')`，`'..'` 原样保留。
   - `/api/delete-mod`（`server.mjs:812-818`）`md = path.join(MODS_DIR(),'..')` → 即 Lethe 根，`isDir` 为真 → `rm(md,{recursive:true,force:true})` = **整个私服目录被删**。
   - `/api/new`（`server.mjs:631`）同名场景会把 `template/ModTemplate` 整棵复制进 Lethe 根。
   - 缓解：前端从未调用 `delete-mod`（`app.mjs` 里 0 处引用），所以"点不到的按钮"救了一命；但这仍是**暴露在 127.0.0.1 上的无鉴权接口**。
2. **无 Origin/token 校验**：任意本机进程（乃至受限条件下的网页）都能 POST。若将来加上 `delete-mod` 按钮，风险立刻从"理论"变成"一键"。
3. **写盘非原子**：`/api/save` 直接 `writeFile`（`server.mjs:725`），进程中途被杀 → 半个 JSON；且**无备份**（编辑器1 有 `original_personality_backups` 与 tmp→backup 回滚）。
4. **默认根目录静默回退**：实测 `node server.mjs` 后 `GET /api/root` 返回
   `{"gameRoot":"D:\\Games\\LetheLauncher-Distribution-7","root":"E:\\辅助文件\\新建文件夹","modsDir":"…\\新建文件夹\\mods","hasMods":false}`——`config.json` 里的示例路径不存在时，`ROOT` 退成 **`path.resolve(__dirname,'..')`**（程序上一级），既不报错也不提示；用户此时点"新建"会落到一个与游戏无关的目录。编辑器1 则先 `inspect_lethe_root`，结构不对就拒绝操作。
5. **读操作有写副作用**：`ensureDataFields`（`app.mjs:228-237`）与 `defenseSlots`/`attackSlots`（`:238-256`）会**在读取时**给对象补默认值、往 `attributeList`/`defenseSkillIDList` 里 push 默认槽位；一旦保存，这些"你没填过"的字段就被写进 mod。对新手是便利（不再崩），对精确编辑是污染。

---

## 7. 代码质量与可维护性

**编辑器1**
- 优点：分层清晰（Rust 命令层 / 前端 service / 积木目录 / 编译器 / 校验器）；元数据与知识是数据驱动（catalog 582 条），新增积木不必改主流程；错误文案**写成产品语言**（解释运行时后果，而非抛异常）。
- 缺点：**不可维护**。3 MB minified React 包 + 原生二进制；性能与体积不透明；要修一个文案都得重新逆向。无测试痕迹（也可能在 Rust 侧不可见）。

**编辑器2**
- 优点：`server.mjs` 是 19 段 `if (p === '/api/xxx')` 的直线代码，**新人 10 分钟能定位任何功能**；每个字段一个 handler（`numField/textField/enumField/boolField`），新增字段≈复制一行；注释密度合适；工具脚本独立（时点库可单独重跑）；无构建步骤 = 改完刷新即可。
- 缺点：
  - **全量重绘**：`render()` 每次重建 `#editor`（输入框 `input` 只 `mark()` 不重绘，但任何 select/change/push 都重建），焦点与滚动位置依赖浏览器行为，长表单体验会抖。
  - **单文件巨型函数**：`skillLocaleBlock` 一个函数约 190 行（`:800-990`），内联了等级选择、同步/裁剪、硬币描述、时点段四套逻辑。
  - 只编辑 `skillData[0]`（`const s0 = sk => sk.skillData[0]`，`app.mjs:227`）：真实 mod 若带 `gaksungLevel` 多档（`skillLevelsOf` 会枚举它们，`:792`），Lv2–4 的数值与硬币**在界面上根本看不到**，只能手改 JSON——UI 上却有"同步到全部等级"的描述同步，容易让人误以为数据也能逐级改。
  - `rename-mod` 把目录内**所有** json 改成同名（`<mod>.json`，重名加 `_1/_2`）：对 Lethe 的"按内容加载"通常无害，但对任何按文件名/路径引用的结构是破坏性的，且不可撤销。
  - 无 schema 校验、无单元测试、无类型标注（纯 JSDoc 缺失）。

---

## 8. UX 与交互

| | 编辑器1 | 编辑器2 |
|---|---|---|
| 主界面 | 三栏 IDE：左侧人格库（含 MOD 人格 + 搜索）/ 中间 7 分区编辑区 / 右侧检查器；顶部 7 个按钮（载入全工程、载入人格 JSON、从 Lethe 读取、创建人格包、模组与人物包、导出人格、保存完整工程） | 左侧 mod → 人格二级菜单；顶部 mod 操作条（保存/刷新/新建/设置/新增人格）；两个标签页（数据 / 本地化+图片）；无三栏 |
| 模式分层 | 技能＝积木工作台/源码保真；Buff＝基础/触发规则/文本/源码·导入；被动＝简单/积木/完整/源码 —— **学习成本高但覆盖全** | 无模式分层，每个字段直接暴露 —— **上手快但容易被原生字段名淹没** |
| 保存语义 | 自动存 localStorage（`skill-drafts`/`buff-library.v1`/…，共 15 个前缀）但**只有显式导出才产文件**；关闭无提示 | 明确"点保存才写盘"，有脏标记徽标与 `beforeunload`；未保存切人格会 confirm |
| 反馈 | 状态徽标 + 编译错误 + 验收清单 + 导出报告 | toast + 诊断 modal（分节可折叠）+ 行内红字（id 溢出） |
| 快捷键/搜索 | `Ctrl K` 只是 kbd 标签**未接线**（全库无全局 keydown）；搜索只覆盖人格列表 | 无快捷键；无搜索（mod 少时够用） |
| 破坏性操作 | 拖入 JSON 直接覆盖当前工程；11 处 `window.confirm` | 6 处 confirm、2 处 `prompt()`（新增人格取 id）；`delete-mod` 不在 UI |
| 空状态/引导 | 有创建向导 | 无示例工程（模板目录即引导） |
| 主题 | 未见 | 深/浅色 |

一句话：**编辑器1 像 IDE，编辑器2 像一张表单**。前者对"我有大工程"友好，后者对"我就改这里"友好。

---

## 9. 各自优点 / 缺点清单

### 编辑器1 优点
1. **知识可信**：反编译元数据 + 86 条时点与引擎逐条一致；连"引擎读 `circles[1]` 而 wiki 只写 var_1"这类坑都能避开（前一轮核查已证）。
2. **编译期拦截**：宁可"仅保存设计、阻止导出"，也不生成半对半错的脚本 —— 这类诚实标注在 mod 工具里罕见。
3. **交付闭环**：安装/注册/隔离/卸载/恢复 + 资产库 + 8 种导出 + MANIFEST/SHA256/验证报告，可以直接对外发版。
4. **失败可回滚**：tmp→backup→回滚，且有原人格备份命令。
5. **零环境依赖**：单 exe，用户不需要 Node/浏览器插件。
6. **覆盖面最广**：人格/技能/守备/硬币/Buff/被动/本地化/贴图全覆盖，且 Buff/被动是编辑器2 完全没有的。

### 编辑器1 缺点
1. **不可维护**：无源码、无构建脚本，任何 bug 修复都得重做逆向；体积 9.55 MB 且前端 3 MB 全量加载。
2. **流程重**：改一个数字也要"导入→工程→改→导出→安装"，且**导入会重排原文件格式**，不适合给别人的 mod 做小修。
3. **无运行期证据**：它的校验是静态的，永远不知道"游戏实际加载了哪些 mod/是不是被别的 mod 覆盖了"——编辑器2 靠 `LogOutput.log` 与 dump 对比正好补上这一块。
4. **无撤销、无 `beforeunload`**、`Ctrl K` 未接线、关闭无提示。
5. **工程 v1 只支持 1 个人格**；本地化写死 EN。
6. **快照滞后**：内嵌引擎快照 2026-09-05 vs 本机 DLL 2026-09-18 补丁版，机制性结论可能已过期（时点表暂未受影响）。
7. **学习曲线陡**：7 分区 × 多模式 × 311 条限制文案，新手容易卡在"为什么不能导出"。

### 编辑器2 优点
1. **完全可读可改**：2,323 行、零依赖、无构建 —— 这是唯一能接手改的版本。
2. **透明**：所见即游戏读到的 JSON，没有格式转换损耗；保留未知字段（`{ok,data,raw,size}`）。
3. **排错强**：加载顺序 / locale 冲突 / 键-id 不匹配 / 日志里实际加载 / id 溢出 / 与 dump 对比 —— 这是"到底为什么没生效"的完整证据链。
4. **本地化编辑是它最好的部分**：等级、硬币条数联动、`[Tag]` 时点段无损拆分、时点自动补全 —— 比编辑器1 的"按文本键编辑"更贴近写描述的实际手感。
5. **时点知识可再生**：带置信度的投票 + 独立工具，不押注某个引擎版本。
6. **交互细节考究**：原生选择器的隐藏属主窗体 + 取消哨兵 + BOM + 三级兜底；`beforeunload` 与脏数据确认；主题切换。
7. **小工具齐**：`slim-mod`（清空文件）、`rename-mod`（联动贴图改名）、模板新建。

### 编辑器2 缺点
1. **服务端安全欠账**：`cleanModName` 漏 `..`（`server.mjs:62` → `:812-818` 可 `rm -rf` Lethe 根）、无 Origin/token、非原子写、无备份、无限额。
2. **默认根静默跑偏**：`config.json` 的 `gameRoot` 失效时回退到程序上级目录且不报错（实测 `/api/root` 返回 `E:\辅助文件\新建文件夹`）。
3. **功能面窄**：无 Buff、无被动、无安装/注册/隔离、无导出包；只编辑 `skillData[0]`。
4. **读有写副作用**：`ensureDataFields`/`defenseSlots` 读时补默认值，保存即落盘污染。
5. **无备份/撤销/差异**：覆盖即终局；`rename-mod` 连所有 json 一起改名。
6. **表单式交互的代价**：无搜索、无快捷键、`prompt()` 新增人格、全量重绘导致长表单抖动。
7. **无 schema 校验**：字段名拼错、类型写错都能存盘，错误要到游戏里才暴露。
8. **分发门槛**：必须装 Node 18+；服务窗口要手动关；控制台在非 UTF-8 终端会出现中文乱码（`start.bat` 里 `chcp 65001` 已规避，但直接 `node server.mjs` 会乱）。

---

## 10. 互相可借鉴的具体点

**编辑器1 应该拿走（来自编辑器2）**
- 运行期诊断三件套：`LogOutput.log` 里"实际加载了哪些 mod"、加载顺序（名称升序、后者覆盖前者）、与游戏 dump 的逐字段对比（personalityList 的 name/title/desc/oneLineTitle/acquisitionMethod；skillList 各级 name/desc）。
- id 溢出在**输入框旁即时红字**（它已有校验，但埋在编译期；编辑器2 把它变成改 id 时的即时反馈）。
- 时点库"可重生成 + 带置信度"的路子，作为内嵌快照的补充（快照过期时能自证）。
- `beforeunload`（它自己缺）；原生选择器的"取消哨兵"语义（它的 pick 命令行为未验证）。
- 一键精简（导出前跑一遍空文件清理，包更干净）。

**编辑器2 应该拿走（来自编辑器1）**
- 路径清洁与限额：`cleanModName` 拒绝 `..`/`.`/空、`safeRel` 之外再加"必须落在 mods 内且非符号链接"、读写大小上限。
- 原子写 + 备份：`writeFile(tmp) → rename`，保存前把旧文件写到 `*.bak`（或 `.lbc-backups/<时间戳>/`）。
- 编译期式校验的**轻量版**：至少对 id（32 位、派生规则）、`skillTier`、`gaksungLevel`、`coinList` 与 locale 描述条数做一致性检查后再允许保存。
- 多等级数据编辑（`skillData` 按 `gaksungLevel` 分页，而不是只改 `[0]`）。
- 未识别字段"保留原文、绝不猜测"的显式标注（它其实做到了保留，但 UI 上不说话）。
- 撤销栈（哪怕只在本次会话内）。
- 资产库/模板化新建（现在只能整体复制模板目录）。

---

## 11. 适用场景与建议

- **要做一个能发布的完整人格（含 Buff/被动/本地化/贴图）并管理安装** → 编辑器1，而且只用它。编辑器2 做不了 Buff/被动。
- **手上已有一个能跑的 mod，想改数值/改描述/改贴图/查为什么不生效** → 编辑器2 更快、更安全（不会重排你没碰的字段）；改完记得自己备份（它不备份）。
- **要学 Lethe mod 格式、或想自己加功能** → 只有编辑器2 可读；它的 `server.mjs` 是现成的"格式说明书"。
- **组合用法（推荐）**：编辑器2 做"诊断 + 小修"，编辑器1 做"整体重排 + 打包交付"。注意方向：**编辑器2 → 编辑器1 是安全的**（导入后重排无损失，有原始来源记录）；**编辑器1 → 编辑器2 要小心**（编辑器1 导出的规范化包字段更全，编辑器2 会原样保留，一般无害，但编辑器2 的"读时补默认值"可能给缺失字段塞默认值）。
- **风险提示**：给编辑器2 的 `delete-mod` / `new` 加 UI 入口之前，**必须先修 `cleanModName`**，否则一个 `..` 就能删掉整个私服目录。

---

## 12. 证据与复现

- 编辑器2 实跑（Node v24.18.1，`E:\辅助文件\新建文件夹\编辑器2`）：
  - `GET /api/root` → `{"gameRoot":"D:\\Games\\LetheLauncher-Distribution-7","root":"E:\\辅助文件\\新建文件夹",…,"hasMods":false}`
  - `GET /` → 200，HTML 1,625 B；服务启动日志正常（控制台中文因终端编码显示为乱码，不影响功能）。
- 编辑器1 证据目录：`E:\辅助文件\新建文件夹\编辑器1\LE简单编辑_取证\`
  - 前端包还原：`前端源码\index-_r-bgCsV.js`（3,039,265 B，React 18.3.1）、`index-BgBO5ngS.css`（211,925 B）
  - 命令/积木/时点清单：`清单\_le_cmds_found.txt`、`清单\_le_catalog.txt`、`清单\editor_timings.txt`、`清单\engine_timingDict.csv`
  - 编译产物与守卫文案：`清单\editor_compiler.txt`、`清单\_le_summary.txt`（311 条"不能/仅"）
  - 导出样本：`导出包样本\01-编辑器源档\20901-完整工程-v0.5.json`、`导出包样本\BepInEx\plugins\Lethe\mods\20901\…`
- 编辑器2 关键行号：`server.mjs:62`（cleanModName）、`:631`（new）、`:710-725`（save/writeFile）、`:812-818`（delete-mod）、`:227`（CANCEL 哨兵）、`public/app.mjs:58-59`（派生 id）、`:227`（`s0=skillData[0]`）、`:228-256`（读时补默认值）、`:792`（`skillLevelsOf`）、`:800-990`（`skillLocaleBlock`）、`:1476`（`beforeunload`）。
