# Modular 命令表（模块编辑的底层素材）

模块编辑将来要产出「可执行词条块」，其底层不是游戏原生脚本名（`GiveBuffOnSucceedAttack` 那类），而是 Modular 的两张命令字典：

| 字典 | 含义 | 条数 | 在脚本里的形态 |
|---|---|---|---|
| `consequenceDict` | **动作**（做完什么） | **123** | 直接写 `buff(Self,Breath,stack)` |
| `acquirerDict` | **取值/条件**（读出什么） | **150** | 写在取值位置 `VALUE_1:getbuff(Self,Vibration,stack)` |

去重后共 **273** 条命令，已抽成 `src/knowledge/modular-tables.mjs`，并通过 `GET /api/modular-tables` 暴露。

## 字段

```ts
{
  kind: 'consequence' | 'acquirer',
  name: 'buff',                       // 脚本里写的名字（字典键）
  cls: 'ConsequenceBuf',              // 反编译类名（查实现用）
  sig: 'buff(var_1, var_2, var_3, var_4, var_5, opt_6)',
  args: ['var_1', ..., 'opt_6'],
  summary: '通过关键词、强度和层数施加Buff。负数会消耗该Buff。',   // 中文一句话（89 条有）
  params: [{ name: 'var_3', doc: 'VALUE_# | 任意整数（强度，…）' }]
}
```

`opt_N` 前缀表示**可选参数**（教程原文就用 `opt_` 标注）；`var_N` 为必填。

## 覆盖率

| 项 | 数量 |
|---|---|
| 命令总数 | 273（consequence 123 + acquirer 150） |
| 有中文说明 | **89** |
| 有参数表 | 83 |
| 无说明（仅名字/类名） | 184，几乎全是 acquirer（`getbuff`、`gethp`、`iscrit`…），可在实现里按名字语义推断，或从反编译代码补 |

## 与「游戏原生脚本」的区别（重要）

- 原生脚本：`abilityScriptList[].scriptName`，例如 `GiveBuffOnSucceedAttack`，3,937 种，属于**游戏本身的行为**，编辑器不能自由拼装。
- Modular 命令：273 条，属于 **Modular 插件提供的积木**，可以自由组合成 `Modular/TIMING:…/…` 脚本。
- 两者没有任何名字重叠（验证过：273 个 Modular 名字在 script-db 里 0 命中），所以「模块编辑器」应该以本表为控件候选，而不是以 script-db 为候选。

## 抽取与复现

```bat
:: 1) 从反编译源码抓字典（得到 name / class）
node 数据缓存\dump-modular.mjs
:: 2) 解析教程 docx 的签名与参数表，合并成 modular-tables.json
node 数据缓存\build-modular-tables.mjs
:: 3) 生成 src\knowledge\modular-tables.mjs（构建时被打进单文件 exe，无运行时文件依赖）
```

输入文件：
- `D:\私服\dsh_AI\50_历史快照\_decomp_20261020\Modular\ModularSkillScripts.decompiled.cs`（`consequenceDict["buff"] = new ConsequenceBuf();` 形式，`ModularSkillScripts.decompiled.cs:519` 起）
- `E:\辅助文件\Modular脚本使用教程.docx`（签名行 + 「参数/说明」两张列表，1,182 段起为「四、Buff与护盾」）

`dumpedData` 更新时本表**不需要重生成**（它来自插件版本，不是游戏数据）；插件升级后才需要重跑上述三步。

## 已知坑（来自教程原文）

- `buff` 的 `var_3` 是**强度**、`var_4` 是**层数**（只有层数的 Buff 把层数填在 `var_3`、`var_4` 填 0）、`var_5` 是生效回合（0 本回合 / 1 下回合 / 2 两者）。
- `IF` 的条件运算符只支持 `> < =`，**不支持 `>=` / `<=`**；逻辑符 `AND/OR/XOR`。
- 教程明确提示 `base/final/clash/dmgmult` 这类威力类效果在被动里可能被异常叠加，需要时用 `clearvalues`/`resetadders` 收尾。