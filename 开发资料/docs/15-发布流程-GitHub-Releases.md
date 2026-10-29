# 15 · 发布流程（GitHub Releases）

> 自 v0.7.0 起生效：**仓库只放源码，成品 exe 走 GitHub Releases 分发**。
> 仓库：`https://github.com/Eightfeather/LetheCreatorWorkshop`

---

## 1. 原则

| 内容 | 去处 |
| --- | --- |
| `src/`、`host/`、`tools/`、`docs/`、`test/`、`data/` | **进仓库**（源码与知识数据） |
| `TheLetheWorkbench.exe`、`dist/`、`build/`、`host/obj/` | **不进仓库**（`.gitignore` 已忽略） |
| 每个可运行版本 | **一个 tag + 一个 GitHub Release**，附件为 zip |

理由：仓库克隆体积小、历史干净；成品可按版本下载与回退；避免每次改动都重传 36 MB 二进制。

---

## 2. 发一个版本的步骤

```powershell
cd E:\辅助文件\Mod编辑器\编辑器正式稿\开发资料

# ① 改版本号（三处必须一致）
#    package.json 的 "version"
#    src/server/index.mjs 的 VERSION
#    host/TheLetheWorkbench.csproj 的 <Version>

# ② 重建成品
Stop-Process TheLetheWorkbench,TheLetheWorkbenchServer -ErrorAction SilentlyContinue
node tools/build-server.mjs
node tools/build-app.mjs        # 产物：开发资料/dist/app/*.exe，并复制到工程根

# ③ 跑测试
node test/run.mjs

# ④ 发布（打包 zip、打 tag、推送 tag、创建 Release、上传附件）
$env:GITHUB_TOKEN = 'ghp_xxx'   # 需要 repo 权限的 PAT
node tools/release.mjs

# 只想先看会做什么：
node tools/release.mjs --dry

# 用自定义更新说明：
node tools/release.mjs --notes-file=docs/RELEASE-NOTES-v0.7.0.md
```

产物命名：`TheLetheWorkbench-v<版本>-win-x64.zip`（解压后双击 `TheLetheWorkbench.exe`）。

---

## 3. 没有令牌时

`tools/release.mjs` 会先把 tag 推到远端、把 zip 生成在 `工程根\.release\`，然后提示缺少 token。此时二选一：

1. 在网页上 `Releases → Draft a new release` → 选已有 tag `vX.Y.Z` → 上传 `.release\*.zip`；
2. 配置一个 PAT（`repo` 权限）后重跑脚本，脚本发现同名 Release 会复用、同名资产会覆盖。

---

## 4. 版本号与 tag

- 语义化：`MAJOR.MINOR.PATCH`；当前为 `0.7.0`。
- tag 用 `v` 前缀：`v0.7.0`（脚本自动生成并推送）。
- Release 标题：`The Lethe Workbench v0.7.0`。
- 每版的验证记录写到 `docs/04-验证记录.md` 的对应小节（第 N 节），Release 说明可引用。

---

## 5. 回滚

- 旧版本永远能从 Releases 页面下载，无需回滚仓库。
- 若要撤回某版：网页上把 Release 设为 draft 或删除；tag 保留（`git push --delete origin vX.Y.Z` 才会删 tag）。

---

## 6. 检查清单

- [ ] 三处版本号一致
- [ ] `node test/run.mjs` 全绿
- [ ] 真机启动 exe：能自动定位私服、能进模块编辑、能保存
- [ ] `git status` 干净、`.gitignore` 生效（`git status` 里不应再出现 exe/dist/build）
- [ ] Release 附件大小与本地 exe 相符（约 34.8 MB 压缩后 33–35 MB）
