// 固定取值集合的实参：引擎里这些位置只接受枚举值（下拉），不自由输入。
// key = kind:name:argIndex（argIndex 从 0 开始）；每项 values = [[存储值, 中文说明], ...]
// 依据：ModularSkillScripts.decompiled.cs 里对应类对 circles[i] 的 switch/ == 判定，
// 以及 D:\私服 现有 mod 脚本的实际取值统计（见 数据缓存/arg-values.json）。
export const ARG_ENUMS = {
  'consequence:buff:4': { zh: '生效回合', values: [['0', '本回合'], ['1', '下回合'], ['2', '本回合+下回合']] },
  'consequence:buf:4': { zh: '生效回合', values: [['0', '本回合'], ['1', '下回合'], ['2', '本回合+下回合']] },
  'consequence:destroybuff:2': { zh: '生效回合', values: [['0', '本回合'], ['1', '下回合'], ['2', '两回合']] },
  'acquirer:getbuff:2': { zh: '读取项', values: [['stack', '强度'], ['turn', '层数']] },
  'acquirer:bufcheck:2': { zh: '读取项', values: [['stack', '强度'], ['turn', '层数']] },
  'acquirer:getbuff:3': { zh: '分类范围', values: [['main', '仅主分类'], ['mainandsub', '主分类+子分类'], ['mainandsubandcategory', '主分类+子分类+类目'], ['onlycategory', '仅类目']] },
  'acquirer:bufcheck:3': { zh: '分类范围', values: [['main', '仅主分类'], ['mainandsub', '主分类+子分类'], ['mainandsubandcategory', '主分类+子分类+类目'], ['onlycategory', '仅类目']] },
  'acquirer:haskey:1': { zh: '判定逻辑', values: [['OR', '任一满足（OR）'], ['AND', '全部满足（AND）']] },
  'acquirer:getskillid:0': { zh: '技能位置', values: [['top', '第一个技能'], ['bottom', '最后一个技能']] },
  'consequence:insertskill:1': { zh: '插入位置', values: [['top', '最前面'], ['bottom', '最后面']] },
  'consequence:aggro:2': { zh: '目标轮次', values: [['this', '当前目标'], ['next', '下一个目标']] },
  'consequence:skillsend:3': { zh: '技能类型', values: [['atk', '攻击技能'], ['def', '守备技能']] },
  'consequence:skillsend:4': { zh: '顺序', values: [['first', '最前面'], ['late', '最后面']] },
  'consequence:skillslotreplace:0': { zh: '技能槽', values: [['All', '全部技能槽']] },
  'consequence:shield:2': { zh: '持续时间', values: [['perm', '永久']] },
  'consequence:makeunbreakable:0': { zh: '硬币范围', values: [['all', '全部硬币'], ['0', '第 0 枚'], ['1', '第 1 枚'], ['2', '第 2 枚'], ['3', '第 3 枚']] },
  'consequence:sound:0': { zh: '声音类型', values: [['voice', '语音'], ['bgm', '音乐'], ['sfx', '音效']] },
  'acquirer:partdestroy:1': { zh: '查询项', values: [['isdestroyed', '是否已破坏'], ['isdestroyable', '是否可破坏'], ['isregeneratable', '是否可再生'], ['isregenerating', '是否再生中'], ['getregenerateturn', '再生回合']] },
  'consequence:recalctargets:0': { zh: '重算方式', values: [['Normal', '常规重算'], ['BegoneSubTargets', '移除子目标'], ['Remove', '移除'], ['Add', '添加']] },
  'consequence:bonusdmgbybuff:7': { zh: '取值方式', values: [['UseAction', '按使用次数'], ['ByStack', '按强度']] },

  'consequence:skillreuse:1': { zh: '是否允许重复', values: [['true', '允许'], ['false', '不允许']] },
  'consequence:breakrecover:1': { zh: '强制恢复', values: [['force', '强制（忽略不可恢复崩解）'], ['forced', '强制（同 force）']] },
  'consequence:changeskill:1': { zh: '切换方式', values: [['false', '替换为静态技能（重置等级）']] },
};

export function argEnum(kind, name, i) {
  return ARG_ENUMS[kind + ':' + name + ':' + i] || null;
}
