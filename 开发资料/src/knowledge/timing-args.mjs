/**
 * 时点实参支持表（引擎依据：ModularSkillScripts.decompiled.cs）
 *
 * - face / crit：SetupModular（:2514-2556）解析 TIMING 的第二个参数串（Head / Tail / Crit / NoCrit），
 *   但仅在 ModsaSA.Enact 有硬币上下文（modsa_coinModel != null，见 :1475-1480）时生效，
 *   因此只对本表列出的硬币 / 攻击相关时点开放。
 * - keyword：Postfix_BattleUnitModel_RightAfterGetAnyBuff（:3458-3503）只在 OnGainBuff 上用
 *   keywordTrigger == keyword 过滤，其他时点该参数无意义。
 * - key：SpecialAction 用 Input.GetKeyInt(SpecialKey)（:10487 起）读取按键名。
 */
export const TIMING_ARGS = {
  "BeforeAnyFlip": [
    "face",
    "crit"
  ],
  "BeforeSA": [
    "face",
    "crit"
  ],
  "BeforeWhenHit": [
    "face",
    "crit"
  ],
  "CanDealTarget": [
    "face",
    "crit"
  ],
  "ChangeAttackDamage": [
    "face",
    "crit"
  ],
  "ChangeMotion": [
    "face",
    "crit"
  ],
  "ChangeTakeDamage": [
    "face",
    "crit"
  ],
  "EndCoin": [
    "face",
    "crit"
  ],
  "EnemyKill": [
    "face",
    "crit"
  ],
  "OnCoinAfterAttack": [
    "face",
    "crit"
  ],
  "OnCoinToss": [
    "face",
    "crit"
  ],
  "OnSucceedAttack": [
    "face",
    "crit"
  ],
  "OnSucceedAttackHead": [
    "face",
    "crit"
  ],
  "OnSucceedAttackTail": [
    "face",
    "crit"
  ],
  "SkillStaggerVictim": [
    "face",
    "crit"
  ],
  "WhenHit": [
    "face",
    "crit"
  ],
  "YIPPEE": [
    "face",
    "crit"
  ],
  "OnGainBuff": [
    "keyword"
  ],
  "SpecialAction": [
    "key"
  ]
};

export const TIMING_ARGS_ZH = { face: '硬币面', crit: '暴击条件', keyword: 'Buff 关键词', key: '按键' };

export function timingArgs(en) {
  return TIMING_ARGS[en] || [];
}
