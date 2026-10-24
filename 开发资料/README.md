# The Lethe Workbench · 边狱工作台

Limbus Company / Lethe 私服 Mod 桌面编辑器。单文件桌面应用：双击即开原生窗口，不弹控制台、不开浏览器、不依赖已安装的 Node、也不要求先有私服。
没有私服时仍可正常启动；一旦定位到私服，即可直接读写其 `mods/`。

- 发行版：项目根 `TheLetheWorkbench.exe`（约 36 MB，内含 Node SEA 后端与 WebView2 前端；构建输出在 `dist/app/`）
- 后端产物：`dist/server/LetheWorkbenchServer.exe`（约 93 MB，调试用，可直接跑 CLI/HTTP）
- 技术栈：Node 24（零运行时依赖，ESM）+ WinForms/WebView2 壳（.NET Framework 4.8）
- 版本：**0.4.0**（主页 + 四页导航 + 版本页签 + 文件内撤销 + 30 分钟自动快照 + 人格 / 技能 / 被动 / Buff 编辑 + 模块库）
- 许可/分发：内部使用；exe 未签名，首次运行可能触发 SmartScreen

## 目录结构

```
编辑器正式稿/
  TheLetheWorkbench.exe      ← 发行版（唯一的运行必需文件，双击即用）
  开发资料/                   ← 源码、构建链、文档（不参与运行，可整体移走）
    src/                     后端（Node ESM，零依赖）与前端（index.html / app.js / style.css）
    host/                    net48 WinForms + WebView2 桌面壳（C#）
    tools/                   build-server.mjs（打单文件后端）、build-app.mjs（组装桌面 exe）
    test/                    自测
    docs/                    设计稿、架构、验证记录、待落实映射
    build/ dist/             构建中间产物与产物
    package.json  README.md  开发用
```

> 运行时不读取 `开发资料/` 中的任何文件：exe 自带前端资源，首次启动把内置后端解包到 `%LOCALAPPDATA%\LetheWorkbench\runtime\<版本>`，配置写在 `%LOCALAPPDATA%\LetheWorkbench\config.json`。
> 重新构建：`cd 开发资料` → `node tools/build-server.mjs` → `node tools/build-app.mjs`（后者会自动把 exe 复制回项目根）。


## 快速开始

### 使用现成 exe

1. 双击项目根目录的 `TheLetheWorkbench.exe`；
2. 首次启动会自动寻找私服（含 `BepInEx/plugins/Lethe/mods` 的目录）；找不到会进入设置页，可手动填 Lethe 根目录或点「深度扫描磁盘」；
3. 进入主页后，四个入口：主页 / Mod 管理 / Mod 编辑 / Mod 导入（导入页暂为维修中占位）。

### 开发模式（无需打包）

```powershell
node src/cli.mjs serve --port=3081          # 打开 http://127.0.0.1:3081
node src/cli.mjs locate --json              # 只做定位，输出 JSON
node src/cli.mjs version                    # 版本/形态/配置路径
node test/run.mjs                           # 自测（42 项）
```

`--root=<路径>` 可强制指定 Lethe 根或游戏根（游戏根会自动向下找 `BepInEx\plugins\Lethe`）。

## 功能（0.4.0）

