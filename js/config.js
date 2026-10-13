// 玩法、概率和奖励共用配置，界面与模拟器读取同一份规则。
window.GAME_CONFIG = {
  fixedStep: 1 / 60,
  speed: { default: 1, choices: [0.5, 1, 1.5, 2], movement: 0.6 },
  combat: {
    skillDamageGrowth: 0.28,
    passiveSkillDamageGrowth: 0.25,
    passiveOrbitDamage: 52.5,
    fighter: { baseRadius: 32, defaultMaxHp: 2200, maxShield: 900 },
    collision: { baseDamage: 42, dayunWallHit: 55, laodaElbow: 70, stanceLoss: 10 },
    phaseDamageMultiplier: { early: 1, mid: 1.1, late: 1.3, overtime: 1.7 },
    ultimate: {
      maxEnergy: 100, initialEnergy: 0, gainOnCast: 12, gainOnCollision: 6, gainOnPerfectDodge: 20,
      cutinDuration: 0.9, arenaDuration: 0.6, dodgeWindow: 0.22, counterWindow: 0.08,
      slowScale: 0.2, slowDuration: 0.3, dodgeInvulnerability: 0.55, counterReflectRatio: 0.1,
      activeCoreRatio: 0.36, activeCoreLevelGrowth: 0.08, activeCoreRatioCap: 0.48,
      passiveCoreRatio: 0.22, passiveCoreLevelGrowth: 0.06, passiveCoreRatioCap: 0.30,
      secondaryCount: 3, secondaryDamageRatio: 0.05, secondaryBudgetRatio: 0.15,
      mageSecondaryCount: 5, passiveSecondaryCount: 2
    }
  },
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
