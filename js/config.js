// 玩法、概率和奖励共用配置，界面与模拟器读取同一份规则。
window.GAME_CONFIG = {
  fixedStep: 1 / 60,
  speed: { default: 1, choices: [0.5, 1, 1.5, 2], movement: 0.6 },
  ultimate: { windup: 1.55, dodgeWindow: 0.75 },
  modes: {
    quick: { name: "录屏短局", duration: 60, initialHp: 1800 },
    classic: { name: "构筑长局", duration: 300, initialHp: 6000 }
  },
  rewards: { tickets: 20, pityCoins: 35, exp: 80, expPerLevel: 100 },
  gacha: [
    { weight: 3, rarity: "UR" },
    { weight: 8, rarity: "SSR", poolType: "hero" },
    { weight: 17, rarity: "SSR", poolType: "skill" },
    { weight: 32, rarity: "SR" },
    { weight: 40, rarity: "R" }
  ]
};

window.GameRandom = {
  seeded(seed = 20261012) {
    let value = Number(seed) >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let n = Math.imul(value ^ (value >>> 15), value | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  },
  shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
};