**主页**：左侧封面占位 + 右侧四个圆钮（设置 / 指南 / 封面 / 鸣谢，后三者为占位）、公告栏占位、右下名片五格（编辑者、编辑器名、Mod 数、DLL 数、总体积）+ 四个导航键。
**Mod 管理**：左 Mod 列表（底部 + 创建）/ 中详情 / 右 DLL 列表；详情下方「启用 / 备份 / 禁用」三按钮（状态对应置灰）；备份后出现版本页签（当前 + 各备份，备份只读，可「替换当前版本」，互换前确认并列出两个实际文件夹名）；DLL 同样带备份与版本页签。三栏各自滚动，按钮常驻不随列表滚走。
**Mod 编辑**：左栏与 Mod 管理同步（禁用的 Mod 灰化 + 红叉角标）；向导七格：模块编辑、人格编辑、被动编辑、技能编辑、Buff 编辑已可用；战斗、敌人编辑为「维修中」占位。
**模块编辑（v0.4）**：模块＝可拖动的可执行词条（例：`[使用时]使本技能的硬币威力+1`）。列表按修改日期排序，右侧表单可改名称 / 所属前缀（时点）/ 适用类型 / 描述；3 个内置测试模块只读不可改删。模块全部只存在于编辑器内（`meta/modules/`），不落游戏脚本。
**被动编辑（v0.4）**：三栏（列表 / 基础信息＋代码描述 / 模块列表）；基础信息＝是否需要罪孽条件启动（勾选后「x 个 y 罪孽拥有 / 共鸣」）；代码区拖入模块；描述区纯文本关键词，与技能同一套校验与「保存检查」。
**Buff 编辑（v0.4）**：三栏；基础信息＝Buff 种类（常驻 / 挥发）、正负、可被净化、最大强度、最大层数、图标 id、所属；新建时同时写实体、本地化与 0 字节关键词文件；代码区拖入模块；描述区同技能。
**技能编辑（v0.3）**：左栏技能列表（搜索 id/名字、按修改日期排序、＋新建、⇩导入）；中栏上半为技能基础信息（技能名/id 置顶，基础威力、硬币数量、攻击修正值、攻击容量、物理属性、罪孽属性、正负硬币技能），下半可在「代码」与「描述」间切换——代码区支持把右栏模块拖进「技能置入区」或任意硬币的置入区，硬币颜色与变动值就地可改；描述区为纯文本（技能段 + 每枚硬币一段，各自高亮与校验），`[中文名]` 关键词实时高亮，时点与 buff 分表匹配，未命中标黄并在保存时弹「有错误的关键词输入，请检查拼写」（可返回修改或无视风险保存）。
**编辑器 ↔ 游戏映射**：**有意未接**。技能 / 被动 / Buff 编辑目前只写编辑器草稿（`.lethe-workbench/meta/…`），不会改游戏文件；返工入口见 `docs/06-待落实：编辑器↔游戏映射.md`。
**编辑契约**：改动按字段写盘（只写变了的部分，未识别字段原样保留）；文件内撤销/重做（Ctrl+Z / Ctrl+Shift+Z，切换文件即切换栈）；保存后撤销栈清空（Ctrl+S）；外部改动导致撤回失效时给出明确提示。
**自动快照**：某 Mod 第一次被改动起，每 30 分钟把整个 Mod 增量镜像到 `backups/自动保存/<Mod名>/`（单槽覆盖；≥8 MB 且未改动的文件用 NTFS 硬链接，零拷贝）；有脏改动时才执行；左下角 toast 提示。
**会话保护**：非正常退出后下次启动提示恢复（`/api/recover-check` → `/api/recover`，恢复前把当前版本另存到 `journal/recover/`）。
**统计**：主页名片实时统计 Mod 数（含禁用、不含备份）、DLL 数、全部 Mod 总体积。

## 目录与落盘位置

```
<Lethe 根>/.lethe-workbench/
  state.json                 启停状态、编辑者名、自动快照时间
  backups/用户保存/           <Mod名>_<YYYYMMDD>[_n]/（整目录副本，只读）
  backups/自动保存/           <Mod名>/（增量镜像 + manifest.json，单槽）
  backups/DLL/                <dll名>_<YYYYMMDD>/
  journal/<Mod名>/ops.jsonl   操作流水（字段级 before/after，供撤销与崩溃恢复）
  journal/rollback/           写盘回滚副本（自动裁剪，保留 20 份）
  journal/recover/            恢复前的现场副本
  disabled/mods|dlls/         被禁用的 Mod / DLL
```

## 构建

