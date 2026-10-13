// 独立存档快照、独立随机数、同一战斗更新逻辑；每十局让出主线程。
window.BattleSimulation = {
  async run({ matches = 200, seed = 20261012, store = window.gameStore, mode = store.state.matchMode, onProgress, yieldControl = true } = {}) {
    if (!Number.isInteger(matches) || matches < 1 || matches > 10000) throw new Error("模拟局数必须为1至10000的整数");
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error("随机种子必须为0至4294967295的整数");
    const snapshot = { state: JSON.parse(JSON.stringify(store.state)) };
    snapshot.state.autoBattle = true;
    const random = window.GameRandom.seeded(seed);
    const engine = new window.BattleEngine({ width: 960, height: 540, getContext: () => null }, { headless: true, store: snapshot, random, autoBattle: true, mode });
    const heroIds = Object.keys(window.MEME_DATA.heroes).filter((id) => snapshot.state.unlockedHeroes[id]);
    const perks = window.MEME_DATA.perks.filter((perk) => snapshot.state.unlockedPerks[perk.id]);
    const archetypes = Object.keys(window.MEME_DATA.archetypes);
    const report = { matches, seed, mode, p1Wins: 0, p2Wins: 0, draws: 0, timeouts: 0, totalDuration: 0, byHero: {}, byArchetype: {}, bySkillLevel: {}, byFinishPhase: {} };
    const record = (group, key, outcome) => {
      const row = group[key] ||= { matches: 0, wins: 0, draws: 0, timeouts: 0, duration: 0 };
      row.matches++;
      row.wins += outcome.winner === "p1" ? 1 : 0;
      row.draws += outcome.winner === "draw" ? 1 : 0;
      row.timeouts += outcome.timedOut ? 1 : 0;
      row.duration += outcome.duration;
    };
    for (let i = 0; i < matches; i++) {
      // 主角和主流派轮换；采用与真实选词条相同的加权不放回抽样。
      const heroId = heroIds[Math.floor(i / archetypes.length) % heroIds.length] || "dayun";
      const archetype = archetypes[i % archetypes.length];
      const available = [...perks];
      const draft = [];
      while (draft.length < 5 && available.length) {
        const weights = available.map((p) => window.gameStore.getPerkDraftWeight.call(snapshot, p, archetype));
        let roll = random() * weights.reduce((a, b) => a + b, 0);
        let index = weights.findIndex((weight) => (roll -= weight) < 0);
        if (index < 0) index = available.length - 1;
        draft.push(available.splice(index, 1)[0]);
      }
      engine.startMatch(heroId, window.GameRandom.shuffle(draft, random).slice(0, 3));
      while (engine.running) engine.update(window.GAME_CONFIG.fixedStep, true);
      const outcome = engine.outcome;
      report.p1Wins += outcome.winner === "p1" ? 1 : 0;
      report.p2Wins += outcome.winner === "p2" ? 1 : 0;
      report.draws += outcome.winner === "draw" ? 1 : 0;
      report.timeouts += outcome.timedOut ? 1 : 0;
      report.totalDuration += outcome.duration;
      report.byFinishPhase[outcome.phase] = (report.byFinishPhase[outcome.phase] || 0) + 1;
      record(report.byHero, heroId, outcome);
      record(report.byArchetype, archetype, outcome);
      const averageLevel = ((snapshot.state.skillLevels[snapshot.state.equippedNormal[heroId]] || 1) + (snapshot.state.skillLevels[snapshot.state.equippedUlt[heroId]] || 1)) / 2;
      record(report.bySkillLevel, averageLevel.toFixed(1), outcome);
      if ((i + 1) % 10 === 0) {
        onProgress?.(i + 1, matches);
        if (yieldControl) await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    report.winRate = Number((report.p1Wins / matches * 100).toFixed(1));
    report.meanDuration = Number((report.totalDuration / matches).toFixed(1));
    report.timeoutRate = Number((report.timeouts / matches * 100).toFixed(1));
    return report;
  }
};
