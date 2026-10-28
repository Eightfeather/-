// 哪些实参是「可选」的（教程里写成 opt_N，或引擎里属于可选尾参）。
// 前端用它给空槽打「可选」徽标：未列出的下标一律视为必填。
export const ARG_OPTIONAL = {
  "consequence": {
    "buff": [
      5
    ],
    "healhp": [
      2
    ],
    "effectlabel": [
      4,
      5,
      6,
      7
    ],
    "bonusdmgbybuff": [
      5,
      6,
      7,
      8
    ],
    "skillreuse": [
      1
    ],
    "breakrecover": [
      1
    ],
    "changeskill": [
      1
    ],
    "setslotweight": [
      1
    ]
  },
  "acquirer": {
    "getbuff": [
      3,
      4
    ],
    "getskillid": [
      1
    ],
    "getskillegotype": [
      1
    ],
    "diduseskilllastturn": [
      1
    ]
  }
};

export function argOptional(kind, name, index) {
  const map = ARG_OPTIONAL[kind];
  if (!map) return false;
  const list = map[name];
  return Array.isArray(list) && list.includes(index);
}