```powershell
# 0) 先确保没有正在运行的 TheLetheWorkbench / server 进程
node tools/build-server.mjs        # → dist/server/LetheWorkbenchServer.exe
node tools/build-app.mjs           # → dist/app/TheLetheWorkbench.exe
```

`build-server.mjs`：内联 `src/web` 与 `data` → esbuild 打 cjs → `node --experimental-sea-config` → postject 注入。
`build-app.mjs`：gzip 后端嵌入 + 复制 WebView2 DLL + 生成图标 + `dotnet build host -c Release`。

## 源码结构

```
src/
  paths.mjs        运行形态（开发 / SEA）与数据/配置目录解析
  config.mjs       配置读写（SEA 下优先 %LOCALAPPDATA%\LetheWorkbench）
  locate.mjs       私服定位（显式 → 配置/最近 → 邻居 → 盘符扫描，带打分）
  safety.mjs       名称/相对路径/符号链接/体积等安全闸
  atomic.mjs       事务写盘（临时文件 → 回滚副本 → 替换 → 失败回滚）
  assets.mjs       单文件形态下的虚拟静态资源
  lethe/
    layout.mjs      Mod 骨架按需生长（用到才建目录）
    mods.mjs        Mod 列表/创建/启停/禁用目录解析
    personality.mjs 人格实体 + 本地化读写（diff 写入）
    vanilla.mjs     原版人格索引（dumpedData）
    dlls.mjs        BepInEx 插件 DLL 列表与启停
    state.mjs        .lethe-workbench/state.json 与各目录
    session.mjs      文件内撤销/重做 + 操作流水
    snapshot.mjs     增量镜像（硬链接）+ 还原
    backups.mjs      用户备份 / DLL 备份 / 版本互换
    autosave.mjs     30 分钟自动快照调度
    stats.mjs        主页统计
  server/
    index.mjs      HTTP 服务、令牌与 Host/Origin 校验、握手输出
    api.mjs        API 路由表
    api-shared.mjs 路由分发（GET 传 query，POST 传 body）
    http.mjs       JSON/静态资源/请求体
  web/             前端（无框架，原生 DOM；LIMBUS 风格）
host/              WinForms + WebView2 壳（C#）
tools/             构建脚本
docs/              设计、架构、构建、数据契约、验证记录、主页设计稿
test/run.mjs       自测
```

## 设计要点

- **完全独立**：不依赖前两版编辑器，也不依赖私服数据即可启动；私服只作为“目标目录”。
- **安全写盘**：写入经 `atomic.mjs`（临时文件 → 回滚副本 → 替换 → 失败回滚）；名称与相对路径经 `safety.mjs`，拒绝 `..`、绝对路径、保留名、符号链接。
- **禁用不删**：禁用 Mod = 移到 `<Lethe>/.lethe-workbench/disabled/mods/<名字>`，DLL 改名 `.disabled`；禁用态仍可编辑，界面有黄色横幅提示。
- **备份分层**：用户手动备份（只读、可互换、永不自动删除）与自动快照（单槽、增量）分开存放，互不覆盖。
- **骨架按需生长**：新建 Mod 只有 `custom_limbus_data/` 与 `custom_limbus_locale/`；进入人格编辑才建 `personality/` 与 `custom_limbus_locale/EN/personalityList/`。
- **状态三分**：加载状态（启用/禁用）、能力状态（维修中占位）、数据状态（已保存/有改动）。

## 当前完成度

已完成：自动定位私服、主页与底栏导航、Mod 列表/详情/创建、启用禁用（禁用态可编辑）、用户备份与版本互换、DLL 列表与备份、人格编辑（选罪人 → 原版/自定义列表 → 新建 → 表单保存）、文件内撤销/重做、操作流水、自动快照、崩溃恢复提示、设置（编辑者名/主题/私服路径）。
维修中：被动编辑、技能编辑、Buff 编辑、战斗编辑、敌人编辑、Mod 导入、指南/封面/鸣谢页。
说明：更多细节见 `docs/`。
